const mongoose = require("mongoose");

// Address sub-schema
const addressSchema = new mongoose.Schema({
  fullAddress: String,
  city: String,
  state: String,
  pincode: Number,
  country: String
}, { _id: false });

// Order Details sub-schema
const orderDetailsSchema = new mongoose.Schema({
  orderId: { type: String, required: true },
  paymentId: String,
  address: addressSchema,
  studentName: String, 
  grade: String
}, { _id: false });

// Customer schema
const customerSchema = new mongoose.Schema({
  name: String,
  email: String,
  contactNo: Number,
  orderDetails: [orderDetailsSchema]
});

module.exports = mongoose.model("SuperNotes", customerSchema);
