const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const customerRoutes = require("./routes/customerRoutes");

dotenv.config();

const app = express();
app.use(express.json()); // to parse JSON

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Use routes
app.use("/api/customers", customerRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
