const mongoose = require('mongoose');

const portalOrderSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'PortalUser', required: true },
  orderNumber: { type: String, default: '' },
  description: { type: String, default: '' },
  amount:      { type: Number, default: 0 },
  status:      { type: String, enum: ['pending', 'processing', 'delivered', 'cancelled'], default: 'pending' },
  notes:       { type: String, default: '' },
  invoicePdf:  { type: String, default: null },   // base64 data URL
  invoiceName: { type: String, default: null },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date }
});

module.exports = mongoose.model('PortalOrder', portalOrderSchema);
