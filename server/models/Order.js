
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    demoKey: { type: String, unique: true, sparse: true, index: true },

    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    buyerRole: {
      type: String,
      enum: ["consumer", "retailer", "wholesaler"],
      required: true,
    },

    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: { type: String, required: true },
        farmer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        quantity: { type: Number, required: true, min: 0.01 },
        unit: { type: String, default: "kg" },
        unitPrice: { type: Number, required: true, min: 0.01 },
        subtotal: { type: Number, required: true, min: 0.01 },
      },
    ],

    total: { type: Number, required: true, min: 0.01 },

    deliveryAddress: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "placed",
        "accepted",
        "packed",
        "dispatched",
        "delivered",
        "cancelled",
        "rejected",
      ],
      default: "placed",
    },

    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "created",
        "paid",
        "failed",
        "refunded",
        "not_required",
      ],
      default: "pending",
    },

    paymentProvider: {
      type: String,
      enum: ["razorpay", "external", "mock", "none"],
      default: "none",
    },

    razorpayOrderId: { type: String, default: "" },
    razorpayPaymentId: { type: String, default: "" },
    paymentVerifiedAt: { type: Date, default: null },

    // Demo-only transaction details; no real money is transferred.
    mockPaymentId: { type: String, default: "" },
    mockPaymentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
