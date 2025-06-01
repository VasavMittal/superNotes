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

    const customersToRemind = customers.filter((customer) =>
      isAddressMissing(customer.address)
    );

    for (const customer of customersToRemind) {
      if (!customer.email) continue;

      const mailOptions = {
        from: "support@supernotes.info",
        to: customer.email,
        subject: "Address Information Needed",
        // text: `Dear ${
        //   customer.name || "Customer"
        // },\n\nPlease add your address by clicking the link below:\n\n${
        //   process.env.API_BASE_URL
        // }/addressSubmitPage.html
        // }\n\nThank you.`,
        html: `
    <p>Dear ${customer.name || "Customer"},</p>
    <p>Please add your address by clicking the link below:</p>
    <p><a href="${
      process.env.API_BASE_URL
    }/addressSubmitPage.html" target="_blank">Click here to submit your address</a></p>
    <p>Thank you.</p>
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
