
const express = require("express");
const mongoose = require("mongoose");
const protect = require("../middleware/authMiddleware");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Requirement = require("../models/Requirement");
const Notification = require("../models/Notification");
const { canTransitionOrder } = require("../utils/workflowRules");

const router = express.Router();

async function notifyOrder(recipient, actor, type, message, orderId) {
  if (String(recipient) === String(actor)) return;

  await Notification.create({
    recipient,
    actor,
    type,
    message,
    entityType: "order",
    entityId: orderId,
  });
}

const buyerRoles = ["consumer", "retailer", "wholesaler"];

// ======================================================
// CREATE ORDER
// POST /api/orders
// ======================================================
router.post("/orders", protect, async (req, res) => {
  try {
    if (!buyerRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Only buyers can place orders.",
      });
    }

    const { items, deliveryAddress } = req.body;

    if (
      !Array.isArray(items) ||
      !items.length ||
      !deliveryAddress?.trim()
    ) {
      return res.status(400).json({
        message: "Add at least one item and a delivery address.",
      });
    }

    const normalized = [];

    for (const item of items) {
      if (!mongoose.isValidObjectId(item.product)) {
        return res.status(400).json({
          message: "A cart item is invalid.",
        });
      }

      const quantity = Number(item.quantity);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({
          message: "Each quantity must be greater than zero.",
        });
      }

      const product = await Product.findOne({
        _id: item.product,
        isAvailable: true,
      });

      if (!product) {
        return res.status(400).json({
          message:
            "A product is no longer available. Refresh the marketplace.",
        });
      }

      if (quantity > product.declaredQuantity) {
        return res.status(400).json({
          message: `${product.name} has only ${product.declaredQuantity} ${product.unit} available.`,
        });
      }

      normalized.push({
        product: product._id,
        name: product.name,
        farmer: product.farmer,
        quantity,
        unit: product.unit,
        unitPrice: product.expectedPrice,
        subtotal: quantity * product.expectedPrice,
      });
    }

    const total = normalized.reduce(
      (sum, item) => sum + item.subtotal,
      0
    );

    const order = await Order.create({
      buyer: req.user.userId,
      buyerRole: req.user.role,
      items: normalized,
      total,
      deliveryAddress: deliveryAddress.trim(),
    });

    const farmerIds = [
      ...new Set(normalized.map((item) => String(item.farmer))),
    ];

    await Promise.all(
      farmerIds.map((farmerId) =>
        notifyOrder(
          farmerId,
          req.user.userId,
          "order_placed",
          `A new order ${String(order._id).slice(-7)} is awaiting verified payment.`,
          order._id
        )
      )
    );

    return res.status(201).json({
      message:
        "Order created. It is not paid until the payment process confirms payment.",
      order,
    });
  } catch (error) {
    console.error("Order create error:", error.message);

    return res.status(500).json({
      message: "Could not place order.",
    });
  }
});

// ======================================================
// GET ORDERS
// GET /api/orders
// ======================================================
router.get("/orders", protect, async (req, res) => {
  try {
    let filter;

    if (buyerRoles.includes(req.user.role)) {
      filter = { buyer: req.user.userId };
    } else if (req.user.role === "farmer") {
      filter = { "items.farmer": req.user.userId };
    } else {
      return res.status(403).json({
        message: "Role not supported.",
      });
    }

    const orders = await Order.find(filter)
      .populate("buyer", "name email")
      .sort({ createdAt: -1 })
      .limit(200);

    /*
     * Compatibility repair:
     * Older rejected mock-payment orders may still have paymentStatus "paid".
     * No real money was transferred through the mock provider.
     * Update these existing records to "refunded" for consistent display.
     */
    for (const order of orders) {
      if (
        order.status === "rejected" &&
        order.paymentProvider === "mock" &&
        order.paymentStatus === "paid"
      ) {
        order.paymentStatus = "refunded";
        await order.save();
      }
    }

    return res.json({ orders });
  } catch (error) {
    console.error("Get orders error:", error.message);

    return res.status(500).json({
      message: "Could not load orders.",
    });
  }
});

