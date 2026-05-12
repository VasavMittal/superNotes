const express = require("express");
const router = express.Router();
const Quotation = require("../models/Quotation");

router.post("/", async (req, res) => {
  try {
    const doc = await Quotation.create({ ...req.body, createdAt: new Date() });
    res.status(201).json({ id: doc._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const list = await Quotation.find(
      {},
      { "quotationItems.imgDataUrl": 0 }
    ).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const doc = await Quotation.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    await Quotation.findByIdAndUpdate(req.params.id, {
      ...req.body,
      updatedAt: new Date(),
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await Quotation.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
