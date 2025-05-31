const axios = require('axios');

const key_id = 'rzp_live_7mkiuZOoCpB2PW';
const key_secret = 'bhTvVPPGQZq693XhJawbhQ71';

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
