const express = require("express");
const router = express.Router();
const Customer = require("../models/Customer.js");
const fetchPaymentDetails = require("../models/PaymentsDetails.js");
const { createShiprocketOrder } = require("../models/CreateOrder.js");
const {
  getShiprocketOrderPayload,
} = require("../models/ShiprocketOrderPayload");

// POST /api/customers - Save multiple customers
router.post("/", async (req, res) => {
  console.log("🔔 Webhook Payload:", req.body);
  const payment_id = req.body?.payload?.payment?.entity?.id;

  if (!payment_id) {
    return res
      .status(400)
      .json({ error: "payment_id is required in query params" });
  }

  try {
    const paymentData = await fetchPaymentDetails(payment_id);

    const customerPayload = {
      orderId: paymentData.order_id,
      paymentId: payment_id,
      name: paymentData.notes.full_name,
      email: paymentData.notes.email,
      contactNo: paymentData.notes.whatsapp_no,
      address: {},
    };

    const customer = new Customer(customerPayload);
    await customer.save();
    res.redirect(`/addressSubmitPage.html?payment_id=${payment_id}`);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.get("/health", (req, res) => {
  res.json({ status: "ok", message: "CustomerRoutes is healthy" });
});

router.post("/address", async (req, res) => {
  const payment_id = req.query.payment_id;
  const addressPayload = req.body.address;
  const email = req.body.email;

  if (!payment_id || !addressPayload || !email) {
    return res
      .status(400)
      .json({ error: "payment_id, address and email are required" });
  }

  try {
    // Fetch payment details from Razorpay
    const paymentData = await fetchPaymentDetails(payment_id);
    const { order_id, created_at, notes } = paymentData;

    // Find customer by orderId
    const customer = await Customer.findOne({ orderId: order_id });

    if (!customer) {
      return res
        .status(404)
        .json({ error: "Customer with given orderId not found" });
    }

    // Check email match
    if (customer.email !== email) {
      return res
        .status(403)
        .json({ error: "Email mismatch. Not authorized to update address." });
    }

    // Update address
    customer.address = addressPayload;
    await customer.save();
    const orderPayload = getShiprocketOrderPayload(
      order_id,
      created_at,
      notes.full_name?.split(" ")[0] || notes.full_name,
      notes.full_name?.split(" ")[1] || "",
      addressPayload.fullAddress,
      "",
      addressPayload.city,
      addressPayload.pincode,
      addressPayload.state,
      addressPayload.country,
      notes.email,
      notes.whatsapp_no
    );
    await createShiprocketOrder(orderPayload);
    res.json({ message: "Address updated successfully", customer });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
router.post("/delivered", async (req, res) => {
  // const orderId  = req.body.order_id;
  const orderId = req.body.order_id || req.body?.data?.order_id;

  console.log(
    "📦 Shiprocket Webhook Received:",
    JSON.stringify(req.body, null, 2)
  );

  if (!orderId) {
    console.log("order_id is required in the request body");
    return res.status(400).json({ error: "order_id is required in the request body" });
  }

  try {
    const customer = await Customer.findOne({ orderId: orderId });

    if (!customer) {
      console.log("Customer not found for the given order_id");
      return res.status(404).json({ error: "Customer not found for the given order_id" });
    }

    if (!customer.email) {
      console.log("Customer email not found");
      return res.status(400).json({ error: "Customer email not found" });
    }

    const transporter = nodemailer.createTransport({
      host: "smtpout.secureserver.net",
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: {
        ciphers: "SSLv3",
      },
    });

    const mailOptions = {
      from: "support@supernotes.info",
      to: customer.email,
      subject: "Your Order Has Been Delivered",
      text: `Dear ${
        customer.name || "Customer"
      },\n\nWe’re happy to inform you that your order (Order ID: ${orderId}) has been successfully delivered.\n\nIf you have any questions, feel free to reach out to us.\n\nThank you for shopping with SuperNotes!\n\n– SuperNotes Team`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Delivered email sent to ${customer.email}`);

    res.json({ message: `Delivered email sent to ${customer.email}` });
  } catch (error) {
    console.error("Error sending delivered email:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
