
"use strict";

// =====================================
// FIXMATE - MOBILE NAVIGATION
// =====================================

const menuToggle = document.querySelector("#menuToggle");
const navigation = document.querySelector("#navigation");

if (menuToggle && navigation) {
  menuToggle.addEventListener("click", () => {
    const isOpen = navigation.classList.toggle("open");

    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute(
      "aria-label",
      isOpen ? "Close navigation" : "Open navigation"
    );
  });

  navigation.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navigation.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation");
    });
  });

  document.addEventListener("click", (event) => {
    if (
      !navigation.contains(event.target) &&
      !menuToggle.contains(event.target)
    ) {
      navigation.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation");
    }
  });
}

// =====================================
// FIXMATE - SERVICE SELECTION
// =====================================

const serviceSelect = document.querySelector("#service");

function selectService(requestedService) {
  if (!serviceSelect || !requestedService) return;

  const requested = requestedService.trim().toLowerCase();

  const option = [...serviceSelect.options].find(
    (item) =>
      item.value.trim().toLowerCase() === requested ||
      item.textContent.trim().toLowerCase() === requested
  );

  if (option) serviceSelect.value = option.value;
}

document.querySelectorAll("[data-service]").forEach((link) => {
  link.addEventListener("click", () => {
    selectService(link.dataset.service);
  });
});

const queryService = new URLSearchParams(
  window.location.search
).get("service");

if (queryService) {
  selectService(queryService);
}

// =====================================
// FIXMATE - BOOKING CONFIGURATION
// =====================================

// India country code + mobile number, digits only.
const FIXMATE_WHATSAPP_NUMBER = "918263952283";

// Local backend address for development.
// Keep the Node.js backend running while testing.
const FIXMATE_API_URL = "http://localhost:5000/api/bookings";

const bookingForm = document.querySelector("#bookingForm");
const formMessage = document.querySelector("#formMessage");

function showBookingMessage(message, color = "#183b2e") {
  if (formMessage) {
    formMessage.textContent = message;
    formMessage.style.color = color;
  }
}

// =====================================
// FIXMATE - SAVE BOOKING + WHATSAPP
// =====================================

if (bookingForm) {
  bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!bookingForm.reportValidity()) return;

    const submitButton = bookingForm.querySelector(
      'button[type="submit"], input[type="submit"]'
    );

    const formData = new FormData(bookingForm);

    const booking = {
      customerName: String(
        formData.get("customerName") || ""
      ).trim(),

      phone: String(formData.get("phone") || "").trim(),

      service: String(formData.get("service") || "").trim(),

      address: String(formData.get("address") || "").trim(),

      details: String(formData.get("details") || "").trim()
    };

    if (
      !booking.customerName ||
      !booking.phone ||
      !booking.service ||
      !booking.address
    ) {
      showBookingMessage(
        "Please fill in all required fields.",
        "#b42318"
      );
      return;
    }

    const normalizedPhone = booking.phone.replace(/[\s()-]/g, "");

    if (!/^(?:\+91)?[6-9]\d{9}$/.test(normalizedPhone)) {
      showBookingMessage(
        "Please enter a valid 10-digit Indian mobile number.",
        "#b42318"
      );

      document.querySelector("#phone")?.focus();
      return;
    }

    if (!/^91[6-9][0-9]{9}$/.test(FIXMATE_WHATSAPP_NUMBER)) {
      showBookingMessage(
        "Please configure the FixMate WhatsApp number in script.js.",
        "#b42318"
      );
      return;
    }

    booking.phone = normalizedPhone;

    if (submitButton) submitButton.disabled = true;

    showBookingMessage("Submitting your booking securely...");

    try {
      // First, save the booking to MongoDB through the backend.
      const response = await fetch(FIXMATE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(booking)
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Could not save your booking."
        );
      }

      // Only open WhatsApp after the backend confirms the save.
      const whatsappMessage = [
        "Hello FixMate! I have submitted a home service booking.",
        "",
        `Booking ID: ${result.bookingId || "Submitted"}`,
        `Name: ${booking.customerName}`,
        `Customer phone: ${booking.phone}`,
        `Service: ${booking.service}`,
        `Address: ${booking.address}`,
        `Issue details: ${booking.details || "Not provided"}`,
        "",
        "Please contact me to confirm availability and pricing."
      ].join("\n");

      const whatsappURL =
        `https://wa.me/${FIXMATE_WHATSAPP_NUMBER}` +
        `?text=${encodeURIComponent(whatsappMessage)}`;

      showBookingMessage(
        "Booking saved successfully! Opening WhatsApp. Please review and send the message to complete your WhatsApp request."
      );

      window.open(
        whatsappURL,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (error) {
      console.error("FixMate booking error:", error);

      showBookingMessage(
        error.message.includes("Failed to fetch")
          ? "Cannot connect to FixMate server. Make sure MongoDB is connected and the backend is running on port 5000."
          : error.message,
        "#b42318"
      );
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}


// FIXMATE - CURRENT YEAR


const currentYear = document.querySelector("#currentYear");

if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}
