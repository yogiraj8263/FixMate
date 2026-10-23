
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


// FIXMATE - SERVICE SELECTION


const serviceSelect = document.querySelector("#service");

document.querySelectorAll("[data-service]").forEach((link) => {
  link.addEventListener("click", () => {
    if (serviceSelect) {
      const requestedService = link.dataset.service;

      const matchingOption = [...serviceSelect.options].find(
        (option) =>
          option.value.toLowerCase() === requestedService.toLowerCase() ||
          option.textContent.trim().toLowerCase() ===
            requestedService.toLowerCase()
      );

      if (matchingOption) {
        serviceSelect.value = matchingOption.value;
      }
    }
  });
});

// Select a service from URL, for example:
// index.html?service=Plumbing#booking

const queryService = new URLSearchParams(window.location.search).get("service");

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


// FIXMATE - BOOKING FORM


const bookingForm = document.querySelector("#bookingForm");
const formMessage = document.querySelector("#formMessage");

if (bookingForm) {
  bookingForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!bookingForm.reportValidity()) {
      return;
    }

    const formData = new FormData(bookingForm);

    const customerName = String(
      formData.get("customerName") || ""
    ).trim();

    const phone = String(formData.get("phone") || "").trim();

    const service = String(formData.get("service") || "").trim();

    const address = String(formData.get("address") || "").trim();

    const details = String(formData.get("details") || "").trim();

    if (!customerName || !phone || !service || !address) {
      if (formMessage) {
        formMessage.textContent =
          "Please fill in all required fields.";

        formMessage.style.color = "#b42318";
      }

      return;
    }

    // Basic phone-number validation for India.
    const normalizedPhone = phone.replace(/[\s()-]/g, "");

    if (!/^(?:\+91)?[6-9]\d{9}$/.test(normalizedPhone)) {
      if (formMessage) {
        formMessage.textContent =
          "Please enter a valid 10-digit Indian mobile number.";

        formMessage.style.color = "#b42318";
      }

      document.querySelector("#phone")?.focus();
      return;
    }

    // Prevent duplicate clicks while displaying the result.
    const submitButton = bookingForm.querySelector(
      'button[type="submit"]'
    );

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.style.opacity = "0.7";
      submitButton.style.cursor = "wait";
    }

    if (formMessage) {
      formMessage.textContent =
        `Thank you, ${customerName}! Your details are ready, but online booking is not connected to the server yet.`;

      formMessage.style.color = "#183b2e";
    }

    // Keep the entered details available for future backend integration.
    const bookingRequest = {
      customerName,
      phone,
      service,
      address,
      details,
      createdAt: new Date().toISOString()
    };

    console.log("FixMate booking form validated:", bookingRequest);

    // No server request is sent by this code yet.
    // Re-enable the button so the user can submit again if needed.
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.style.opacity = "";
      submitButton.style.cursor = "";
    }
  });
}

// ===============================
// FIXMATE - CURRENT YEAR
// ===============================

const currentYear = document.querySelector("#currentYear");

if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}
