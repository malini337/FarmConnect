const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  demoKey: { type: String, unique: true, sparse: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  productName: { type: String, required: true, trim: true, maxlength: 100 },
  quantity: { type: Number, min: 0.01, default: null },
  unit: { type: String, enum: ['kg','gram','litre','piece','quintal'], default: 'kg' },
  message: { type: String, trim: true, maxlength: 1000, default: '' },
  status: { type: String, enum: ['pending','accepted','rejected','cancelled'], default: 'pending' }
}, { timestamps: true });
schema.index({ sender: 1, recipient: 1, product: 1, status: 1 });
module.exports = mongoose.model('InterestRequest', schema);
