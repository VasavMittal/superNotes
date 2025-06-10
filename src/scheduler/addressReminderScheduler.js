const cron = require("node-cron");
const Customer = require("../models/Customer");
const nodemailer = require("nodemailer");
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

// Setup email transporter (use your credentials or environment variables)
const transporter = nodemailer.createTransport({
  host: "smtpout.secureserver.net",
  port: 465,
  secure: true, // true for 465, false for 587 with TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    ciphers: "SSLv3",
  },
});

// Helper: Check if address is empty or missing
const isAddressMissing = (address) => {
  return (
    !address ||
    !address.fullAddress ||
    !address.city ||
    !address.state ||
    !address.pincode
  );
};

// Scheduled job: runs every day at 11:30 AM
cron.schedule("0 6 * * *", async () => {
  console.log("Running address reminder job at 11:30 AM");

  try {
    const customers = await Customer.find();
    for (const customer of customers) {
      if (!customer.email || !customer.orderDetails) continue;

      const orderWithMissingAddress = customer.orderDetails.find((order) =>
        isAddressMissing(order.address)
      );

      if (!orderWithMissingAddress) continue;

      const paymentId = orderWithMissingAddress.paymentId;

      const mailOptions = {
        from: "support@supernotes.info",
        to: customer.email,
        subject: "Action Required: Please Provide Your Shipping Address",
        html: `
          <p>Dear ${customer.name || "Customer"},</p>

          <p>We’re preparing to ship your Supernotes, but we noticed that your shipping address has not been submitted.</p>

          <p>Please complete the form below so we can proceed with your delivery:</p>

          <p>👉 <a href="${
            process.env.API_BASE_URL
          }/thankyou/address.html?paymentId=${paymentId}" target="_blank">Click to Submit Address</a></p>

          <p>It only takes a minute!</p>

          <p>If you’ve already submitted it, thank you — no further action is needed.</p>

          <p>📦 <strong>Note:</strong> Without this information, we won’t be able to ship your order.</p>

          <p>If you have any questions, feel free to contact us at 📩 <a href="mailto:support@supernotes.info">support@supernotes.info</a>.</p>

          <p>P.S.: Your order will be shipped within 1–3 business days after the address is received.</p>

          <br/>
          <p>Best regards,<br/>
          Team Supernotes<br/>
          <img src="${
            process.env.API_BASE_URL
          }/img/logo.png" alt="Supernotes Logo" width="120" style="margin-top: 10px;" />
          </p>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`Reminder sent to ${customer.email}`);
    }
  } catch (error) {
    console.error("Error running address reminder job:", error);
  }
});
// ⏱️ Job 2: Every 15 minutes — Health check on /health
cron.schedule("*/15 * * * *", async () => {
  console.log("🌡️ Running health check for /api/customers/health");

  try {
    const response = await axios.get(
      `${process.env.API_BASE_URL}/api/customers/health`
    );
    console.log(`Health check passed: ${response.data.status}`);
  } catch (error) {
    console.error("Health check failed:", error.message);
  }
});
