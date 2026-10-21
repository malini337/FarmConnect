const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  demoKey: { type: String, unique: true, sparse: true, index: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  type: { type: String, required: true, maxlength: 60 },
  message: { type: String, required: true, maxlength: 300 },
  entityType: { type: String, enum: ['request','product','order','logistics','system'], default: 'system' },
  entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
  readAt: { type: Date, default: null }
}, { timestamps: true });
module.exports = mongoose.model('Notification', schema);
