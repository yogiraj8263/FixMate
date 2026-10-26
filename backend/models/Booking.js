
const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    service: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    details: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: ""
    },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Completed", "Cancelled"],
      default: "Pending"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
