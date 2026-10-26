
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

document.querySelectorAll("[data-service]").forEach((link) => {
  link.addEventListener("click", () => {
    if (!serviceSelect) return;

    const requestedService = (link.dataset.service || "").toLowerCase();

    const option = [...serviceSelect.options].find(
      (item) =>
        item.value.toLowerCase() === requestedService ||
        item.textContent.trim().toLowerCase() === requestedService
    );

    if (option) serviceSelect.value = option.value;
  });
});

const queryService = new URLSearchParams(
  window.location.search
).get("service");

if (queryService && serviceSelect) {
  const option = [...serviceSelect.options].find(
    (item) =>
      item.value.toLowerCase() === queryService.toLowerCase() ||
      item.textContent.trim().toLowerCase() === queryService.toLowerCase()
  );

  if (option) serviceSelect.value = option.value;
}

// =====================================
// FIXMATE - WHATSAPP BOOKING
// =====================================

// Replace this placeholder with your WhatsApp number.
// Use country code + number, digits only.
// Example format for India: 919876543210
const FIXMATE_WHATSAPP_NUMBER = "918263952283";

const bookingForm = document.querySelector("#bookingForm");
const formMessage = document.querySelector("#formMessage");

if (bookingForm) {
  bookingForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!bookingForm.reportValidity()) return;

    const formData = new FormData(bookingForm);

    const customerName = String(
      formData.get("customerName") || ""
    ).trim();

    const phone = String(
      formData.get("phone") || ""
    ).trim();

    const service = String(
      formData.get("service") || ""
    ).trim();

    const address = String(
      formData.get("address") || ""
    ).trim();

    const details = String(
      formData.get("details") || ""
    ).trim();

    const showMessage = (message, color = "#183b2e") => {
      if (formMessage) {
        formMessage.textContent = message;
        formMessage.style.color = color;
      }
    };

    if (!customerName || !phone || !service || !address) {
      showMessage("Please fill in all required fields.", "#b42318");
      return;
    }

    const normalizedPhone = phone.replace(/[\s()-]/g, "");

    if (!/^(?:\+91)?[6-9]\d{9}$/.test(normalizedPhone)) {
      showMessage(
        "Please enter a valid 10-digit Indian mobile number.",
        "#b42318"
      );

      document.querySelector("#phone")?.focus();
      return;
    }

    if (!/^91\d{10}$/.test(FIXMATE_WHATSAPP_NUMBER)) {
      showMessage(
        "WhatsApp booking is not configured yet. Please set the FixMate WhatsApp number in script.js.",
        "#b42318"
      );
      return;
    }

    const message = [
      "Hello FixMate! I would like to request a home service.",
      "",
      `Name: ${customerName}`,
      `Customer phone: ${normalizedPhone}`,
      `Service: ${service}`,
      `Address: ${address}`,
      `Issue details: ${details || "Not provided"}`,
      "",
      "Please contact me to confirm availability and pricing."
    ].join("\n");

    const whatsappURL =
      `https://wa.me/${FIXMATE_WHATSAPP_NUMBER}` +
      `?text=${encodeURIComponent(message)}`;

    showMessage(
      "Opening WhatsApp with your booking details. Please review and send the message to complete your request."
    );

    window.open(whatsappURL, "_blank", "noopener,noreferrer");
  });
}

// =====================================
// FIXMATE - CURRENT YEAR
// =====================================

const currentYear = document.querySelector("#currentYear");

if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}
