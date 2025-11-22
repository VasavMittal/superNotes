const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const customerRoutes = require("./routes/customerRoutes");
const shiprocketRoutes = require("./routes/shiprocketRoutes");
const cors = require("cors");
const path = require("path");

dotenv.config();

const app = express();
// app.use(express.json()); // to parse JSON
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public folder (assuming public is sibling to src)
// Serve static files from the public folder (assuming public is sibling to src)
app.use(express.static(path.join(__dirname, "..", "public")));

// Enable CORS for allowed origins (set ALLOWED_ORIGIN in env in production)
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*" }));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    require("./scheduler/addressReminderScheduler");
  })
  .catch((err) => console.error("MongoDB connection error:", err));

// Use routes
app.use("/api/customers", customerRoutes);
app.use("/api/shiprocket", shiprocketRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
