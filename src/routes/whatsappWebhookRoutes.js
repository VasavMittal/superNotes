const express = require("express");
const router = express.Router();
const axios = require("axios");

const VERIFY_TOKEN = "supernotes_verify_2024";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyNIHXcPChSivhsp_i4N2-Sf6uZ3xgt_m-mHi8-BvSXB4YzStSx24N1Mo5vsAbJ2ZIi/exec";

// GET — WhatsApp webhook verification
router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ WhatsApp webhook verified");
    return res.status(200).send(challenge);
  }

  console.log("❌ Webhook verification failed — token mismatch");
  return res.status(403).json({ error: "Forbidden" });
});

// POST — Receive incoming WhatsApp messages
router.post("/", async (req, res) => {
  // Respond immediately so Meta doesn't retry
  res.status(200).json({ status: "ok" });

  try {
    const body = req.body;
    if (body.object !== "whatsapp_business_account") return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        for (const message of change.value?.messages || []) {
          if (message.type !== "text") continue;

          const phone = message.from;
          const text = message.text?.body || "";
          const timestamp = new Date().toISOString();

          console.log(`📩 Incoming WhatsApp | from: ${phone} | message: "${text}"`);

          await axios.post(APPS_SCRIPT_URL, { timestamp, phone, message: text });
          console.log(`📌 Sent to Apps Script: [${timestamp}, ${phone}, ${text}]`);
        }
      }
    }
  } catch (err) {
    console.error("❌ Error processing webhook:", err.message);
  }
});

module.exports = router;
