
/* =========================================================
   GGRData — Main Application
   Authentication, Password Recovery & User Dashboard
   ========================================================= */

"use strict";

/* ---------------------------------------------------------
   1. SUPABASE CONFIGURATION
   --------------------------------------------------------- */

const SUPABASE_URL = "https://jftmbpeopmvtohwvopxo.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_TzO5sjc_KHr1aZBXWpz3eA_fCIxduMx";

if (!window.supabase) {
  throw new Error(
    "Supabase library not loaded. Check the Supabase CDN script in index.html."
  );
}

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

/* ---------------------------------------------------------
   2. DOM ELEMENTS
   --------------------------------------------------------- */

const elements = {
  authScreen: document.getElementById("authScreen"),
  dashboardScreen: document.getElementById("dashboardScreen"),

  authTitle: document.getElementById("authTitle"),
  authSubtitle: document.getElementById("authSubtitle"),
  authTabs: document.getElementById("authTabs"),

  loginTab: document.getElementById("loginTab"),
  signupTab: document.getElementById("signupTab"),

  authForm: document.getElementById("authForm"),
  nameField: document.getElementById("nameField"),
  fullName: document.getElementById("fullName"),
  phoneField: document.getElementById("phoneField"),
  phone: document.getElementById("phone"),
  email: document.getElementById("email"),
  password: document.getElementById("password"),
  submitBtn: document.getElementById("submitBtn"),

  resetForm: document.getElementById("resetForm"),
  newPassword: document.getElementById("newPassword"),
  confirmPassword: document.getElementById("confirmPassword"),
  resetSubmit: document.getElementById("resetSubmit"),

  forgotRow: document.getElementById("forgotRow"),
  forgotBtn: document.getElementById("forgotBtn"),

  message: document.getElementById("message"),

  welcome: document.getElementById("welcome"),
  logoutBtn: document.getElementById("logoutBtn"),
  balance: document.getElementById("balance"),

  profileName: document.getElementById("profileName"),
  profileEmail: document.getElementById("profileEmail"),
  profilePhone: document.getElementById("profilePhone"),

  dashMessage: document.getElementById("dashMessage")
};

/* ---------------------------------------------------------
   3. APPLICATION STATE
   --------------------------------------------------------- */

let currentMode = "login";
let isPasswordRecovery = false;
let isCompletingPasswordReset = false;
let loadingUserId = null;
let loadedUserId = null;

/* ---------------------------------------------------------
   4. GENERAL HELPERS
   --------------------------------------------------------- */

function showMessage(message, type = "success") {
  if (!elements.message) return;

  elements.message.textContent = message;
  elements.message.classList.remove("hidden", "error");

  if (type === "error") {
    elements.message.classList.add("error");
  }
}

function clearMessage() {
  if (!elements.message) return;

  elements.message.textContent = "";
  elements.message.classList.add("hidden");
  elements.message.classList.remove("error");
}

function showDashboardMessage(message, type = "success") {
  if (!elements.dashMessage) return;

  elements.dashMessage.textContent = message;
  elements.dashMessage.classList.remove("hidden", "error");

  if (type === "error") {
    elements.dashMessage.classList.add("error");
  }
}

function clearDashboardMessage() {
  if (!elements.dashMessage) return;

  elements.dashMessage.textContent = "";
  elements.dashMessage.classList.add("hidden");
  elements.dashMessage.classList.remove("error");
}

function setButtonLoading(button, loading, loadingText = "Please wait...") {
  if (!button) return;

  if (loading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
  } else {
    button.textContent =
      button.dataset.originalText || button.textContent;

    button.disabled = false;
  }
}

