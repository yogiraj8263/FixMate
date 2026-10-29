
"use strict";

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
require("dotenv").config();

const Booking = require("./models/Booking");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ==================== HELPERS ====================

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function validIndianPhone(phone) {
  const cleaned = phone.replace(/[\s()-]/g, "");
  return /^(?:\+91|91)?[6-9]\d{9}$/.test(cleaned);
}

function createMailer() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    throw new Error("Email settings are not configured in backend/.env");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    }
  });
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function resetCollection() {
  return mongoose.connection.collection("adminpasswordresets");
}

function credentialsCollection() {
  return mongoose.connection.collection("admincredentials");
}

// ==================== HOME ====================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "FixMate backend is running!"
  });
});

// ==================== HEALTH CHECK ====================

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected"
  });
});

// ==================== ADMIN LOGIN ====================

app.post("/api/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL);

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    if (!adminEmail || !JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Admin authentication is not configured."
      });
    }

    const account = await credentialsCollection().findOne({
      _id: "primary"
    });

    if (!account || normalizeEmail(email) !== account.email) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      account.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const token = jwt.sign(
      {
        role: "admin",
        email: account.email
      },
      JWT_SECRET,
      {
        expiresIn: "4h",
        issuer: "fixmate-api",
        audience: "fixmate-admin"
      }
    );

    return res.json({
      success: true,
      message: "Admin login successful.",
      token,
      expiresIn: 14400
    });
  } catch (error) {
    console.error("Admin login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to log in."
    });
  }
});

// ==================== FORGOT PASSWORD ====================