// ======================================================
// UPDATE ORDER STATUS
// PATCH /api/orders/:id/status
// ======================================================
router.patch("/orders/:id/status", protect, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid order ID.",
      });
    }

    const allowed = [
      "accepted",
      "packed",
      "dispatched",
      "delivered",
      "cancelled",
      "rejected",
    ];

    const nextStatus = req.body.status;

    if (!allowed.includes(nextStatus)) {
      return res.status(400).json({
        message: "Invalid order status.",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    const buyerOwns =
      String(order.buyer) === String(req.user.userId);

    const farmerOwns = order.items.some(
      (item) => String(item.farmer) === String(req.user.userId)
    );

    if (req.user.role === "farmer" && !farmerOwns) {
      return res.status(403).json({
        message: "You cannot update this order.",
      });
    }

    if (req.user.role !== "farmer" && !buyerOwns) {
      return res.status(403).json({
        message: "You cannot update this order.",
      });
    }

    // Buyers may only cancel their own orders.
    if (req.user.role !== "farmer" && nextStatus !== "cancelled") {
      return res.status(403).json({
        message: "Buyers may only cancel an order.",
      });
    }

    // Only the associated farmer can reject an order.
    if (nextStatus === "rejected" && req.user.role !== "farmer") {
      return res.status(403).json({
        message: "Only the farmer can reject an order.",
      });
    }

    // Only newly placed orders may be rejected.
    if (nextStatus === "rejected" && order.status !== "placed") {
      return res.status(409).json({
        message: "Only a newly placed order can be rejected.",
      });
    }

    // Real/external paid orders must not be marked refunded automatically.
    if (
      nextStatus === "rejected" &&
      order.paymentStatus === "paid" &&
      order.paymentProvider !== "mock"
    ) {
      return res.status(409).json({
        message:
          "This order has a real or external payment. Refund handling must be completed before rejection.",
      });
    }

    if (!canTransitionOrder(order.status, nextStatus)) {
      return res.status(409).json({
        message: `Invalid order transition from ${order.status} to ${nextStatus}.`,
      });
    }

    // Farmers cannot start fulfilment until payment is verified.
    if (
      req.user.role === "farmer" &&
      !["cancelled", "rejected"].includes(nextStatus) &&
      order.paymentStatus !== "paid"
    ) {
      return res.status(409).json({
        message:
          "This order cannot enter fulfilment until payment is verified or the demo payment is completed.",
      });
    }

    // Paid orders cannot be cancelled through this route.
    if (nextStatus === "cancelled" && order.paymentStatus === "paid") {
      return res.status(409).json({
        message:
          "This order has a paid status. Cancellation/refund handling is not enabled in this project.",
      });
    }

    // Update the order status.
    order.status = nextStatus;

    // Demo-only refund: no real money is transferred or refunded.
    if (
      nextStatus === "rejected" &&
      order.paymentProvider === "mock" &&
      order.paymentStatus === "paid"
    ) {
      order.paymentStatus = "refunded";
    }

    await order.save();

    // Notify the other party after saving the order.
    if (req.user.role === "farmer") {
      await notifyOrder(
        order.buyer,
        req.user.userId,
        `order_${order.status}`,
        order.status === "rejected" &&
          order.paymentProvider === "mock"
          ? `Your order ${String(order._id).slice(-7)} was rejected. The demo payment is marked as refunded; no money was transferred.`
          : `Your order ${String(order._id).slice(-7)} is now ${order.status}.`,
        order._id
      );
    } else {
      const farmerIds = [
        ...new Set(order.items.map((item) => String(item.farmer))),
      ];

      await Promise.all(
        farmerIds.map((farmerId) =>
          notifyOrder(
            farmerId,
            req.user.userId,
            "order_cancelled",
            `Order ${String(order._id).slice(-7)} was cancelled before payment.`,
            order._id
          )
        )
      );
    }

    return res.json({
      message:
        nextStatus === "rejected"
          ? order.paymentProvider === "mock" &&
            order.paymentStatus === "refunded"
            ? "Order rejected. Demo payment marked as refunded; no money was transferred."
            : "Order rejected successfully."
          : "Order status updated.",
      order,
    });
  } catch (error) {
    console.error("Update order status error:", error.message);

    return res.status(500).json({
      message: "Could not update order.",
    });
  }
});

// ======================================================
// CREATE REQUIREMENT
// POST /api/requirements
// ======================================================
router.post("/requirements", protect, async (req, res) => {
  try {
    if (!buyerRoles.includes(req.user.role)) {
      return res.status(403).json({
        message:
          "Only consumers, retailers and wholesalers can post requirements.",
      });
    }

    const {
      productName,
      category = "Any",
      quantity,
      unit = "kg",
      targetPrice,
      notes = "",
    } = req.body;

    const qty = Number(quantity);

    const price =
      targetPrice === "" || targetPrice == null
        ? undefined
        : Number(targetPrice);

    if (
      !productName?.trim() ||
      !Number.isFinite(qty) ||
      qty <= 0
    ) {
      return res.status(400).json({
        message: "Product name and positive quantity are required.",
      });
    }

    const requirement = await Requirement.create({
      buyer: req.user.userId,
      buyerRole: req.user.role,
      productName: productName.trim(),
      category,
      quantity: qty,
      unit,
      targetPrice: price,
      notes,
    });

    return res.status(201).json({
      message: "Requirement posted.",
      requirement,
    });
  } catch (error) {
    console.error("Create requirement error:", error.message);

    return res.status(400).json({
      message: error.message || "Could not post requirement.",
    });
  }
});

// ======================================================
// GET REQUIREMENTS
// GET /api/requirements
// ======================================================
router.get("/requirements", protect, async (req, res) => {
  try {
    const filter =
      req.user.role === "farmer"
        ? { status: "open", demoKey: { $exists: false } }
        : { buyer: req.user.userId, demoKey: { $exists: false } };

    const requirements = await Requirement.find(filter)
      .populate("buyer", "name role")
      .sort({ createdAt: -1 })
      .limit(200);

    return res.json({ requirements });
  } catch (error) {
    console.error("Get requirements error:", error.message);

    return res.status(500).json({
      message: "Could not load requirements.",
    });
  }
});

// ======================================================
// UPDATE REQUIREMENT STATUS
// PATCH /api/requirements/:id/status
// ======================================================
router.patch("/requirements/:id/status", protect, async (req, res) => {
  try {
    if (
      !mongoose.isValidObjectId(req.params.id) ||
      !["closed", "open"].includes(req.body.status)
    ) {
      return res.status(400).json({
        message:
          "Only open/closed status changes are supported for buyer-owned requirements.",
      });
    }

    const requirement = await Requirement.findById(req.params.id);

    if (!requirement) {
      return res.status(404).json({
        message: "Requirement not found.",
      });
    }

    if (
      String(requirement.buyer) !== String(req.user.userId) ||
      !buyerRoles.includes(req.user.role)
    ) {
      return res.status(403).json({
        message:
          "Only the buyer who owns this requirement can change its status. Farmers should send an interest request.",
      });
    }

    requirement.status = req.body.status;
    await requirement.save();

    return res.json({
      message: "Requirement updated.",
      requirement,
    });
  } catch (error) {
    console.error("Update requirement error:", error.message);

    return res.status(500).json({
      message: "Could not update requirement.",
    });
  }
});

module.exports = router;
