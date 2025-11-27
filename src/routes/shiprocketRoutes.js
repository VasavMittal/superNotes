const express = require("express");
const router = express.Router();
const { createShiprocketOrder } = require("../models/CreateOrder");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
dotenv.config();

// create SMTP transporter using existing credentials
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

// POST /api/shiprocket/create
router.post("/create", async (req, res) => {
  const orderPayload = req.body;
  if (!orderPayload || !orderPayload.order_id) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  // ⭐ Console the payload before calling Shiprocket
  console.log(
    "📦 Payload being sent to Shiprocket:",
    JSON.stringify(orderPayload, null, 2)
  );

  try {
    const data = await createShiprocketOrder(orderPayload);

    // Send welcome email if billing email is present
    const toEmail = orderPayload?.billing_email || orderPayload?.billing?.email;
    if (toEmail) {
      const mailHtml = `
        <p>Hi Parent,</p>
        <p>Thank you for subscribing to <strong>Supernotes</strong> — your first step toward helping your child plan their future with clarity and purpose.</p>
        <p>At <strong>Pursue Academia</strong>, we’ve curated the Supernotes 4-in-1 Toolkit as part of our mission to make early career planning effective, affordable, and accessible to all. We’re honored to support you in this important journey.</p>
        <p>📚 <strong>Start Right Away:</strong> While your Supernotes notebook is on its way, we invite you to explore our digital guide: <a href="https://simplebooklet.com/careerplanningebook">Read the eBook</a> - The Essential of Career Planning.</p>
        <p>👥 <strong>Mentor Connect:</strong> We’ll soon schedule a call with one of our certified career coaches who will guide your child through the practical steps and importance of career planning in today’s ever-changing career landscape.</p>
        <p>Join the Parent Support WhatsApp Group: Participate in our DIY Career Planning Walkthrough Sessions and other education webinars — plus get regular updates and resources (free). 👉 <a href="https://chat.whatsapp.com/KQD9BeV0m3F3YVif0uI9dK">Join Now</a></p>
        <p>🌟 Become a Mentor: We're looking for passionate individuals to join us in this rewarding and fulfilling mission. Help shape young futures through meaningful guidance.</p>
        <p>📩 Need help? Email us at <a href="mailto:support@supernotes.info">support@supernotes.info</a></p>
        <p>We're thrilled to be part of your journey.</p>
        <p>Best regards,<br/>Team Supernotes</p>
      `;

      const mailOptions = {
        from: process.env.SMTP_USER || "support@supernotes.info",
        to: toEmail,
        subject: "Welcome to Supernotes – Let’s Begin!",
        html: mailHtml,
      };

      transporter.sendMail(mailOptions, (mailErr, info) => {
        if (mailErr) {
          console.error("❌ Failed to send welcome email:", mailErr);
        } else {
          console.log(`✅ Welcome email sent to ${toEmail}: ${info.messageId}`);
        }
      });
    } else {
      console.log("ℹ️ No billing email provided — skipping welcome email.");
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.error(
      "Shiprocket create failed:",
      err.response?.data || err.message
    );
    return res.status(502).json({
      error: "Failed to create Shiprocket order",
      details: err.response?.data || err.message,
    });
  }
});

module.exports = router;
