
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const Booking = require("./models/Booking");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

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

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword || !JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Admin authentication is not configured."
      });
    }

    const emailMatches =
      email.trim().toLowerCase() === adminEmail.trim().toLowerCase();

    // Supports a bcrypt password hash or a configured plaintext password.
    const passwordMatches = adminPassword.startsWith("$2")
      ? await bcrypt.compare(password, adminPassword)
      : password === adminPassword;

    if (!emailMatches || !passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const token = jwt.sign(
      {
        role: "admin",
        email: adminEmail.trim().toLowerCase()
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
      payload.email !== process.env.ADMIN_EMAIL?.trim().toLowerCase()
    ) {
      return res.status(403).json({
        success: false,
        message: "Admin access required."
      });
    }

    req.admin = payload;
    return next();
  } catch (error) {
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

    if (!/^(?:\+91)?[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid Indian mobile number."
      });
    }

    if (
      customerName.trim().length > 100 ||
      address.trim().length > 500 ||
      (typeof details === "string" && details.trim().length > 2000) ||
      service.trim().length > 100
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

// ==================== GET ALL BOOKINGS (ADMIN ONLY) ====================
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

// ==================== UPDATE BOOKING STATUS (ADMIN ONLY) ====================
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

    app.listen(PORT, () => {
      console.log(`FixMate server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Startup error:", error.message);
    process.exit(1);
  }
}

startServer();
