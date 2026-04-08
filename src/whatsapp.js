const axios = require("axios");

const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;

async function sendWhatsApp(to, templateName, params = []) {
  try {
    const template = {
      name: templateName,
      language: { code: "en" },
    };

    if (params.length > 0) {
      template.components = [
        {
          type: "body",
          parameters: params.map((p) => ({ type: "text", text: p })),
        },
      ];
    }

    await axios.post(
      `https://graph.facebook.com/v18.0/${PHONE_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: to,
        type: "template",
        template,
      },
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log(`✅ Sent ${templateName} to ${to}`);
    return true;
  } catch (err) {
    console.log("❌ WhatsApp Error:", err.response?.data || err.message);
    return false;
  }
}

module.exports = { sendWhatsApp };
