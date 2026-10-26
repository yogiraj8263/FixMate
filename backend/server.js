
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const Booking = require("./models/Booking");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Home route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "FixMate backend is running!"
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected"
  });
});

// Create a new booking
app.post("/api/bookings", async (req, res) => {
  try {
    const {
      customerName,
      phone,
      service,
      address,
      details
    } = req.body;

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
    console.error("Booking error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to save booking. Please try again."
    });
  }
});

// Get all bookings for the dashboard
app.get("/api/bookings", async (req, res) => {
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

// Update a booking's status
app.patch("/api/bookings/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

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

    if (!allowedStatuses.includes(status)) {
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

// Start server after connecting to MongoDB
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI missing in backend/.env");
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
