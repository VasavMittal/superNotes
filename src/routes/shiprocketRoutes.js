const express = require("express");
const router = express.Router();
const { createShiprocketOrder } = require("../models/CreateOrder");
const dotenv = require("dotenv");
dotenv.config();

// POST /api/shiprocket/create
router.post("/create", async (req, res) => {
  const orderPayload = req.body;
  if (!orderPayload || !orderPayload.order_id) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  try {
    const data = await createShiprocketOrder(orderPayload);
    return res.json({ success: true, data });
  } catch (err) {
    console.error(
      "Shiprocket create failed:",
      err.response?.data || err.message
    );
    return res
      .status(502)
      .json({
        error: "Failed to create Shiprocket order",
        details: err.response?.data || err.message,
      });
  }
});

module.exports = router;
