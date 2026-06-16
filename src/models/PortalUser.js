const mongoose = require('mongoose');

const portalUserSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:        { type: String, default: '' },
  company:      { type: String, default: '' },
  passwordHash: { type: String, required: true },
  points:       { type: Number, default: 0 },
  isAdmin:      { type: Boolean, default: false },
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date }
});

module.exports = mongoose.model('PortalUser', portalUserSchema);
