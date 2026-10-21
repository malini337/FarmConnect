
const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const protect = require('../middleware/authMiddleware');
const Order = require('../models/Order');
const Notification = require('../models/Notification');

const router = express.Router();
const buyerRoles = ['consumer', 'retailer', 'wholesaler'];

function credentialsConfigured() {
  return Boolean(
    process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_') &&
    process.env.RAZORPAY_KEY_SECRET
  );
}

// Mock payments require explicit opt-in and are disabled in production.
function mockPaymentsEnabled() {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.MOCK_PAYMENTS_ENABLED === 'true'
  );
}

router.get('/config', (req, res) => {
  const configured = credentialsConfigured();
  const mockEnabled = mockPaymentsEnabled();

  res.json({
    configured,
    mockEnabled,
    mode: configured ? 'razorpay-test' : mockEnabled ? 'demo' : 'unconfigured',
    message: mockEnabled
      ? 'DEMO PAYMENT — NO MONEY TRANSFERRED.'
      : 'Only Razorpay test keys are accepted by this project.'
  });
});

async function createRazorpayOrder(payload) {
  const auth = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
  ).toString('base64');

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error?.description || 'Razorpay order API failed');
  }

  return body;
}

// Existing Razorpay order creation.
router.post('/create-order', protect, async (req, res) => {
  try {
    if (!buyerRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Only buyers can start checkout.'
      });
    }

    if (!mongoose.isValidObjectId(req.body.orderId)) {
      return res.status(400).json({
        message: 'Valid FarmConnect order ID required.'
      });
    }

    const order = await Order.findOne({
      _id: req.body.orderId,
      buyer: req.user.userId
    });

    if (!order) {
      return res.status(404).json({
        message: 'Order not found for this buyer.'
      });
    }

    if (order.status === 'cancelled' || order.paymentStatus === 'paid') {
      return res.status(409).json({
        message: 'This order cannot start payment.'
      });
    }

    if (!credentialsConfigured()) {
      return res.status(503).json({
        message: 'Razorpay test credentials are not configured on the backend. The order remains unpaid; no payment was simulated.'
      });
    }

    const rpOrder = await createRazorpayOrder({
      amount: Math.round(order.total * 100),
      currency: 'INR',
      receipt: `fc_${order._id.toString()}`,
      notes: {
        farmconnectOrderId: order._id.toString()
      }
    });

    order.paymentProvider = 'razorpay';
    order.paymentStatus = 'created';
    order.razorpayOrderId = rpOrder.id;
    await order.save();

    res.status(201).json({
      keyId: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: rpOrder.id,
      amount: rpOrder.amount,
      currency: rpOrder.currency,
      farmconnectOrderId: order._id,
      description: 'FarmConnect marketplace order'
    });
  } catch (e) {
    console.error('Razorpay create-order error:', e.message);
    res.status(502).json({
      message: 'Could not create a Razorpay test payment order.'
    });
  }
});

// Development-only demo payment. It never contacts Razorpay.
router.post('/mock/complete', protect, async (req, res) => {
  try {
    if (!mockPaymentsEnabled()) {
      return res.status(403).json({
        message: 'Demo payments are disabled. Enable them only in local development.'
      });
    }

    if (!buyerRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Only buyers can complete checkout.'
      });
    }

    const { orderId } = req.body || {};

    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({
        message: 'Valid FarmConnect order ID required.'
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      buyer: req.user.userId
    });

    if (!order) {
      return res.status(404).json({
        message: 'Order not found for this buyer.'
      });
    }

    if (order.status === 'cancelled') {
      return res.status(409).json({
        message: 'A cancelled order cannot complete checkout.'
      });
    }

    // A repeated request for the same demo payment is safe.
    if (
      order.paymentStatus === 'paid' &&
      order.paymentProvider === 'mock' &&
      order.mockPaymentId
    ) {
      return res.json({
        message: 'DEMO PAYMENT — NO MONEY TRANSFERRED. This demo payment was already recorded.',
        demo: true,
        paymentProvider: 'mock',
        paymentStatus: 'paid',
        orderId: order._id
      });
    }

    // Never use the demo route to bypass real Razorpay verification
    // or overwrite an existing payment attempt.
    if (
      order.paymentStatus !== 'pending' ||
      order.paymentProvider !== 'none' ||
      order.razorpayOrderId ||
      order.razorpayPaymentId
    ) {
      return res.status(409).json({
        message: 'This order is not eligible for a new demo payment.'
      });
    }

    order.paymentProvider = 'mock';
    order.paymentStatus = 'paid';
    order.mockPaymentId = `mock_${crypto.randomUUID()}`;
    order.mockPaymentAt = new Date();

    // Intentionally do not set paymentVerifiedAt:
    // no real provider payment was verified.
    await order.save();

    const farmerIds = [
      ...new Set(order.items.map(item => String(item.farmer)))
    ];

    // Notification failures must not misrepresent the saved demo result.
    const notificationResults = await Promise.allSettled(
      farmerIds.map(recipient =>
        Notification.create({
          recipient,
          actor: req.user.userId,
          type: 'demo_payment_completed',
          message: `DEMO PAYMENT for order ${String(order._id).slice(-7)} — NO MONEY WAS TRANSFERRED. This is a local demonstration only.`,
          entityType: 'order',
          entityId: order._id
        })
      )
    );

    const failedNotifications = notificationResults.filter(
      result => result.status === 'rejected'
    ).length;

    if (failedNotifications > 0) {
      console.error(
        `${failedNotifications} demo-payment notification(s) could not be created.`
      );
    }

    return res.json({
      message: 'DEMO PAYMENT — NO MONEY TRANSFERRED. The demo order was recorded for local testing.',
      demo: true,
      paymentProvider: 'mock',
      paymentStatus: order.paymentStatus,
      orderId: order._id
    });
  } catch (e) {
    console.error('Demo payment error:', e.message);
    return res.status(500).json({
      message: 'Could not record the demo payment.'
    });
  }
});