function formatNaira(amount) {
  const value = Number(amount);

  if (!Number.isFinite(value)) {
    return "Not available";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function showScreen(screen) {
  if (elements.authScreen) {
    elements.authScreen.classList.toggle(
      "hidden",
      screen !== "auth"
    );
  }

  if (elements.dashboardScreen) {
    elements.dashboardScreen.classList.toggle(
      "hidden",
      screen !== "dashboard"
    );
  }
}

/* ---------------------------------------------------------
   5. NIGERIAN PHONE NUMBER NORMALISATION
   --------------------------------------------------------- */

function normaliseNigerianPhone(input) {
  let digits = String(input || "").replace(/\D/g, "");

  if (digits.startsWith("234")) {
    digits = digits.slice(3);
  } else if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (!/^[789][01]\d{8}$/.test(digits)) {
    return null;
  }

  return "+234" + digits;
}

/* ---------------------------------------------------------
   6. AUTHENTICATION SCREEN MODES
   --------------------------------------------------------- */

function setMode(mode, options = {}) {
  currentMode = mode;

  if (!options.preserveMessage) {
    clearMessage();
  }

  const isSignup = mode === "signup";
  const isReset = mode === "reset";

  if (elements.authTabs) {
    elements.authTabs.classList.toggle("hidden", isReset);
  }

  if (elements.authForm) {
    elements.authForm.classList.toggle("hidden", isReset);
  }

  if (elements.resetForm) {
    elements.resetForm.classList.toggle("hidden", !isReset);
  }

  if (elements.nameField) {
    elements.nameField.classList.toggle(
      "hidden",
      !isSignup
    );
  }

  if (elements.phoneField) {
    elements.phoneField.classList.toggle(
      "hidden",
      !isSignup
    );
  }

  if (elements.forgotRow) {
    elements.forgotRow.classList.toggle(
      "hidden",
      isSignup || isReset
    );
  }

  if (elements.loginTab) {
    elements.loginTab.classList.toggle(
      "active",
      mode === "login"
    );
  }

  if (elements.signupTab) {
    elements.signupTab.classList.toggle(
      "active",
      isSignup
    );
  }

  if (elements.authTitle) {
    elements.authTitle.textContent = isReset
      ? "Create a new password"
      : isSignup
        ? "Create your account"
        : "Welcome back";
  }

  if (elements.authSubtitle) {
    elements.authSubtitle.textContent = isReset
      ? "Choose a new password to secure your GGRData account."
      : isSignup
        ? "Join GGRData and take control of your connections."
        : "Sign in to access your GGRData dashboard.";
  }

  if (elements.submitBtn) {
    elements.submitBtn.textContent = isSignup
      ? "Create My Account"
      : "Sign In Securely";
  }

  if (elements.password) {
    elements.password.autocomplete = isSignup
      ? "new-password"
      : "current-password";
  }
}

function showAuth() {
  isPasswordRecovery = false;
  showScreen("auth");
  setMode("login");
}

/* ---------------------------------------------------------
   7. SIGN IN / CREATE ACCOUNT TABS
   --------------------------------------------------------- */

if (elements.loginTab) {
  elements.loginTab.addEventListener("click", () => {
    setMode("login");
  });
}

if (elements.signupTab) {
  elements.signupTab.addEventListener("click", () => {
    setMode("signup");
  });
}

/* ---------------------------------------------------------
   8. REGISTRATION AND SIGN IN
   --------------------------------------------------------- */

if (elements.authForm) {
  elements.authForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    clearMessage();

    const email = elements.email.value.trim().toLowerCase();
    const password = elements.password.value;

    if (!email || !password) {
      showMessage(
        "Please enter your email address and password.",
        "error"
      );
      return;
    }

    setButtonLoading(
      elements.submitBtn,
      true,
      currentMode === "signup"
        ? "Creating your account..."
        : "Signing you in..."
    );

    try {
      if (currentMode === "signup") {
        await registerUser(email, password);
      } else {
        await loginUser(email, password);
      }
    } catch (error) {
      console.error("Authentication error:", error);

      showMessage(
        getFriendlyAuthError(error),
        "error"
      );
    } finally {
      setButtonLoading(elements.submitBtn, false);
    }
  });
}

async function registerUser(email, password) {
  const fullName = elements.fullName.value.trim();
  const rawPhone = elements.phone.value.trim();

  if (fullName.length < 2) {
    throw new Error("Please enter your full name.");
  }

  if (password.length < 8) {
    throw new Error(
      "Your password must contain at least 8 characters."
    );
  }

  const phoneE164 = normaliseNigerianPhone(rawPhone);

  if (!phoneE164) {
    throw new Error(
      "Enter a valid Nigerian mobile number, for example 08012345678."
    );
  }

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
      data: {
        full_name: fullName,
        phone_e164: phoneE164
      }
    }
  });

  if (error) throw error;

  if (data.session) {
    showMessage(
      "Your account has been created successfully. Welcome to GGRData!"
    );
  } else {
    showMessage(
      "Your account has been created. Please check your email and confirm your address before signing in."
    );
  }
}

