const express = require("express");
const router = express.Router();
const Customer = require("../models/Customer.js");

// POST /api/customers - Save multiple customers
router.post("/", async (req, res) => {
  try {
    const data = req.body;

    const customers = Object.entries(data).map(([customerId, details]) => ({
      customerId,
      ...details
    }));

    await Customer.insertMany(customers, { ordered: false });

    res.status(201).json({ message: "Customers saved successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
