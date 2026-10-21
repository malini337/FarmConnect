const mongoose = require("mongoose");
const requirementSchema = new mongoose.Schema({
  demoKey: { type: String, unique: true, sparse: true, index: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  buyerRole: { type: String, enum: ["consumer", "retailer", "wholesaler"], required: true },
  productName: { type: String, required: true, trim: true },
  category: { type: String, default: "Any" },
  quantity: { type: Number, required: true, min: 0.01 },
  unit: { type: String, enum: ["kg", "g", "gram", "litre", "piece", "quintal"], default: "kg" },
  targetPrice: { type: Number, min: 0 },
  notes: { type: String, maxlength: 1000, default: "" },
  status: { type: String, enum: ["open", "matched", "closed"], default: "open" }
}, { timestamps: true });
module.exports = mongoose.model("Requirement", requirementSchema);
