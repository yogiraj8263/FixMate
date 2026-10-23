const loginForm = document.querySelector("#loginForm");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const loginMessage = document.querySelector("#loginMessage");
const togglePassword = document.querySelector("#togglePassword");
const accountDialog = document.querySelector("#accountDialog");
const accountForm = document.querySelector("#accountForm");
const accountMessage = document.querySelector("#accountMessage");

document.querySelector("#year").textContent = new Date().getFullYear();

function getAccounts() {
  try {
    return JSON.parse(localStorage.getItem("fixmateAccounts") || "[]");
  } catch {
    return [];
  }
}

togglePassword.addEventListener("click", () => {
  const show = passwordInput.type === "password";
  passwordInput.type = show ? "text" : "password";
  togglePassword.textContent = show ? "Hide" : "Show";
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loginMessage.textContent = "";

  if (!loginForm.reportValidity()) return;

  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  const account = getAccounts().find(
    (item) => item.email === email && item.password === password
  );

  if (!account) {
    loginMessage.textContent =
      "Account not found or password is incorrect. Create an account first, or continue as guest.";
    return;
  }

  sessionStorage.setItem("fixmateUser", JSON.stringify({
    name: account.name,
    email: account.email
  }));

  window.location.href = "frontend/index.html";
});

document.querySelector("#createAccount").addEventListener("click", () => {
  accountMessage.textContent = "";
  accountDialog.showModal();
});

document.querySelector("#closeDialog").addEventListener("click", () => {
  accountDialog.close();
});

accountDialog.addEventListener("click", (event) => {
  if (event.target === accountDialog) accountDialog.close();
});

accountForm.addEventListener("submit", (event) => {
  event.preventDefault();
  accountMessage.textContent = "";

  if (!accountForm.reportValidity()) return;

  const name = document.querySelector("#newName").value.trim();
  const email = document.querySelector("#newEmail").value.trim().toLowerCase();
  const password = document.querySelector("#newPassword").value;

  const accounts = getAccounts();

  if (accounts.some((item) => item.email === email)) {
    accountMessage.textContent = "An account with this email already exists.";
    return;
  }

  accounts.push({ name, email, password });
  localStorage.setItem("fixmateAccounts", JSON.stringify(accounts));

  sessionStorage.setItem("fixmateUser", JSON.stringify({ name, email }));

  accountMessage.style.color = "#23663d";
  accountMessage.textContent = "Account created! Opening FixMate...";

  window.location.href = "frontend/index.html";
});