async function loginUser(email, password) {
  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
}

/* ---------------------------------------------------------
   9. PASSWORD RECOVERY
   --------------------------------------------------------- */

if (elements.forgotBtn) {
  elements.forgotBtn.addEventListener("click", async () => {
    clearMessage();

    const email = elements.email.value.trim().toLowerCase();

    if (!email) {
      showMessage(
        "Enter your email address first, then select Forgot password.",
        "error"
      );

      elements.email.focus();
      return;
    }

    setButtonLoading(
      elements.forgotBtn,
      true,
      "Sending..."
    );

    try {
      const { error } =
        await supabaseClient.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin
        });

      if (error) throw error;

      showMessage(
        "If an account exists for that email, a password reset link has been sent. Check your inbox."
      );
    } catch (error) {
      console.error("Password recovery error:", error);

      showMessage(
        getFriendlyAuthError(error),
        "error"
      );
    } finally {
      setButtonLoading(elements.forgotBtn, false);
    }
  });
}

/* ---------------------------------------------------------
   10. COMPLETE PASSWORD RESET
   --------------------------------------------------------- */

if (elements.resetForm) {
  elements.resetForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    clearMessage();

    const newPassword = elements.newPassword.value;
    const confirmPassword = elements.confirmPassword.value;

    if (newPassword.length < 8) {
      showMessage(
        "Your new password must contain at least 8 characters.",
        "error"
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage(
        "The passwords do not match. Please check and try again.",
        "error"
      );
      return;
    }

    if (!isPasswordRecovery) {
      showMessage(
        "Your password reset session is not active. Please request a new reset link.",
        "error"
      );
      return;
    }

    setButtonLoading(
      elements.resetSubmit,
      true,
      "Updating password..."
    );

    isCompletingPasswordReset = true;

    try {
      const { error } = await supabaseClient.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      await supabaseClient.auth.signOut();

      isPasswordRecovery = false;

      elements.resetForm.reset();

      setMode("login");

      showMessage(
        "Your password has been updated successfully. You can now sign in with your new password."
      );
    } catch (error) {
      console.error("Password update error:", error);

      showMessage(
        getFriendlyAuthError(error),
        "error"
      );
    } finally {
      isCompletingPasswordReset = false;

      setButtonLoading(
        elements.resetSubmit,
        false
      );
    }
  });
}

/* ---------------------------------------------------------
   11. AUTHENTICATION ERROR MESSAGES
   --------------------------------------------------------- */

function getFriendlyAuthError(error) {
  const message = String(error?.message || "").toLowerCase();

  if (
    message.includes("invalid login credentials") ||
    message.includes("invalid email or password")
  ) {
    return "Incorrect email or password. Please check your details.";
  }

  if (message.includes("user already registered")) {
    return "An account already exists with this email. Please sign in instead.";
  }

  if (message.includes("email not confirmed")) {
    return "Please confirm your email address before signing in.";
  }

  if (message.includes("password should be at least")) {
    return "Your password must contain at least 8 characters.";
  }

  if (
    message.includes("rate limit") ||
    message.includes("too many requests")
  ) {
    return "Too many attempts. Please wait a little and try again.";
  }

  if (
    message.includes("network") ||
    message.includes("fetch")
  ) {
    return "A connection problem occurred. Check your internet and try again.";
  }

  return error?.message || "Something went wrong. Please try again.";
}

/* ---------------------------------------------------------
   12. LOAD USER PROFILE AND WALLET
   --------------------------------------------------------- */

