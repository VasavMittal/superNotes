const mongoose = require("mongoose");

const conn = mongoose.createConnection(process.env.HANDPIKD_MONGO_URI);

const quotationItemSchema = new mongoose.Schema(
  {
    description: String,
    unitPrice: Number,
    qty: Number,
    gst: Number,
    total: Number,
    imgDataUrl: String,
  },
  { _id: false }
);

const quotationSchema = new mongoose.Schema({
  clientName: String,
  contact: String,
  quotNum: String,
  validIso: String,
  notes: String,
  grandTotal: Number,
  calculatorItems: mongoose.Schema.Types.Mixed,
  quotationItems: [quotationItemSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

module.exports = conn.model("Quotation", quotationSchema, "quotations");
