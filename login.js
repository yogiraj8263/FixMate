
"use strict";

const loginForm = document.querySelector("#loginForm");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const loginMessage = document.querySelector("#loginMessage");
const togglePassword = document.querySelector("#togglePassword");
const accountDialog = document.querySelector("#accountDialog");
const accountForm = document.querySelector("#accountForm");
const accountMessage = document.querySelector("#accountMessage");

const yearElement = document.querySelector("#year");
if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

function getAccounts() {
  try {
    const accounts = JSON.parse(
      localStorage.getItem("fixmateAccounts") || "[]"
    );
    return Array.isArray(accounts) ? accounts : [];
  } catch {
    return [];
  }
}

function showMessage(element, message, success = false) {
  if (!element) return;
  element.textContent = message;
  element.style.color = success ? "#23663d" : "#b42318";
}

// Show / hide password
if (togglePassword && passwordInput) {
  togglePassword.addEventListener("click", () => {
    const show = passwordInput.type === "password";
    passwordInput.type = show ? "text" : "password";
    togglePassword.textContent = show ? "Hide" : "Show";
  });
}

// Login
if (loginForm) {
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    showMessage(loginMessage, "");

    if (!loginForm.reportValidity()) return;

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    const account = getAccounts().find(
      (item) =>
        item.email?.trim().toLowerCase() === email &&
        item.password === password
    );

    if (!account) {
      showMessage(
        loginMessage,
        "Account not found or password is incorrect. Create an account first, or continue as guest."
      );
      return;
    }

    sessionStorage.setItem(
      "fixmateUser",
      JSON.stringify({
        name: account.name,
        email: account.email
      })
    );

    window.location.href = "frontend/index.html";
  });
}

// Forgot password — local development only
const forgotPasswordButton = document.querySelector("#forgotPassword");

if (forgotPasswordButton) {
  forgotPasswordButton.addEventListener("click", () => {
    const email = emailInput.value.trim().toLowerCase();

    if (!email) {
      showMessage(loginMessage, "Enter your registered email address first.");
      emailInput.focus();
      return;
    }

    const accounts = getAccounts();
    const accountIndex = accounts.findIndex(
      (item) => item.email?.trim().toLowerCase() === email
    );

    if (accountIndex === -1) {
      showMessage(
        loginMessage,
        "No local account found for this email. Please create an account first."
      );
      return;
    }

    const newPassword = window.prompt(
      "LOCAL TEST ONLY: Enter a new password (at least 8 characters). For a real website, use secure email verification."
    );

    if (newPassword === null) return;

    if (newPassword.length < 8) {
      showMessage(loginMessage, "Password must contain at least 8 characters.");
      return;
    }

    accounts[accountIndex].password = newPassword;
    localStorage.setItem("fixmateAccounts", JSON.stringify(accounts));

    passwordInput.value = "";
    showMessage(
      loginMessage,
      "Password updated for this browser. You can now sign in.",
      true
    );
  });
}

// Open account creation dialog
const createAccountButton = document.querySelector("#createAccount");

if (createAccountButton && accountDialog) {
  createAccountButton.addEventListener("click", () => {
    showMessage(accountMessage, "");
    accountDialog.showModal();
  });
}

const closeDialogButton = document.querySelector("#closeDialog");

if (closeDialogButton && accountDialog) {
  closeDialogButton.addEventListener("click", () => {
    accountDialog.close();
  });

  accountDialog.addEventListener("click", (event) => {
    if (event.target === accountDialog) {
      accountDialog.close();
    }
  });
}

// Create account
if (accountForm) {
  accountForm.addEventListener("submit", (event) => {
    event.preventDefault();
    showMessage(accountMessage, "");

    if (!accountForm.reportValidity()) return;

    const name = document.querySelector("#newName").value.trim();
    const email = document.querySelector("#newEmail").value.trim().toLowerCase();
    const password = document.querySelector("#newPassword").value;

    if (password.length < 8) {
      showMessage(accountMessage, "Password must contain at least 8 characters.");
      return;
    }

    const accounts = getAccounts();

    if (accounts.some((item) => item.email?.trim().toLowerCase() === email)) {
      showMessage(accountMessage, "An account with this email already exists.");
      return;
    }

    accounts.push({ name, email, password });
    localStorage.setItem("fixmateAccounts", JSON.stringify(accounts));

    sessionStorage.setItem("fixmateUser", JSON.stringify({ name, email }));

    showMessage(accountMessage, "Account created! Opening FixMate...", true);
    window.location.href = "frontend/index.html";
  });
}
