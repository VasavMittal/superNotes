const axios = require('axios');
const dotenv = require("dotenv");
dotenv.config();

const key_id = process.env.PAYMENT_KEY_ID;
const key_secret = process.env.PAYMENT_KEY_SECRET;

const fetchPaymentDetails = async (payment_id) => {
  const url = `https://api.razorpay.com/v1/payments/${payment_id}`;

  try {
    const res = await axios.get(url, {
      auth: {
        username: key_id,
        password: key_secret,
      },
    });

    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.error?.description || error.message);
  }
};

module.exports = fetchPaymentDetails;