app.post("/api/admin/forgot-password", async (req, res) => {
  // Always return the same public message so the endpoint does not
  // reveal whether an email address is registered.
  const publicMessage =
    "If the admin email is registered, a password reset link will be sent.";

  try {
    const email = normalizeEmail(req.body?.email);
    const configuredEmail = normalizeEmail(process.env.ADMIN_EMAIL);

    if (!email || email.length > 254) {
      return res.status(200).json({
        success: true,
        message: publicMessage
      });
    }

    if (email !== configuredEmail) {
      return res.status(200).json({
        success: true,
        message: publicMessage
      });
    }

    const frontendURL = process.env.FRONTEND_URL;

    if (!frontendURL) {
      throw new Error("FRONTEND_URL is missing in backend/.env");
    }

    // Remove any trailing slash from the configured frontend URL.
    const baseURL = frontendURL.replace(/\/+$/, "");

    // Generate a cryptographically secure, one-time token.
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

    // Invalidate previous outstanding reset links.
    await resetCollection().deleteMany({
      email: configuredEmail
    });

    await resetCollection().insertOne({
      email: configuredEmail,
      tokenHash,
      createdAt: now,
      expiresAt
    });

    const resetURL =
      `${baseURL}/reset-password.html?token=${rawToken}`;

    const mailer = createMailer();

    try {
      await mailer.sendMail({
        from: `"FixMate Security" <${process.env.EMAIL_USER}>`,
        to: configuredEmail,
        subject: "Reset your FixMate admin password",
        text: [
          "A password reset was requested for your FixMate admin account.",
          "",
          `Open this link within 15 minutes: ${resetURL}`,
          "",
          "If you did not request this, ignore this email."
        ].join("\n"),
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#17251d">
            <h2>Reset your FixMate password</h2>
            <p>A password reset was requested for your admin account.</p>
            <p>
              <a href="${resetURL}"
                 style="display:inline-block;padding:13px 20px;background:#183b2e;color:white;text-decoration:none;border-radius:8px">
                Reset password
              </a>
            </p>
            <p>This link expires in 15 minutes and can only be used once.</p>
            <p>If you did not request this, you can ignore this email.</p>
          </div>
        `
      });
    } catch (mailError) {
      await resetCollection().deleteOne({ tokenHash });
      throw mailError;
    }

    return res.status(200).json({
      success: true,
      message: publicMessage
    });
  } catch (error) {
    console.error("Forgot password error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to process the request right now. Please try again later."
    });
  }
});

// ==================== RESET PASSWORD ====================

app.post("/api/admin/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};

    if (
      typeof token !== "string" ||
      !/^[a-f0-9]{64}$/i.test(token) ||
      typeof newPassword !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset link."
      });
    }

    if (newPassword.length < 10 || newPassword.length > 72) {
      return res.status(400).json({
        success: false,
        message: "Password must be between 10 and 72 characters."
      });
    }

    const tokenHash = hashToken(token);
    const now = new Date();

    // Atomically consume the reset token so it cannot be reused.
    const resetRecord = await resetCollection().findOneAndDelete({
      tokenHash,
      expiresAt: { $gt: now }
    });

    // MongoDB driver versions differ in their return shape.
    const reset = resetRecord?.value || resetRecord;

    if (!reset || !reset.email) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset link. Request a new one."
      });
    }

    const configuredEmail = normalizeEmail(process.env.ADMIN_EMAIL);

    if (reset.email !== configuredEmail) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset link."
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    const result = await credentialsCollection().updateOne(
      {
        _id: "primary",
        email: configuredEmail
      },
      {
        $set: {
          passwordHash,
          passwordUpdatedAt: new Date()
        }
      }
    );

    if (result.matchedCount !== 1) {
      return res.status(500).json({
        success: false,
        message: "Unable to update the admin password."
      });
    }

    // Remove any other outstanding reset links for this account.
    await resetCollection().deleteMany({
      email: configuredEmail
    });

    return res.json({
      success: true,
      message: "Password reset successful. Please sign in with your new password."
    });
  } catch (error) {
    console.error("Reset password error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to reset password right now. Please request a new link."
    });
  }
});

// ==================== ADMIN AUTHENTICATION ====================

function requireAdmin(req, res, next) {
  const authorization = req.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token || !JWT_SECRET) {
    return res.status(401).json({
      success: false,
      message: "Admin login required."
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      issuer: "fixmate-api",
      audience: "fixmate-admin"
    });

    if (
      payload.role !== "admin" ||
      payload.email !== normalizeEmail(process.env.ADMIN_EMAIL)
    ) {
      return res.status(403).json({
        success: false,
        message: "Admin access required."
      });
    }

    return next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Session expired or invalid. Please log in again."
    });
  }
}

// ==================== CREATE CUSTOMER BOOKING ====================

app.post("/api/bookings", async (req, res) => {
  try {
    const {
      customerName,
      phone,
      service,
      address,
      details
    } = req.body || {};

    if (
      typeof customerName !== "string" ||
      typeof phone !== "string" ||
      typeof service !== "string" ||
      typeof address !== "string" ||
      !customerName.trim() ||
      !phone.trim() ||
      !service.trim() ||
      !address.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, phone, service and address are required."
      });
    }

    const cleanPhone = phone.replace(/[\s()-]/g, "");

    if (!validIndianPhone(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid Indian mobile number."
      });
    }

    if (
      customerName.trim().length > 100 ||
      address.trim().length > 500 ||
      service.trim().length > 100 ||
      (typeof details === "string" && details.trim().length > 2000)
    ) {
      return res.status(400).json({
        success: false,
        message: "One or more booking fields exceed the allowed length."
      });
    }

    const booking = await Booking.create({
      customerName: customerName.trim(),
      phone: cleanPhone,
      service: service.trim(),
      address: address.trim(),
      details: typeof details === "string" ? details.trim() : ""
    });

    return res.status(201).json({
      success: true,
      message: "FixMate booking saved successfully!",
      bookingId: booking._id,
      status: booking.status
    });
  } catch (error) {
    console.error("Create booking error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to save booking. Please try again."
    });
  }
});

// ==================== GET BOOKINGS (ADMIN ONLY) ====================

app.get("/api/bookings", requireAdmin, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (error) {
    console.error("Fetch bookings error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to load bookings."
    });
  }
});

// ==================== UPDATE BOOKING STATUS ====================

app.patch("/api/bookings/:id/status", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    const allowedStatuses = [
      "Pending",
      "Confirmed",
      "Completed",
      "Cancelled"
    ];

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID."
      });
    }

    if (
      typeof status !== "string" ||
      !allowedStatuses.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking status."
      });
    }

    const booking = await Booking.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true, runValidators: true }
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found."
      });
    }

    return res.json({
      success: true,
      message: "Booking status updated.",
      booking
    });
  } catch (error) {
    console.error("Update status error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update booking status."
    });
  }
});

// ==================== INITIALIZE ADMIN CREDENTIALS ====================

async function initializeAdminCredentials() {
  const email = normalizeEmail(process.env.ADMIN_EMAIL);
  const configuredPassword = process.env.ADMIN_PASSWORD;

  if (!email || !configuredPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required in backend/.env");
  }

  const collection = credentialsCollection();
  const existing = await collection.findOne({ _id: "primary" });

  if (!existing) {
    // On first startup, migrate the configured .env password to a hash.
    const passwordHash = configuredPassword.startsWith("$2")
      ? configuredPassword
      : await bcrypt.hash(configuredPassword, 12);

    await collection.insertOne({
      _id: "primary",
      email,
      passwordHash,
      createdAt: new Date()
    });

    console.log("Initial admin credentials securely initialized.");
  } else if (existing.email !== email) {
    throw new Error(
      "ADMIN_EMAIL does not match the stored admin account. Do not change it without migrating the admin account."
    );
  }
}

// ==================== START SERVER ====================

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI missing in backend/.env");
    }

    if (
      !process.env.ADMIN_EMAIL ||
      !process.env.ADMIN_PASSWORD ||
      !JWT_SECRET ||
      JWT_SECRET.length < 32
    ) {
      throw new Error(
        "Configure ADMIN_EMAIL, ADMIN_PASSWORD and a JWT_SECRET of at least 32 characters in backend/.env"
      );
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully!");

    await initializeAdminCredentials();

    // Expired reset records are automatically cleaned up by MongoDB.
    await resetCollection().createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 }
    );

    app.listen(PORT, () => {
      console.log(`FixMate server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Startup error:", error.message);
    process.exit(1);
  }
}

startServer();
