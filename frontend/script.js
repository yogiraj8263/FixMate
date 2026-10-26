
// ===============================
// FIXMATE - MOBILE NAVIGATION
// ===============================

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

// ===============================
// FIXMATE - SERVICE SELECTION
// ===============================

const serviceSelect = document.querySelector("#service");

document.querySelectorAll("[data-service]").forEach((link) => {
  link.addEventListener("click", () => {
    if (!serviceSelect) return;

    const requestedService = link.dataset.service.toLowerCase();

    const matchingOption = [...serviceSelect.options].find(
      (option) =>
        option.value.toLowerCase() === requestedService ||
        option.textContent.trim().toLowerCase() === requestedService
    );

    if (matchingOption) {
      serviceSelect.value = matchingOption.value;
    }
  });
});

// Example: index.html?service=Plumbing#booking

const queryService = new URLSearchParams(
  window.location.search
).get("service");

if (queryService && serviceSelect) {
  const matchingOption = [...serviceSelect.options].find(
    (option) =>
      option.value.toLowerCase() === queryService.toLowerCase() ||
      option.textContent.trim().toLowerCase() === queryService.toLowerCase()
  );

  if (matchingOption) {
    serviceSelect.value = matchingOption.value;
  }
}

// ===============================
// FIXMATE - BOOKING FORM
// ===============================

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

    const showMessage = (message, color) => {
      if (!formMessage) return;
      formMessage.textContent = message;
      formMessage.style.color = color;
    };

    if (!customerName || !phone || !service || !address) {
      showMessage("Please fill in all required fields.", "#b42318");
      return;
    }

    // Indian mobile number validation.
    const normalizedPhone = phone.replace(/[\s()-]/g, "");

    if (!/^(?:\+91)?[6-9]\d{9}$/.test(normalizedPhone)) {
      showMessage(
        "Please enter a valid 10-digit Indian mobile number.",
        "#b42318"
      );

      document.querySelector("#phone")?.focus();
      return;
    }

    const bookingRequest = {
      customerName,
      phone: normalizedPhone,
      service,
      address,
      details,
      createdAt: new Date().toISOString()
    };

    console.log("FixMate booking request:", bookingRequest);

    // Booking is validated, but is not yet saved to a server.
    showMessage(
      `Thank you, ${customerName}! Your details are valid. Online booking is not connected yet.`,
      "#183b2e"
    );
  });
}

// ===============================
// FIXMATE - CURRENT YEAR
// ===============================

const currentYear = document.querySelector("#currentYear");

if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}
