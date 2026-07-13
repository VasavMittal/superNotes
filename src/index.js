const express      = require("express");
const mongoose     = require("mongoose");
const dotenv       = require("dotenv");
const cors         = require("cors");
const path         = require("path");

const customerRoutes        = require("./routes/customerRoutes");
const shiprocketRoutes      = require("./routes/shiprocketRoutes");
const quotationRoutes       = require("./routes/quotationRoutes");
const authRoutes            = require("./routes/authRoutes");
const portalUserRoutes      = require("./routes/portalUserRoutes");
const portalOrderRoutes     = require("./routes/portalOrderRoutes");

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*" }));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  express.static(path.join(__dirname, "..", "public"), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".mp4")) {
        res.setHeader("Content-Type", "video/mp4");
      }
    },
  }),
);

app.use("/api/customers",        customerRoutes);
app.use("/api/shiprocket",       shiprocketRoutes);
app.use("/api/quotations",       quotationRoutes);

app.use("/api/auth",             authRoutes);
app.use("/api/admin/users",      portalUserRoutes);
app.use("/api/orders",           portalOrderRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    require("./scheduler/addressReminderScheduler");
    require("./scheduler/assessmentScheduler");
  })
  .catch((err) => console.error("MongoDB connection error:", err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
