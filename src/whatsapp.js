const axios = require("axios");
const path = require("path");

// Set WHATSAPP_PROVIDER=meta in .env to roll back to the old Meta Graph API path.
const PROVIDER = process.env.WHATSAPP_PROVIDER || "aisensy";

const AISENSY_API_KEY = process.env.AISENSY_API_KEY;
const AISENSY_API_URL = "https://backend.aisensy.com/campaign/t1/api/v2";

// Meta template name -> AiSensy campaign name (as created in the AiSensy dashboard)
const CAMPAIGN_NAME_BY_TEMPLATE = {
  career_starter_kit_invitee: "starter invite",
  career_project_completion_next_steps: "next steps",
  career_project_reminder_24h: "reminder 24h",
  career_project_reminder_48h: "reminder 48h",
  address_reminder_72h: "reminder 72h",
};

async function sendViaAiSensy(to, templateName, params, headerMediaUrl) {
  const campaignName = CAMPAIGN_NAME_BY_TEMPLATE[templateName];
  if (!campaignName) {
    console.log(`❌ AiSensy Error: no campaign mapped for template "${templateName}"`);
    return false;
  }

  const payload = {
    apiKey: AISENSY_API_KEY,
    campaignName,
    destination: to,
    userName: to,
    templateParams: params,
  };

  if (headerMediaUrl) {
    payload.media = {
      url: headerMediaUrl,
      filename: path.basename(new URL(headerMediaUrl).pathname),
    };
  }

  try {
    await axios.post(AISENSY_API_URL, payload, {
      headers: { "Content-Type": "application/json" },
    });
    console.log(`✅ Sent ${campaignName} to ${to}`);
    return true;
  } catch (err) {
    console.log("❌ AiSensy Error:", err.response?.data || err.message);
    return false;
  }
}

async function sendViaMeta(to, templateName, params, headerMediaUrl, headerMediaType) {
  const TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_ID = process.env.WHATSAPP_PHONE_ID;

  try {
    const template = {
      name: templateName,
      language: { code: "en" },
    };

    const components = [];

    if (headerMediaUrl) {
      components.push({
        type: "header",
        parameters: [{ type: headerMediaType, [headerMediaType]: { link: headerMediaUrl } }],
      });
    }

    if (params.length > 0) {
      components.push({
        type: "body",
        parameters: params.map((p) => ({ type: "text", text: p })),
      });
    }

    if (components.length > 0) {
      template.components = components;
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

async function sendWhatsApp(to, templateName, params = [], headerMediaUrl = null, headerMediaType = "image") {
  if (PROVIDER === "meta") {
    return sendViaMeta(to, templateName, params, headerMediaUrl, headerMediaType);
  }
  return sendViaAiSensy(to, templateName, params, headerMediaUrl);
}

module.exports = { sendWhatsApp };
