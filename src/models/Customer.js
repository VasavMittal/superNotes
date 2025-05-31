const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  fullAddress: String,
  city: String,
  state: String,
  pincode: Number,
  country: String
});

const customerSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  paymentId: String,
  name: String,
  email: String,
  contactNo: Number,
  address: addressSchema
});

module.exports = mongoose.model("SuperNotes", customerSchema);
