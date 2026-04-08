const axios = require("axios");

const TOKEN =
  "EAAUJSAf6SZBIBRIN7Fdb6eflmHvvXzFMVR461Eq6BBiyD8jVIUQrcJPHjMn1Gi3Qz0eNl3gmSrDJznQAfTZBAEyyYWFUtLueGJelSDu6E1sabtHRYZBkYFcCp3mZBXmAwPZBiiDxqkkV67ZCtBY8X2zzu75elAKJnuiYDZAjXnmAwgkjNivULDvtWg0GqG0ta0e2KanGCq7rFxd1GwYUKEdMGBSCJ8fLl97ePuqtbMoiP6102ZAIFKNo8TI0fRSbcku9sPCZBOawO7dKpvjH4uZAqlrSLA";
const PHONE_ID = "1063790500152703";

async function sendWhatsApp(to, templateName) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/${PHONE_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: to,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en" },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log(`✅ Sent ${templateName} to ${to}`);
  } catch (err) {
    console.log("❌ WhatsApp Error:", err.response?.data || err.message);
  }
}

module.exports = { sendWhatsApp };