// Existing Razorpay verification remains in place.
router.post('/verify', protect, async (req, res) => {
  try {
    const {
      farmconnectOrderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body || {};

    if (
      !mongoose.isValidObjectId(farmconnectOrderId) ||
      ![
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      ].every(v => typeof v === 'string' && v.length > 0)
    ) {
      return res.status(400).json({
        message: 'Missing payment verification fields.'
      });
    }

    if (!credentialsConfigured()) {
      return res.status(503).json({
        message: 'Razorpay test credentials are not configured on the backend.'
      });
    }

    const order = await Order.findOne({
      _id: farmconnectOrderId,
      buyer: req.user.userId
    });

    if (!order) {
      return res.status(404).json({
        message: 'FarmConnect order not found.'
      });
    }

    if (
      order.paymentStatus === 'paid' &&
      order.razorpayPaymentId === razorpay_payment_id
    ) {
      return res.json({
        message: 'This Razorpay payment was already verified.',
        paymentStatus: 'paid',
        orderId: order._id
      });
    }

    if (
      order.paymentStatus !== 'created' ||
      order.paymentProvider !== 'razorpay'
    ) {
      return res.status(409).json({
        message: 'This order is not awaiting a Razorpay payment verification.'
      });
    }

    if (order.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({
        message: 'Payment order does not match this FarmConnect order.'
      });
    }

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(razorpay_signature, 'hex');

    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(400).json({
        message: 'Razorpay payment signature verification failed.'
      });
    }

    // Confirm the payment record directly with Razorpay.
    const auth = Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
    ).toString('base64');

    const providerResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`,
      {
        headers: {
          Authorization: `Basic ${auth}`
        }
      }
    );

    const providerPayment = await providerResponse.json().catch(() => ({}));

    if (!providerResponse.ok) {
      return res.status(502).json({
        message: 'Could not confirm the payment with Razorpay. The order remains unpaid.'
      });
    }

    if (
      providerPayment.order_id !== razorpay_order_id ||
      Number(providerPayment.amount) !== Math.round(order.total * 100) ||
      providerPayment.currency !== 'INR'
    ) {
      return res.status(400).json({
        message: 'Razorpay payment details do not match this order. The order remains unpaid.'
      });
    }

    if (providerPayment.status !== 'captured') {
      return res.status(409).json({
        message: `Razorpay reports payment status '${String(providerPayment.status || 'unknown')}'. The order is not marked paid until the payment is captured.`
      });
    }

    order.paymentStatus = 'paid';
    order.razorpayPaymentId = razorpay_payment_id;
    order.paymentVerifiedAt = new Date();
    order.paymentProvider = 'razorpay';
    await order.save();

    const farmerIds = [
      ...new Set(order.items.map(item => String(item.farmer)))
    ];

    await Promise.all(
      farmerIds.map(recipient =>
        Notification.create({
          recipient,
          actor: order.buyer,
          type: 'payment_verified',
          message: `Payment was verified for order ${String(order._id).slice(-7)}. Fulfilment can begin.`,
          entityType: 'order',
          entityId: order._id
        })
      )
    );

    res.json({
      message: 'Razorpay signature and captured payment record verified. Order status remains unchanged until fulfilment.',
      paymentStatus: order.paymentStatus,
      orderId: order._id
    });
  } catch (e) {
    console.error('Razorpay verification error:', e.message);
    res.status(500).json({
      message: 'Could not verify payment.'
    });
  }
});

module.exports = router;
