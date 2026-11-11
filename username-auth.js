/* =========================================================
   GGRData — Username Authentication
   Username registration, sign-in and remembered accounts.
   Passwords are never stored.
   ========================================================= */

"use strict";

(() => {
  const SUPABASE_URL =
    "https://jftmbpeopmvtohwvopxo.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_TzO5sjc_KHr1aZBXWpz3eA_fCIxduMx";

  const AUTH_URL =
    `${SUPABASE_URL}/functions/v1/username-auth`;

  const STORAGE_KEY = "ggrdata_remembered_username";

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  const form = document.getElementById("authForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const nameInput = document.getElementById("fullName");
  const phoneInput = document.getElementById("phone");
  const nameField = document.getElementById("nameField");
  const phoneField = document.getElementById("phoneField");
  const loginTab = document.getElementById("loginTab");
  const signupTab = document.getElementById("signupTab");
  const submitButton = document.getElementById("submitBtn");
  const message = document.getElementById("message");
  const forgotButton = document.getElementById("forgotBtn");

  if (!form || !emailInput || !passwordInput) return;

  const emailLabel = emailInput
    .closest(".field")
    ?.querySelector("label");

  // Username field for registration.
  const usernameField = document.createElement("div");
  usernameField.className = "field hidden";

  const usernameLabel = document.createElement("label");
  usernameLabel.textContent = "Choose a username";

  const usernameInput = document.createElement("input");
  usernameInput.type = "text";
  usernameInput.id = "signupUsername";
  usernameInput.name = "username";
  usernameInput.autocomplete = "username";
  usernameInput.minLength = 3;
  usernameInput.maxLength = 20;
  usernameInput.required = true;
  usernameInput.placeholder = "e.g. ggrmember01";

  const usernameHint = document.createElement("small");
  usernameHint.textContent =
    "3–20 characters. Use lowercase letters, numbers or underscores.";

  usernameField.append(
    usernameLabel,
    usernameInput,
    usernameHint
  );

  nameField?.after(usernameField);

  // Remembered account interface.
  const rememberedRow = document.createElement("div");
  rememberedRow.className = "auth-help hidden";

  const rememberedText = document.createElement("p");
  rememberedText.style.fontSize = "12px";
  rememberedText.style.color = "#6f7a73";

  const switchButton = document.createElement("button");
  switchButton.type = "button";
  switchButton.className = "text-button";
  switchButton.textContent = "Use another account";

  rememberedRow.append(rememberedText, switchButton);
  emailInput.closest(".field")?.after(rememberedRow);

  function showMessage(text, isError = false) {
    if (!message) return;

    message.textContent = text;
    message.classList.remove("hidden", "error");

    if (isError) message.classList.add("error");
  }

  function setLoading(loading, text = "Please wait...") {
    if (!submitButton) return;

    if (loading) {
      submitButton.dataset.originalText =
        submitButton.textContent;

      submitButton.textContent = text;
      submitButton.disabled = true;
    } else {
      submitButton.textContent =
        submitButton.dataset.originalText ||
        "Sign In Securely";

      delete submitButton.dataset.originalText;
      submitButton.disabled = false;
    }
  }

  function isSignup() {
    return signupTab?.getAttribute("aria-selected") === "true";
  }

  function rememberedUsername() {
    try {
      return localStorage.getItem(STORAGE_KEY) || "";
    } catch {
      return "";
    }
  }

  function rememberUsername(username) {
    try {
      localStorage.setItem(STORAGE_KEY, username);
    } catch (error) {
      console.warn("Could not remember username:", error);
    }
  }

  function clearRememberedUsername() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  function updateInterface() {
    const signup = isSignup();

    usernameField.classList.toggle("hidden", !signup);

    if (emailLabel) {
      emailLabel.textContent = signup
        ? "Email address"
        : "Username";
    }

    emailInput.type = signup ? "email" : "text";

    emailInput.autocomplete = signup
      ? "email"
      : "username";

    emailInput.placeholder = signup
      ? "you@example.com"
      : "Enter your username";

    usernameInput.required = signup;
    emailInput.readOnly = false;

    if (signup) {
      rememberedRow.classList.add("hidden");
      emailInput.value = "";
      return;
    }

    const saved = rememberedUsername();

    if (saved) {
      emailInput.value = saved;
      emailInput.readOnly = true;

      rememberedText.textContent =
        `Welcome back, ${saved}`;

      rememberedRow.classList.remove("hidden");
    } else {
      rememberedRow.classList.add("hidden");
    }
  }

  async function requestAuth(action, data) {
    const response = await fetch(AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY
      },
      body: JSON.stringify({
        action,
        ...data
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Request failed.");
    }

    return result;
  }

  async function checkUsername(username) {
    const result = await requestAuth("check_username", {
      username
    });

    return result.available === true;
  }

  async function register() {
    const fullName = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const username = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (fullName.length < 2) {
      throw new Error("Enter your full name.");
    }

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      throw new Error(
        "Username must contain 3–20 lowercase letters, numbers or underscores."
      );
    }

    if (!/^[0-9+()\-\s]{10,20}$/.test(phone)) {
      throw new Error("Enter a valid Nigerian phone number.");
    }

    if (password.length < 8) {
      throw new Error(
        "Your password must contain at least 8 characters."
      );
    }

    const available = await checkUsername(username);

    if (!available) {
      throw new Error(
        "That username is already taken. Please choose another."
      );
    }

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          username,
          full_name: fullName,
          phone_e164: phone
        }
      }
    });

    if (error) throw error;

    rememberUsername(username);

    if (data.session) {
      showMessage("Your GGRData account has been created!");
      window.location.reload();
    } else {
      showMessage(
        "Account created! Please confirm your email address before signing in."
      );
    }
  }

  async function signIn() {
    const username = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (!username || !password) {
      throw new Error("Enter your username and password.");
    }

    const result = await requestAuth("sign_in", {
      username,
      password
    });

    const { error } = await client.auth.setSession({
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token
    });

    if (error) throw error;

    rememberUsername(username);

    // Reload so the existing application loads the authenticated session.
    window.location.reload();
  }

  // Capture the form submission before the existing app.js handler.
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    showMessage("");
    setLoading(true, isSignup()
      ? "Creating account..."
      : "Signing in...");

    try {
      if (isSignup()) {
        await register();
      } else {
        await signIn();
      }
    } catch (error) {
      console.error("Username authentication:", error);
      showMessage(error.message, true);
    } finally {
      setLoading(false);
    }
  }, true);

  // Username-based password recovery.
  forgotButton?.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const username = emailInput.value.trim().toLowerCase();

    if (!username) {
      showMessage("Enter your username first.", true);
      emailInput.focus();
      return;
    }

    try {
      const result = await requestAuth("reset_password", {
        username,
        redirectTo: window.location.origin
      });

      showMessage(result.message);
    } catch (error) {
      showMessage(error.message, true);
    }
  }, true);

  switchButton.addEventListener("click", () => {
    clearRememberedUsername();
    emailInput.value = "";
    emailInput.readOnly = false;
    rememberedRow.classList.add("hidden");
    emailInput.focus();
  });

  loginTab?.addEventListener("click", () => {
    setTimeout(updateInterface, 0);
  });

  signupTab?.addEventListener("click", () => {
    setTimeout(updateInterface, 0);
  });

  const observer = new MutationObserver(updateInterface);

  observer.observe(loginTab, {
    attributes: true,
    attributeFilter: ["aria-selected"]
  });

  observer.observe(signupTab, {
    attributes: true,
    attributeFilter: ["aria-selected"]
  });

  updateInterface();
})();
