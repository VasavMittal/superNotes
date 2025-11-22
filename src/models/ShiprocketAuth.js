const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

async function getShiprocketToken() {
  const url = process.env.AUTH_URL;
  const credentials = {
    email: process.env.AUTH_EMAIL,
    password: process.env.AUTH_PASSWORD,
  };
  console.log("🔐 Fetching Shiprocket token...");
  console.log("➡️ AUTH_URL:", url);
  console.log("➡️ AUTH_EMAIL:", credentials.email);
  try {
    const response = await axios.post(url, credentials, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    const token = response.data.token;
    console.log("Authentication token:", token);
    return token;
  } catch (error) {
    console.error(
      "Error fetching token:",
      error.response ? error.response.data : error.message
    );
    throw error; // propagate error to caller
  }
}
module.exports = { getShiprocketToken };
