const axios = require("axios");
const { getShiprocketToken } = require("./ShiprocketAuth");
const dotenv = require("dotenv");

async function createShiprocketOrder(orderPayload) {
  dotenv.config();
  const url = process.env.CREATE_ORDER_URL;
  const token = await getShiprocketToken();

  try {
    const response = await axios.post(url, orderPayload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    console.log("Order created successfully:", response.data);
  } catch (error) {
    console.error(
      "Error creating order:",
      error.response ? error.response.data : error.message
    );
  }
}
module.exports = { createShiprocketOrder };