async function loadDashboard(user) {
  if (!user?.id) return;

  if (loadingUserId === user.id) return;

  if (loadedUserId === user.id) {
    showScreen("dashboard");
    return;
  }

  loadingUserId = user.id;

  showScreen("dashboard");
  clearDashboardMessage();

  if (elements.welcome) {
    elements.welcome.textContent = "Welcome to GGRData";
  }

  if (elements.balance) {
    elements.balance.textContent = "Loading...";
  }

  if (elements.profileName) {
    elements.profileName.textContent = "Loading...";
  }

  if (elements.profileEmail) {
    elements.profileEmail.textContent = user.email || "Not available";
  }

  if (elements.profilePhone) {
    elements.profilePhone.textContent = "Loading...";
  }

  try {
    const [profileResult, walletResult] = await Promise.all([
      supabaseClient
        .from("profiles")
        .select("full_name, phone_e164, email")
        .eq("user_id", user.id)
        .maybeSingle(),

      supabaseClient
        .from("wallets")
        .select("balance, currency")
        .eq("user_id", user.id)
        .maybeSingle()
    ]);

    const profile = profileResult.data;
    const wallet = walletResult.data;

    const profileError = profileResult.error;
    const walletError = walletResult.error;

    if (profileError) {
      console.error("Profile loading error:", profileError);
    }

    if (walletError) {
      console.error("Wallet loading error:", walletError);
    }

    const name =
      profile?.full_name ||
      user.user_metadata?.full_name ||
      "GGRData Member";

    if (elements.welcome) {
      elements.welcome.textContent = `Welcome, ${name}`;
    }

    if (elements.profileName) {
      elements.profileName.textContent =
        profileError
          ? "Not available"
          : name;
    }

    if (elements.profileEmail) {
      elements.profileEmail.textContent =
        profile?.email || user.email || "Not available";
    }

    if (elements.profilePhone) {
      elements.profilePhone.textContent =
        profileError
          ? "Not available"
          : profile?.phone_e164 ||
            user.user_metadata?.phone_e164 ||
            "Not provided";
    }

    if (elements.balance) {
      if (
        !walletError &&
        wallet &&
        Number.isFinite(Number(wallet.balance))
      ) {
        elements.balance.textContent = formatNaira(wallet.balance);
      } else {
        elements.balance.textContent = "Not available";
      }
    }

    if (profileError || !profile || walletError || !wallet) {
      showDashboardMessage(
        "Some account information could not be loaded. Please refresh or contact support if the problem continues.",
        "error"
      );
    }

    loadedUserId = user.id;

  } catch (error) {
    console.error("Dashboard loading error:", error);

    if (elements.balance) {
      elements.balance.textContent = "Not available";
    }

    showDashboardMessage(
      "We could not load your account information. Please refresh the page and try again.",
      "error"
    );

  } finally {
    loadingUserId = null;
  }
}

/* ---------------------------------------------------------
   13. SIGN OUT
   --------------------------------------------------------- */

if (elements.logoutBtn) {
  elements.logoutBtn.addEventListener("click", async () => {
    setButtonLoading(
      elements.logoutBtn,
      true,
      "Signing out..."
    );

    try {
      const { error } = await supabaseClient.auth.signOut();

      if (error) throw error;

      loadedUserId = null;
      loadingUserId = null;

      showAuth();

    } catch (error) {
      console.error("Sign out error:", error);

      showDashboardMessage(
        "We could not sign you out. Please try again.",
        "error"
      );
    } finally {
      setButtonLoading(elements.logoutBtn, false);
    }
  });
}

/* ---------------------------------------------------------
   14. SUPABASE AUTH STATE LISTENER
   --------------------------------------------------------- */

supabaseClient.auth.onAuthStateChange((event, session) => {

  if (event === "PASSWORD_RECOVERY") {
    isPasswordRecovery = true;

    showScreen("auth");
    setMode("reset");

    showMessage(
      "Your password reset link is valid. Please choose a new password."
    );

    return;
  }

  if (event === "SIGNED_OUT") {
    loadedUserId = null;
    loadingUserId = null;

    if (!isCompletingPasswordReset) {
      showAuth();
    }

    return;
  }

  if (isCompletingPasswordReset) {
    return;
  }

  if (session?.user) {
    const user = session.user;

    if (
      event === "INITIAL_SESSION" ||
      event === "SIGNED_IN" ||
      event === "USER_UPDATED"
    ) {
      Promise.resolve().then(() => {
        loadDashboard(user);
      });
    }
  } else if (event === "INITIAL_SESSION") {
    showAuth();
  }
});

/* ---------------------------------------------------------
   15. INITIAL APPLICATION STATE
   --------------------------------------------------------- */

async function initialiseApplication() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) throw error;

    if (data.session?.user) {
      await loadDashboard(data.session.user);
    } else if (!isPasswordRecovery) {
      showAuth();
    }

  } catch (error) {
    console.error("Session initialisation error:", error);

    showAuth();

    showMessage(
      "We could not verify your session. Please sign in again.",
      "error"
    );
  }
}

initialiseApplication();

console.log("GGRData application initialised successfully.");
