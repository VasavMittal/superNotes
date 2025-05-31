const cron = require("node-cron");
const Customer = require("../models/Customer");
const nodemailer = require("nodemailer");

// Setup email transporter (use your credentials or environment variables)
const transporter = nodemailer.createTransport({
  host: 'smtpout.secureserver.net',
  port: 465,
  secure: true, // true for 465, false for 587 with TLS
  auth: {
    user: 'support@supernotes.info',
    pass: 'Sunil@321'
  },
  tls: {
    ciphers: 'SSLv3'
  }
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

// Scheduled job: runs every day at 6:00 AM
cron.schedule("0 6 * * *", async () => {
  console.log("🔔 Running address reminder job at 6:00 AM");

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
        text: `Dear ${customer.name || "Customer"},\n\nPlease update your address in your profile.\n\nThank you.`,
      };

      await transporter.sendMail(mailOptions);
      console.log(`📧 Reminder sent to ${customer.email}`);
    }
  } catch (error) {
    console.error("❌ Error running address reminder job:", error);
  }
});
