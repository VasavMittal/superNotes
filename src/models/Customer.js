const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  houseNo: Number,
  sector: String,
  area: String,
  city: String,
  state: String,
  pincode: Number
});

const customerSchema = new mongoose.Schema({
  customerId: { type: String, required: true, unique: true },
  name: String,
  email: String,
  address: addressSchema
});

module.exports = mongoose.model("SuperNotes", customerSchema);
