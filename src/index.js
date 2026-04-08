const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const customerRoutes = require("./routes/customerRoutes");
const shiprocketRoutes = require("./routes/shiprocketRoutes");
const cors = require("cors");
const path = require("path");
const cron = require("node-cron");
const moment = require("moment");
const { getSheetData, updateCell } = require("./google");
const { sendWhatsApp } = require("./whatsapp");

dotenv.config();

// ================= SHEET CONFIG =================

const SHEET_1 = "1pP8U6y-JP8cc_kY2VZmXAo85DOKa0F6H8OSeqxNuUoE";
const SHEET_2 = "1180QY5Hl6woKCJlFsWfwr2O1UCMhfjSbr-oIwJDTda8";
const SHEET_3 = "1MgWID7enOpyZQj2_sOwL203OJUVH-jpxmVxTi5603zo";

const RANGE = "Form Responses 1!A2:M";

// Column indexes
const TIMESTAMP_COL = 0;
const PHONE_COL = 4;
const EMAIL_COL = 5;
const STATUS_COL = 9;
const R1_COL = 10;
const R2_COL = 11;
const R3_COL = 12;

// ================= TEMPLATES =================

const TEMPLATE_1 = "career_starter_kit_invitee";
const TEMPLATE_2 = "career_project_completion_next_steps";
const TEMPLATE_3 = "career_project_reminder_24h";
const TEMPLATE_4 = "career_project_reminder_48h";
const TEMPLATE_5 = "address_reminder_72h";

// ================= HELPERS =================

function normalizeEmail(email) {
  return (email || "").toLowerCase().trim();
}

const app = express();
// app.use(express.json()); // to parse JSON
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public folder (assuming public is sibling to src)
// Serve static files from the public folder (assuming public is sibling to src)
app.use(express.static(path.join(__dirname, "..", "public")));

// Enable CORS for allowed origins (set ALLOWED_ORIGIN in env in production)
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*" }));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    require("./scheduler/addressReminderScheduler");
  })
  .catch((err) => console.error("MongoDB connection error:", err));

// ================= CRON =================

cron.schedule("*/3 * * * *", async () => {
  console.log("⏳ Running cron...");

  const sheet1 = await getSheetData(SHEET_1, RANGE);
  const sheet2 = await getSheetData(SHEET_2, "Form Responses 1!A2:Z");
  const sheet3 = await getSheetData(SHEET_3, "Form Responses 1!A2:Z");

  const assessmentEmails = sheet2.map((r) => normalizeEmail(r[3]));
  const finalEmails = sheet3.map((r) => normalizeEmail(r[3]));

  for (let i = 0; i < sheet1.length; i++) {
    const row = sheet1[i];

    const timestamp = row[TIMESTAMP_COL];
    const phone = row[PHONE_COL];
    const email = normalizeEmail(row[EMAIL_COL]);

    let status = row[STATUS_COL] || "0";
    let r1 = row[R1_COL] || "0";
    let r2 = row[R2_COL] || "0";
    let r3 = row[R3_COL] || "0";

    const hours = moment().diff(moment(timestamp), "hours");

    const rowNumber = i + 2;

    // ================= SEND TEMPLATE 1 (INITIAL) =================
    if (!row[STATUS_COL] && !r1 && !r2 && !r3 && hours < 1) {
      await sendWhatsApp(phone, TEMPLATE_1);
    }

    // ================= ASSESSMENT COMPLETED =================
    if (assessmentEmails.includes(email) && status === "0") {
      await sendWhatsApp(phone, TEMPLATE_2);

      await updateCell(SHEET_1, `Form Responses 1!J${rowNumber}`, 1);
      continue;
    }

    // ================= REMINDER 24H =================
    if (!assessmentEmails.includes(email) && hours >= 24 && r1 === "0") {
      await sendWhatsApp(phone, TEMPLATE_3);
      await updateCell(SHEET_1, `Form Responses 1!K${rowNumber}`, 1);
    }

    // ================= REMINDER 48H =================
    if (!assessmentEmails.includes(email) && hours >= 48 && r2 === "0") {
      await sendWhatsApp(phone, TEMPLATE_4);
      await updateCell(SHEET_1, `Form Responses 1!L${rowNumber}`, 1);
    }

    // ================= FINAL FORM REMINDER =================
    if (
      assessmentEmails.includes(email) &&
      !finalEmails.includes(email) &&
      hours >= 72 &&
      r3 === "0"
    ) {
      await sendWhatsApp(phone, TEMPLATE_5);
      await updateCell(SHEET_1, `Form Responses 1!M${rowNumber}`, 1);
    }
  }
});

// Use routes
app.use("/api/customers", customerRoutes);
app.use("/api/shiprocket", shiprocketRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
