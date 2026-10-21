const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  demoKey: { type: String, unique: true, sparse: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  destination: { type: String, required: true, trim: true, maxlength: 200 },
  originArea: { type: String, trim: true, maxlength: 200, default: '' },
  deliveryWindow: { type: Date, default: null },
  notes: { type: String, maxlength: 1000, default: '' },
  participants: [{ farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null }, quantity: { type: Number, min: 0.01, default: null }, joinedAt: { type: Date, default: Date.now } }],
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
  status: { type: String, enum: ['open','forming','ready','in_transit','completed','cancelled'], default: 'open' }
}, { timestamps: true });
module.exports = mongoose.model('LogisticsGroup', schema);
