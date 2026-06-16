const express      = require("express");
const mongoose     = require("mongoose");
const dotenv       = require("dotenv");
const cors         = require("cors");
const path         = require("path");
const session      = require("express-session");
const MongoStore   = require("connect-mongo");

const customerRoutes      = require("./routes/customerRoutes");
const shiprocketRoutes    = require("./routes/shiprocketRoutes");
const whatsappWebhookRoutes = require("./routes/whatsappWebhookRoutes");
const quotationRoutes     = require("./routes/quotationRoutes");
const authRoutes          = require("./routes/authRoutes");
const portalUserRoutes    = require("./routes/portalUserRoutes");
const portalOrderRoutes   = require("./routes/portalOrderRoutes");

dotenv.config();

const app = express();

// ── CORS ─────────────────────────────────────────────────────────
// Must come before session so OPTIONS preflight is handled first.
// Set ALLOWED_ORIGIN in Render env to your GitHub Pages URL.
app.use(cors({
  origin: function (origin, callback) {
    const allowed = process.env.ALLOWED_ORIGIN;
    // Allow requests with no origin (e.g. mobile, Postman) or matching origin
    if (!allowed || allowed === '*' || !origin || origin === allowed) {
      callback(null, origin || '*');
    } else {
      callback(null, allowed);
    }
  },
  credentials: true   // required for cross-origin session cookies
}));

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Session ───────────────────────────────────────────────────────
// sameSite: 'none' + secure: true is required for cross-origin cookies
// (GitHub Pages → Render).
app.use(session({
  secret: process.env.SESSION_SECRET || 'handpikd-change-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'portal_sessions'
  }),
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'none',   // cross-origin
    secure: true        // required when sameSite: 'none'
  }
}));

// ── Static files ──────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "..", "public")));

// ── Routes ───────────────────────────────────────────────────────
app.use("/api/customers",        customerRoutes);
app.use("/api/shiprocket",       shiprocketRoutes);
app.use("/api/whatsapp/webhook", whatsappWebhookRoutes);
app.use("/api/quotations",       quotationRoutes);

// Portal routes
app.use("/api/auth",             authRoutes);
app.use("/api/admin/users",      portalUserRoutes);
app.use("/api/orders",           portalOrderRoutes);

// ── MongoDB + start ───────────────────────────────────────────────
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
