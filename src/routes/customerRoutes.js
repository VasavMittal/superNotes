const express = require("express");
const router = express.Router();
const Customer = require("../models/Customer.js");
const nodemailer = require("nodemailer");
const fetchPaymentDetails = require("../models/PaymentsDetails.js");
const { createShiprocketOrder } = require("../models/CreateOrder.js");
const dotenv = require("dotenv");
dotenv.config();

// Create transporter
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

    console.log("Payment Data :", paymentData);
    const orderDetailsEntry = {
      orderId: paymentData.order_id,
      paymentId: payment_id,
      address: {},
      studentName: "",
      grade: "",
    };

    const filter = {
      email: paymentData.notes.email,
    };

    let customer = await Customer.findOne(filter);

    if (customer) {
      // If customer exists, push new order
      customer.orderDetails.push(orderDetailsEntry);
    } else {
      // New customer
      customer = new Customer({
        name: paymentData.notes.full_name,
        email: paymentData.notes.email,
        contactNo: paymentData.notes.whatsapp_no,
        orderDetails: [orderDetailsEntry],
      });
    }
    await customer.save();
    // ✉️ Compose welcome email
    const mailOptions = {
      from: "support@supernotes.info",
      to: customer.email,
      subject: "Welcome to Supernotes – Let’s Begin!",
      html: `
        <p>Hi ${customer.name || "there"},</p>

        <p>Thank you for purchasing <strong>Supernotes</strong> — your first step toward helping your child plan their future with clarity and purpose.</p>

        <p>At <strong>Pursue Academia</strong>, we’ve curated the Supernotes 4-in-1 Toolkit as part of our mission to make early career planning effective, affordable, and accessible to all. We’re honored to support you in this important journey.</p>

        <p>📚 <strong>Start Right Away:</strong> While your Supernotes notebook is on its way, we invite you to explore our digital guide:<br/>
        🔗 <a href="https://simplebooklet.com/careerplanningebook#page=1" target="_blank">Read the eBook</a></p>

        <p>👥 <strong>Join the Parent Support WhatsApp Group:</strong> Participate in our DIY Career Planning Walkthrough Session and learn how to apply our proven framework.<br/>
        🗓️ Sessions are held every Monday — absolutely free! <br/>
        <a href="https://chat.whatsapp.com/KQD9BeV0m3F3YVif0uI9dK" target="_blank">Join Now</a></p>

        <p>🌟 <strong>Become a Mentor:</strong> We're looking for passionate individuals to join us in this rewarding and fulfilling mission. Help shape young futures through meaningful guidance.</p>

        <p>📩 Need help? Email us at <a href="mailto:support@supernotes.info">support@supernotes.info</a></p>
        
        <p>👉 <a href="${
          process.env.API_BASE_URL
        }/addressSubmitPage.html?paymentId=${payment_id}" target="_blank">Click to Submit Address</a></p>
        <br/>
        
        <p>We're thrilled to be part of your journey.</p>

        <p>Best regards,<br/>
        Team Supernotes<br/>
        <a href="https://www.supernotes.info" target="_blank">www.supernotes.info</a><br/>
        <img src="${
          process.env.API_BASE_URL
        }/img/logo.png" alt="Supernotes Logo" width="120" style="margin-top: 10px;" />
        </p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${customer.email}`);

    res.status(200).json({ message: "Customer saved and email sent" });
  } catch (error) {
    console.error("❌ Error in webhook handler:", error);
    res.status(500).json({ error: error.message });
  }
});

// router.post("/", async (req, res) => {
//   console.log("🔔 Webhook Payload:", req.body);
//   const payment_id = req.body?.payload?.payment?.entity?.id;

//   if (!payment_id) {
//     return res
//       .status(400)
//       .json({ error: "payment_id is required in query params" });
//   }

//   try {
//     const paymentData = await fetchPaymentDetails(payment_id);

//     const customerPayload = {
//       orderId: paymentData.order_id,
//       paymentId: payment_id,
//       name: paymentData.notes.full_name,
//       email: paymentData.notes.email,
//       contactNo: paymentData.notes.whatsapp_no,
//       address: {},
//     };

//     const customer = new Customer(customerPayload);
//     await customer.save();
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });
router.get("/health", (req, res) => {
  res.json({ status: "ok", message: "CustomerRoutes is healthy" });
});

router.post("/address", async (req, res) => {
  const addressPayload = req.body.address;
  const email = req.body.email;
  const paymentIdFromReq = req.body.paymentId;
  const studentName = req.body.studentName;
  const grade = req.body.grade;

  if (!addressPayload || !email || !studentName || !grade) {
    return res
      .status(400)
      .json({ error: "address, email, student name and grade are required" });
  }

  try {
    // Find customer by orderId
    const customer = await Customer.findOne({ email: email });

    if (!customer) {
      return res.status(404).json({ error: "Customer Order not found" });
    }

    let targetOrder = null;
    if (paymentIdFromReq) {
      targetOrder = customer.orderDetails.find(
        (order) => order.paymentId === paymentIdFromReq
      );
      if (!targetOrder) {
        return res
          .status(404)
          .json({ error: "Order with given paymentId not found" });
      }
    } else {
      // No paymentId provided, update last order
      if (customer.orderDetails.length === 0) {
        return res
          .status(400)
          .json({ error: "No orders found to update address" });
      }

      targetOrder = customer.orderDetails[customer.orderDetails.length - 1];
    }
    // Check email match
    if (customer.email !== email) {
      return res
        .status(403)
        .json({ error: "Email mismatch. Not authorized to update address." });
    }

    const paymentData = await fetchPaymentDetails(targetOrder.paymentId);
    const { order_id, amount, notes } = paymentData;
    const final_amount = parseFloat((amount / 100).toFixed(2));

    const orderPayload = getShiprocketOrderPayload(
      targetOrder.orderId,
      new Date(),
      notes.full_name?.split(" ")[0] || notes.full_name,
      notes.full_name?.split(" ")[1] || "",
      addressPayload.fullAddress,
      "",
      addressPayload.city,
      addressPayload.pincode,
      addressPayload.state,
      addressPayload.country,
      notes.email,
      notes.whatsapp_no,
      final_amount
    );
    await createShiprocketOrder(orderPayload);

    targetOrder.address = addressPayload;
    targetOrder.studentName = studentName;
    targetOrder.grade = grade;
    await customer.save();

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
    return res
      .status(400)
      .json({ error: "order_id is required in the request body" });
  }

  try {
    const customer = await Customer.findOne({
      "orderDetails.orderId": orderId,
    });

    if (!customer) {
      console.log("Customer not found for the given order_id");
      return res
        .status(404)
        .json({ error: "Customer not found for the given order_id" });
    }

    const order = customer.orderDetails.find((od) => od.orderId === orderId);

    if (!order) {
      console.log("Order not found in customer's orderDetails");
      return res
        .status(404)
        .json({ error: "Order not found in customer's orderDetails" });
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
