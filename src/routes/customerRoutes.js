const express = require("express");
const router = express.Router();
const Customer = require("../models/customer.js");
const fetchPaymentDetails = require("../models/paymentsDetails.js");

// POST /api/customers - Save multiple customers
router.get("/", async (req, res) => {
  const payment_id = req.query.payment_id;

  if (!payment_id) {
    return res.status(400).json({ error: "payment_id is required in query params" });
  }

  try {
    const paymentData = await fetchPaymentDetails(payment_id);

    const customerPayload = {
      orderId: paymentData.order_id,
      name: paymentData.notes.full_name,
      email: paymentData.notes.email,
      contactNo: paymentData.notes.whatsapp_no,
      address: {}
    };

    const customer = new Customer(customerPayload);
    await customer.save();
    res.redirect(`/addressSubmitPage.html?payment_id=${payment_id}`);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/address", async (req, res) => {
  const payment_id = req.query.payment_id;
  const addressPayload = req.body.address;
  const email = req.body.email;

  if (!payment_id || !addressPayload || !email) {
    return res.status(400).json({ error: "payment_id, address and email are required" });
  }

  try {
    // Fetch payment details from Razorpay
    const paymentData = await fetchPaymentDetails(payment_id);
    const { order_id} = paymentData;

    // Find customer by orderId
    const customer = await Customer.findOne({ orderId: order_id });

    if (!customer) {
      return res.status(404).json({ error: "Customer with given orderId not found" });
    }

    // Check email match
    if (customer.email !== email) {
      return res.status(403).json({ error: "Email mismatch. Not authorized to update address." });
    }

    // Update address
    customer.address = addressPayload;
    await customer.save();

    res.json({ message: "Address updated successfully", customer });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
