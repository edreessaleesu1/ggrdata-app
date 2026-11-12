/* =========================================================
   GGRData — Main Application
   Authentication, Dashboard, Wallet, Transactions & QuickBuy
   Supported networks: MTN, Airtel and Glo
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
   2. DATA CATALOGUE CONFIGURATION
   --------------------------------------------------------- */

const DATA_CATALOGUE_URL =
  `${SUPABASE_URL}/functions/v1/vtpass-catalogue`;

const SUPPORTED_DATA_NETWORKS = {
  mtn: "MTN",
  airtel: "Airtel",
  glo: "Glo"
};

const RECENT_BENEFICIARY_KEY = "ggrdata_recent_beneficiary_v1";

const DATA_CATEGORIES = {
  standard: "Standard Data",
  sme: "SME",
  sme2: "SME2",
  corporate: "Corporate",
  gifting: "Gifting",
  coupons: "Data Coupons",
  share: "Data Share"
};

/*
 * The current VTpass catalogue integration provides standard
 * data plans. Other categories remain unavailable until their
 * provider service IDs and purchase rules are verified.
 */
const AVAILABLE_DATA_CATEGORIES = ["standard"];

/* ---------------------------------------------------------
   3. DOM ELEMENTS
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

  toggleBalance: document.getElementById("toggleBalance"),
  bottomNavigation: document.getElementById("bottomNavigation"),
  recentTransactions: document.getElementById("recentTransactions"),

  dataStoreView: document.getElementById("dataStoreView"),
  dataCatalogueStatus: document.getElementById("dataCatalogueStatus"),
  dataPlans: document.getElementById("dataPlans"),
  refreshDataCatalogue: document.getElementById("refreshDataCatalogue"),
  backToHomeFromData: document.getElementById("backToHomeFromData"),

  /* GGR QuickBuy elements */
  quickbuyBalance: document.getElementById("quickbuyBalance"),
  dataPhone: document.getElementById("dataPhone"),
  detectedNetwork: document.getElementById("detectedNetwork"),
  useRecentBeneficiary: document.getElementById("useRecentBeneficiary"),
  recentBeneficiaryNumber: document.getElementById("recentBeneficiaryNumber"),
  dataTypeSelect: document.getElementById("dataTypeSelect"),

  finderResults: document.getElementById("finderResults"),
  homeRecentNumber: document.getElementById("homeRecentNumber"),

  /* Airtime screen */
  airtimePhone: document.getElementById("airtimePhone"),
  airtimeDetected: document.getElementById("airtimeDetected"),
  airtimeRecent: document.getElementById("airtimeRecent"),
  airtimeRecentNumber: document.getElementById("airtimeRecentNumber"),

  dashMessage: document.getElementById("dashMessage")
};

/* ---------------------------------------------------------
   4. APPLICATION STATE
   --------------------------------------------------------- */

let currentMode = "login";
let isPasswordRecovery = false;
let isCompletingPasswordReset = false;

let loadingUserId = null;
let loadedUserId = null;
let dashMessageTimer = null;

let balanceHidden = false;
let lastBalanceText = "";

let selectedDataNetwork = "mtn";
let selectedDataCategory = "standard";

/*
 * Keep track of a customer's manual network choice.
 * Automatic detection must not override that choice
 * while the same phone number remains in the field.
 */
let manuallySelectedNetworkForPhone = null;

let catalogueRequestNumber = 0;
let currentWalletBalance = null;
let lastPlans = [];
let finderBudget = null;
let finderNeed = null;
let airtimeManualForPhone = null;

/* ---------------------------------------------------------
   5. GENERAL HELPERS
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

function showDashboardMessage(message, type = "success", autoHide = false) {
  if (!elements.dashMessage) return;

  clearTimeout(dashMessageTimer);

  elements.dashMessage.textContent = message;
  elements.dashMessage.classList.remove("hidden", "error");

  if (type === "error") {
    elements.dashMessage.classList.add("error");
  }

  if (autoHide) {
    dashMessageTimer = setTimeout(clearDashboardMessage, 4500);
  }
}

function clearDashboardMessage() {
  if (!elements.dashMessage) return;

  clearTimeout(dashMessageTimer);

  elements.dashMessage.textContent = "";
  elements.dashMessage.classList.add("hidden");
  elements.dashMessage.classList.remove("error");
}

function setButtonLoading(button, loading, loadingText = "Please wait...") {
  if (!button) return;

  if (loading) {
    if (!button.dataset.originalText) {
      button.dataset.originalText = button.textContent;
    }

    button.textContent = loadingText;
    button.disabled = true;
  } else {
    button.textContent =
      button.dataset.originalText || button.textContent;

    delete button.dataset.originalText;
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

function formatDateTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
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

  if (elements.bottomNavigation) {
    elements.bottomNavigation.classList.toggle(
      "hidden",
      screen !== "dashboard"
    );
  }

  if (elements.dashMessage) {
    elements.dashMessage.classList.add("toast");
  }

  window.scrollTo(0, 0);
}

/* ---------------------------------------------------------
   6. NIGERIAN PHONE NUMBER HELPERS
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

function getLocalPhoneDigits(input) {
  const normalised = normaliseNigerianPhone(input);

  if (!normalised) return null;

  return normalised.replace("+234", "0");
}

/*
 * Only MTN, Airtel and Glo are supported.
 *
 * Prefix detection is an estimate, not proof of the
 * customer's current network. Number portability means
 * customers must be able to override the suggestion.
 */

function detectNigerianNetwork(input) {
  const localNumber = getLocalPhoneDigits(input);

  if (!localNumber) return null;

  const prefixes = {
    mtn: [
      "0803", "0806", "0810", "0813",
      "0814", "0816", "0903", "0906",
      "0913", "0916", "0703", "0706",
      "0704", "07025", "07026"
    ],

    airtel: [
      "0802", "0808", "0812", "0701",
      "0708", "0901", "0902", "0907",
      "0912", "0904"
    ],

    glo: [
      "0805", "0807", "0811", "0815",
      "0905", "0915", "0705"
    ]
  };

  for (const [network, networkPrefixes] of Object.entries(prefixes)) {
    const matched = networkPrefixes.some((prefix) =>
      localNumber.startsWith(prefix)
    );

    if (matched) {
      return network;
    }
  }

  return null;
}

/* ---------------------------------------------------------
   7. AUTHENTICATION SCREEN MODES
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
    elements.nameField.classList.toggle("hidden", !isSignup);
  }

  if (elements.phoneField) {
    elements.phoneField.classList.toggle("hidden", !isSignup);
  }

  if (elements.forgotRow) {
    elements.forgotRow.classList.toggle("hidden", isSignup || isReset);
  }

  if (elements.loginTab) {
    elements.loginTab.classList.toggle("active", mode === "login");
    elements.loginTab.setAttribute(
      "aria-selected",
      String(mode === "login")
    );
  }

  if (elements.signupTab) {
    elements.signupTab.classList.toggle("active", isSignup);
    elements.signupTab.setAttribute(
      "aria-selected",
      String(isSignup)
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
   8. SIGN IN / CREATE ACCOUNT TABS
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
   9. REGISTRATION AND SIGN IN
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
   10. PASSWORD RECOVERY
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

    setButtonLoading(elements.forgotBtn, true, "Sending...");

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
   11. COMPLETE PASSWORD RESET
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

    setButtonLoading(elements.resetSubmit, true, "Updating password...");

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

      setButtonLoading(elements.resetSubmit, false);
    }
  });
}

/* ---------------------------------------------------------
   12. AUTHENTICATION ERROR MESSAGES
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

  if (message.includes("database error saving new user")) {
    return "We could not create your account just now. Please check your details and try again.";
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
   13. DASHBOARD NAVIGATION
   --------------------------------------------------------- */

const TAB_VIEW_IDS = {
  transactions: "transactionsView",
  wallet: "walletView",
  profile: "profileView",
  "data-store": "dataStoreView",
  airtime: "airtimeView"
};

function showTab(tabName) {
  const isHome = tabName === "home";

  if (!elements.dashboardScreen) return;

  Array.from(elements.dashboardScreen.children).forEach((section) => {
    if (section.id === "dashMessage") return;

    if (section.classList.contains("dashboard-view")) {
      section.classList.toggle(
        "active",
        section.id === TAB_VIEW_IDS[tabName]
      );
    } else {
      section.classList.toggle("hidden", !isHome);
    }
  });

  document.querySelectorAll(".bottom-navigation .nav-item").forEach((item) => {
    const navTab =
      tabName === "data-store" || tabName === "airtime" ? "home" : tabName;

    item.classList.toggle("active", item.dataset.tab === navTab);
  });

  clearDashboardMessage();
  window.scrollTo(0, 0);

  if (tabName === "data-store") {
    updateQuickBuyBalance();
    updateRecentBeneficiaryDisplay();
  }
}

/* ---------------------------------------------------------
   14. BALANCE VISIBILITY
   --------------------------------------------------------- */

function applyBalanceVisibility() {
  if (!elements.balance || !lastBalanceText) return;

  elements.balance.textContent = balanceHidden
    ? "₦ ••••••"
    : lastBalanceText;

  if (elements.toggleBalance) {
    elements.toggleBalance.setAttribute(
      "aria-label",
      balanceHidden ? "Show balance" : "Hide balance"
    );
  }

  updateQuickBuyBalance();
}

function updateQuickBuyBalance() {
  if (!elements.quickbuyBalance) return;

  if (balanceHidden) {
    elements.quickbuyBalance.textContent = "₦ ••••••";
    return;
  }

  elements.quickbuyBalance.textContent =
    lastBalanceText || "Not available";
}

/* ---------------------------------------------------------
   15. GGR QUICKBUY — BENEFICIARY AND NETWORK
   --------------------------------------------------------- */

function updateDetectedNetworkDisplay(network) {
  if (!elements.detectedNetwork) return;

  if (!network) {
    elements.detectedNetwork.textContent =
      "Enter a valid number to detect network";

    return;
  }

  elements.detectedNetwork.textContent =
    `${SUPPORTED_DATA_NETWORKS[network]} detected — you can change this manually.`;
}

function handleBeneficiaryInput() {
  if (!elements.dataPhone) return;

  const value = elements.dataPhone.value.trim();
  const normalised = normaliseNigerianPhone(value);

  /*
   * If the phone number changes from the number for which
   * a manual override was made, allow automatic detection
   * to suggest a network for the new number.
   */
  if (normalised !== manuallySelectedNetworkForPhone) {
    manuallySelectedNetworkForPhone = null;
  }

  if (!normalised) {
    updateDetectedNetworkDisplay(null);
    return;
  }

  const detected = detectNigerianNetwork(value);

  if (!detected) {
    updateDetectedNetworkDisplay(null);
    return;
  }

  updateDetectedNetworkDisplay(detected);

  /*
   * Do not override a manual network choice for the
   * same beneficiary phone number.
   */
  if (!manuallySelectedNetworkForPhone) {
    setSelectedDataNetwork(detected);
  }
}

function saveRecentBeneficiary(phone) {
  const normalised = normaliseNigerianPhone(phone);

  if (!normalised) return;

  try {
    localStorage.setItem(
      RECENT_BENEFICIARY_KEY,
      JSON.stringify({
        phone: normalised,
        savedAt: new Date().toISOString()
      })
    );
  } catch (error) {
    console.warn("Could not save recent beneficiary:", error);
  }

  updateRecentBeneficiaryDisplay();
}

function getRecentBeneficiary() {
  try {
    const saved = localStorage.getItem(RECENT_BENEFICIARY_KEY);

    if (!saved) return null;

    const parsed = JSON.parse(saved);

    return normaliseNigerianPhone(parsed.phone)
      ? parsed.phone
      : null;
  } catch (error) {
    console.warn("Could not read recent beneficiary:", error);
    return null;
  }
}

function updateRecentBeneficiaryDisplay() {
  const recent = getRecentBeneficiary();

  const pairs = [
    [elements.useRecentBeneficiary, elements.recentBeneficiaryNumber],
    [elements.airtimeRecent, elements.airtimeRecentNumber]
  ];

  pairs.forEach(([button, label]) => {
    if (label) label.textContent = recent || "No recent beneficiary";
    if (button) button.classList.toggle("hidden", !recent);
  });

  if (elements.homeRecentNumber) {
    elements.homeRecentNumber.textContent = recent || "none yet";
  }
}

if (elements.dataPhone) {
  elements.dataPhone.addEventListener("input", handleBeneficiaryInput);

  elements.dataPhone.addEventListener("blur", () => {
    const normalised = normaliseNigerianPhone(
      elements.dataPhone.value
    );

    if (normalised) {
      elements.dataPhone.value = normalised;
      saveRecentBeneficiary(normalised);
    }
  });
}

if (elements.useRecentBeneficiary) {
  elements.useRecentBeneficiary.addEventListener("click", () => {
    const recent = getRecentBeneficiary();

    if (!recent || !elements.dataPhone) return;

    elements.dataPhone.value = recent;

    /*
     * A different beneficiary should get a fresh
     * automatic network suggestion.
     */
    manuallySelectedNetworkForPhone = null;

    handleBeneficiaryInput();
  });
}

/* ---------------------------------------------------------
   16. DATA CATEGORY SELECTOR
   --------------------------------------------------------- */

function handleDataCategoryChange() {
  if (!elements.dataTypeSelect) return;

  const category = elements.dataTypeSelect.value;

  if (!DATA_CATEGORIES[category]) return;

  selectedDataCategory = category;

  if (!AVAILABLE_DATA_CATEGORIES.includes(category)) {
    clearDataPlans();

    setCatalogueStatus(
      `${DATA_CATEGORIES[category]} is not yet available through our current VTpass integration. Standard data plans are available now.`,
      "empty"
    );

    return;
  }

  loadDataCatalogue(selectedDataNetwork);
}

if (elements.dataTypeSelect) {
  elements.dataTypeSelect.addEventListener(
    "change",
    handleDataCategoryChange
  );
}

/* ---------------------------------------------------------
   17. DATA CATALOGUE
   --------------------------------------------------------- */

function setCatalogueStatus(message, type = "info") {
  if (!elements.dataCatalogueStatus) return;

  elements.dataCatalogueStatus.textContent = message;

  elements.dataCatalogueStatus.className =
    `data-catalogue-status ${type}`;
}

function setSelectedDataNetwork(network) {
  if (!SUPPORTED_DATA_NETWORKS[network]) return;

  selectedDataNetwork = network;

  document.querySelectorAll("[data-catalogue-network]").forEach((button) => {
    const isSelected = button.dataset.catalogueNetwork === network;

    button.classList.toggle("active", isSelected);

    button.setAttribute(
      "aria-pressed",
      String(isSelected)
    );
  });
}

function clearDataPlans() {
  if (elements.dataPlans) {
    elements.dataPlans.replaceChildren();
  }
}

function renderDataPlans(plans, networkName) {
  if (!elements.dataPlans) return;

  clearDataPlans();

  lastPlans = Array.isArray(plans) ? plans : [];

  if (elements.finderResults) elements.finderResults.replaceChildren();

  if (!Array.isArray(plans) || plans.length === 0) {
    setCatalogueStatus(
      `No data plans are currently available for ${networkName}. Please try again later.`,
      "empty"
    );
    return;
  }

  const fragment = document.createDocumentFragment();

  plans.forEach((plan) => {
    if (!plan) return;

    const amount = Number(plan.amount);

    if (
      !plan.name ||
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      return;
    }

    const card = document.createElement("article");
    card.className = "data-plan-card";

    const details = document.createElement("div");
    details.className = "data-plan-details";

    const name = document.createElement("h3");
    name.className = "data-plan-name";
    name.textContent = String(plan.name);

    const network = document.createElement("span");
    network.className = "data-plan-network";
    network.textContent = networkName;

    details.append(name, network);

    const price = document.createElement("strong");
    price.className = "data-plan-price";
    price.textContent = formatNaira(amount);

    const footer = document.createElement("div");
    footer.className = "data-plan-footer";

    const availability = document.createElement("span");
    availability.className = "data-plan-availability";
    availability.textContent = "Catalogue listing";

    footer.append(availability);

    card.append(details, price, footer);

    fragment.append(card);
  });

  if (!fragment.childNodes.length) {
    setCatalogueStatus(
      `The catalogue returned no usable plans for ${networkName}.`,
      "empty"
    );
    return;
  }

  elements.dataPlans.append(fragment);

  setCatalogueStatus(
    `${elements.dataPlans.children.length} plans loaded for ${networkName}. Select a plan for purchase once checkout is enabled.`,
    "success"
  );
}

async function loadDataCatalogue(network = selectedDataNetwork) {
  if (!SUPPORTED_DATA_NETWORKS[network]) {
    setCatalogueStatus(
      "Please select a supported network.",
      "error"
    );
    return;
  }

  if (!elements.dataCatalogueStatus || !elements.dataPlans) {
    console.error(
      "Data catalogue elements are missing from index.html."
    );
    return;
  }

  setSelectedDataNetwork(network);

  const requestNumber = ++catalogueRequestNumber;
  const networkName = SUPPORTED_DATA_NETWORKS[network];

  clearDataPlans();

  setCatalogueStatus(
    `Loading ${networkName} data plans...`,
    "loading"
  );

  setButtonLoading(
    elements.refreshDataCatalogue,
    true,
    "Loading..."
  );

  try {
    const response = await fetch(
      `${DATA_CATALOGUE_URL}?network=${encodeURIComponent(network)}`,
      {
        method: "GET",
        headers: {
          "apikey": SUPABASE_PUBLISHABLE_KEY,
          "Accept": "application/json"
        },
        cache: "no-store"
      }
    );

    const result = await response.json().catch(() => null);

    if (requestNumber !== catalogueRequestNumber) {
      return;
    }

    if (!response.ok || !result?.success) {
      throw new Error(
        result?.error ||
        `The catalogue request failed (${response.status}).`
      );
    }

    if (result.network !== network) {
      throw new Error(
        "The provider returned an unexpected network."
      );
    }

    renderDataPlans(
      result.plans,
      result.networkName || networkName
    );

  } catch (error) {
    if (requestNumber !== catalogueRequestNumber) {
      return;
    }

    console.error("Data catalogue error:", error);

    const message = String(error?.message || "");

    if (
      message.toLowerCase().includes("failed to fetch") ||
      message.toLowerCase().includes("networkerror")
    ) {
      setCatalogueStatus(
        "We could not connect to the catalogue. Check your internet connection or the function's allowed website origins, then try again.",
        "error"
      );
    } else {
      setCatalogueStatus(
        message || "We could not load these data plans. Please try again.",
        "error"
      );
    }

  } finally {
    if (requestNumber === catalogueRequestNumber) {
      setButtonLoading(
        elements.refreshDataCatalogue,
        false
      );
    }
  }
}

function openDataStore() {
  showTab("data-store");

  updateQuickBuyBalance();
  updateRecentBeneficiaryDisplay();

  if (
    !elements.dataPlans ||
    !elements.dataPlans.children.length
  ) {
    loadDataCatalogue(selectedDataNetwork);
  }
}

/* Network selection */
document.querySelectorAll("[data-catalogue-network]").forEach((button) => {
  button.addEventListener("click", () => {
    const network = button.dataset.catalogueNetwork;

    if (!SUPPORTED_DATA_NETWORKS[network]) return;

    /*
     * Remember the customer's manual choice for the
     * current beneficiary number.
     */
    manuallySelectedNetworkForPhone =
      normaliseNigerianPhone(elements.dataPhone?.value || "");

    if (elements.dataTypeSelect) {
      elements.dataTypeSelect.value = "standard";
    }

    selectedDataCategory = "standard";

    loadDataCatalogue(network);
  });
});

/* Catalogue refresh */
if (elements.refreshDataCatalogue) {
  elements.refreshDataCatalogue.addEventListener("click", () => {
    if (selectedDataCategory !== "standard") {
      setCatalogueStatus(
        "Please select Standard Data to refresh the current catalogue.",
        "empty"
      );
      return;
    }

    loadDataCatalogue(selectedDataNetwork);
  });
}

/* Return to dashboard home */
if (elements.backToHomeFromData) {
  elements.backToHomeFromData.addEventListener("click", () => {
    showTab("home");
  });
}

/* ---------------------------------------------------------
   17b. AIRTIME SCREEN (design preview only)
   --------------------------------------------------------- */

function setAirtimeNetwork(network) {
  document
    .querySelectorAll('.net-picker[data-picker="airtime"] .net-option')
    .forEach((option) => {
      option.classList.toggle("active", option.dataset.net === network);
    });
}

function handleAirtimePhoneInput() {
  if (!elements.airtimePhone || !elements.airtimeDetected) return;

  const value = elements.airtimePhone.value.trim();
  const normalised = normaliseNigerianPhone(value);

  if (normalised !== airtimeManualForPhone) {
    airtimeManualForPhone = null;
  }

  const detected = detectNigerianNetwork(value);

  if (!normalised || !detected) {
    elements.airtimeDetected.textContent = "Enter phone number";
    return;
  }

  elements.airtimeDetected.textContent =
    `${SUPPORTED_DATA_NETWORKS[detected]} detected — you can change this manually.`;

  if (!airtimeManualForPhone) {
    setAirtimeNetwork(detected);
  }
}

if (elements.airtimePhone) {
  elements.airtimePhone.addEventListener("input", handleAirtimePhoneInput);

  elements.airtimePhone.addEventListener("blur", () => {
    const normalised = normaliseNigerianPhone(elements.airtimePhone.value);

    if (normalised) {
      elements.airtimePhone.value = normalised;
      saveRecentBeneficiary(normalised);
    }
  });
}

if (elements.airtimeRecent) {
  elements.airtimeRecent.addEventListener("click", () => {
    const recent = getRecentBeneficiary();

    if (!recent || !elements.airtimePhone) return;

    elements.airtimePhone.value = recent;
    airtimeManualForPhone = null;
    handleAirtimePhoneInput();
  });
}

/* ---------------------------------------------------------
   17c. GGR SMART DATA FINDER
   Works only on plans returned by the live VTpass catalogue.
   --------------------------------------------------------- */

function parsePlanSizeGb(name) {
  const match = String(name).match(/(\d+(?:\.\d+)?)\s*(TB|GB|MB)\b/i);

  if (!match) return null;

  const value = Number(match[1]);
  const unit = match[2].toUpperCase();

  if (unit === "TB") return value * 1024;
  if (unit === "GB") return value;

  return value / 1024;
}

function parsePlanValidityDays(name) {
  const match = String(name).match(
    /(\d+)\s*(hrs?|hours?|days?|weeks?|months?|years?)\b/i
  );

  if (!match) return null;

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();

  if (unit.startsWith("h")) return value / 24;
  if (unit.startsWith("d")) return value;
  if (unit.startsWith("w")) return value * 7;
  if (unit.startsWith("m")) return value * 30;

  return value * 365;
}

const FINDER_NEEDS = {
  light: { min: 0.1, max: 2, target: 1 },
  social: { min: 1.5, max: 8, target: 3 },
  work: { min: 3, max: 20, target: 8 },
  heavy: { min: 10, max: 1024, target: 30 }
};

function renderFinderMessage(text) {
  if (!elements.finderResults) return;

  elements.finderResults.replaceChildren();

  const note = document.createElement("div");
  note.className = "finder-empty";
  note.textContent = text;

  elements.finderResults.append(note);
}

function addFinderResult(label, plan) {
  const card = document.createElement("div");
  card.className = "finder-result";

  const tag = document.createElement("span");
  tag.className = "finder-tag";
  tag.textContent = label;

  const name = document.createElement("b");
  name.textContent = plan.name;

  const price = document.createElement("strong");
  price.textContent = formatNaira(plan.amount);

  card.append(tag, name, price);
  elements.finderResults.append(card);
}

function runDataFinder() {
  if (!elements.finderResults) return;

  const typed = Number(document.getElementById("finderCustom")?.value);
  const budget = Number.isFinite(typed) && typed > 0 ? typed : finderBudget;

  if (!budget) {
    renderFinderMessage("Choose or type a budget first.");
    return;
  }

  if (!lastPlans.length) {
    renderFinderMessage(
      "Plans are still loading. Wait for the bundle list below, then try again."
    );
    return;
  }

  const affordable = lastPlans
    .map((plan) => ({
      ...plan,
      gb: parsePlanSizeGb(plan.name),
      days: parsePlanValidityDays(plan.name)
    }))
    .filter((plan) => plan.amount > 0 && plan.amount <= budget);

  if (!affordable.length) {
    renderFinderMessage(
      `No plan on ${SUPPORTED_DATA_NETWORKS[selectedDataNetwork]} fits ${formatNaira(budget)}. Try a higher budget.`
    );
    return;
  }

  const sized = affordable.filter((plan) => plan.gb);
  const picks = [];
  const used = new Set();

  const pick = (label, plan) => {
    if (!plan || used.has(plan.code)) return;
    used.add(plan.code);
    picks.push([label, plan]);
  };

  if (sized.length) {
    const need = FINDER_NEEDS[finderNeed];

    if (need) {
      const inRange = sized.filter(
        (plan) => plan.gb >= need.min && plan.gb <= need.max
      );

      const pool = inRange.length ? inRange : sized;

      pick(
        inRange.length ? "Best match for you" : "Closest match",
        [...pool].sort(
          (a, b) =>
            Math.abs(a.gb - need.target) - Math.abs(b.gb - need.target)
        )[0]
      );
    }

    pick(
      "Best value",
      [...sized].sort((a, b) => a.amount / a.gb - b.amount / b.gb)[0]
    );

    pick(
      "Most data for your budget",
      [...sized].sort((a, b) => b.gb - a.gb)[0]
    );

    const withDays = sized.filter((plan) => plan.days);

    if (withDays.length) {
      pick(
        "Longest validity",
        [...withDays].sort((a, b) => b.days - a.days)[0]
      );
    }
  } else {
    pick(
      "Lowest price",
      [...affordable].sort((a, b) => a.amount - b.amount)[0]
    );
  }

  elements.finderResults.replaceChildren();

  picks.slice(0, 4).forEach(([label, plan]) => addFinderResult(label, plan));
}

/* ---------------------------------------------------------
   17d. GGR TRUSTTRACK — TRANSACTION DETAILS SHEET
   --------------------------------------------------------- */

let sheetReference = "";

function buildTimeline(transaction) {
  const isCredit = transaction.direction === "credit";

  const steps = isCredit
    ? [
        ["done", "Payment received"],
        ["done", "Wallet credited"]
      ]
    : [
        ["done", "Order received"],
        ["done", "Wallet debited"],
        ["pending", "Delivery status — shown here once purchases are live"]
      ];

  const list = document.getElementById("txTimeline");
  if (!list) return;

  list.replaceChildren();

  steps.forEach(([state, label]) => {
    const item = document.createElement("li");
    item.className = `tt-step ${state}`;
    item.textContent = label;
    list.append(item);
  });
}

function openTransactionSheet(transaction) {
  const sheet = document.getElementById("txSheet");
  if (!sheet) return;

  const isCredit = transaction.direction === "credit";
  const kind = isCredit ? "in" : "out";

  const icon = document.getElementById("txSheetIcon");
  icon.textContent = isCredit ? "↓" : "↑";
  icon.className = `tx-sheet-icon ${kind}`;

  document.getElementById("txSheetTitle").textContent =
    transaction.description ||
    String(transaction.transaction_type || "Wallet transaction")
      .replace(/_/g, " ");

  const amount = document.getElementById("txSheetAmount");
  amount.textContent = (isCredit ? "+" : "−") + formatNaira(transaction.amount);
  amount.className = `tx-sheet-amount ${kind}`;

  buildTimeline(transaction);

  sheetReference = transaction.reference || "";

  const copyButton = document.getElementById("txCopyRef");
  if (copyButton) {
    copyButton.classList.toggle("hidden", !sheetReference);
    copyButton.textContent = "Copy reference";
  }

  const rows = document.getElementById("txSheetRows");
  rows.replaceChildren();

  const addRow = (label, value) => {
    if (value === null || value === undefined || value === "") return;

    const row = document.createElement("div");
    row.className = "detail-row";

    const l = document.createElement("span");
    l.textContent = label;

    const v = document.createElement("b");
    v.textContent = value;

    row.append(l, v);
    rows.append(row);
  };

  addRow("Type", String(transaction.transaction_type || "").replace(/_/g, " "));
  addRow("Date", formatDateTime(transaction.created_at));
  addRow("Reference", transaction.reference);

  if (transaction.balance_before !== undefined && transaction.balance_before !== null) {
    addRow("Balance before", formatNaira(transaction.balance_before));
  }

  if (transaction.balance_after !== undefined && transaction.balance_after !== null) {
    addRow("Balance after", formatNaira(transaction.balance_after));
  }

  sheet.classList.remove("hidden");
}

function closeTransactionSheet() {
  document.getElementById("txSheet")?.classList.add("hidden");
}

async function copySheetReference() {
  const button = document.getElementById("txCopyRef");

  try {
    await navigator.clipboard.writeText(sheetReference);
    if (button) button.textContent = "Copied ✓";
  } catch (error) {
    if (button) button.textContent = sheetReference;
  }
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeTransactionSheet();
});

/* ---------------------------------------------------------
   18. SERVICE MESSAGES AND DASHBOARD ACTIONS
   --------------------------------------------------------- */

function showComingSoon(label) {
  showDashboardMessage(
    `${label} will be available soon. We will switch it on only after payment and delivery safeguards are tested.`,
    "success",
    true
  );
}

document.addEventListener("click", (event) => {
  const tabTarget = event.target.closest("[data-tab]");

  if (tabTarget) {
    showTab(tabTarget.dataset.tab);
    return;
  }

  if (event.target.closest("#toggleBalance")) {
    balanceHidden = !balanceHidden;
    applyBalanceVisibility();
    return;
  }

  if (event.target.closest("[data-close-sheet]")) {
    closeTransactionSheet();
    return;
  }

  if (event.target.closest("#txCopyRef")) {
    copySheetReference();
    return;
  }

  const netOption = event.target.closest(".net-option");

  if (netOption) {
    airtimeManualForPhone = normaliseNigerianPhone(
      elements.airtimePhone?.value || ""
    );
    setAirtimeNetwork(netOption.dataset.net);
    return;
  }

  const amountChip = event.target.closest("#amountGrid .amount-chip");

  if (amountChip) {
    document
      .querySelectorAll("#amountGrid .amount-chip")
      .forEach((chip) =>
        chip.classList.toggle("selected", chip === amountChip)
      );

    const input = document.getElementById("airtimeAmount");
    if (input) input.value = amountChip.dataset.amount;
    return;
  }

  const budgetChip = event.target.closest("#finderBudgets .amount-chip");

  if (budgetChip) {
    finderBudget = Number(budgetChip.dataset.budget);

    document
      .querySelectorAll("#finderBudgets .amount-chip")
      .forEach((chip) =>
        chip.classList.toggle("selected", chip === budgetChip)
      );

    const custom = document.getElementById("finderCustom");
    if (custom) custom.value = "";
    return;
  }

  const needChip = event.target.closest(".need-chip");

  if (needChip) {
    finderNeed = needChip.dataset.need;

    document
      .querySelectorAll(".need-chip")
      .forEach((chip) =>
        chip.classList.toggle("selected", chip === needChip)
      );
    return;
  }

  if (event.target.closest("#finderRun")) {
    runDataFinder();
    return;
  }

  if (event.target.closest("#airtimeBuyBtn")) {
    showComingSoon("Airtime purchase");
    return;
  }

  const serviceTarget = event.target.closest("[data-service]");

  if (serviceTarget) {
    const service = serviceTarget.dataset.service;

    if (!serviceTarget.classList.contains("soon")) {
      if (service === "data") {
        openDataStore();
        return;
      }

      if (service === "airtime") {
        showTab("airtime");
        updateRecentBeneficiaryDisplay();
        return;
      }
    }

    const label =
      serviceTarget.querySelector("span:last-child")?.textContent.trim() ||
      "This service";

    showComingSoon(label);
    return;
  }

  if (event.target.closest("#fundWalletBtn, #walletFundLink")) {
    showComingSoon("Wallet funding");
    return;
  }

  if (event.target.closest("#notificationBtn")) {
    showDashboardMessage(
      "You have no new notifications.",
      "success",
      true
    );
  }
});

/* ---------------------------------------------------------
   19. TRANSACTION LIST RENDERING
   --------------------------------------------------------- */

function buildTransactionItem(transaction) {
  const isCredit = transaction.direction === "credit";
  const kind = isCredit ? "in" : "out";

  const item = document.createElement("div");
  item.className = "tx-item";

  const iconBox = document.createElement("span");
  iconBox.className = `tx-icon ${kind}`;
  iconBox.textContent = isCredit ? "↓" : "↑";

  const main = document.createElement("div");
  main.className = "tx-main";

  const title = document.createElement("b");
  title.textContent =
    transaction.description ||
    String(transaction.transaction_type || "Wallet transaction")
      .replace(/_/g, " ");

  const meta = document.createElement("small");
  const when = formatDateTime(transaction.created_at);

  meta.textContent = [when, transaction.reference]
    .filter(Boolean)
    .join(" · ");

  main.append(title, meta);

  const amount = document.createElement("span");
  amount.className = `tx-amount ${kind}`;

  amount.textContent =
    (isCredit ? "+" : "−") + formatNaira(transaction.amount);

  item.append(iconBox, main, amount);

  item.tabIndex = 0;
  item.setAttribute("role", "button");
  item.addEventListener("click", () => openTransactionSheet(transaction));
  item.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openTransactionSheet(transaction);
    }
  });

  return item;
}

function showTransactionMessage(container, title, text) {
  if (!container) return;

  container.className = "empty-activity";
  container.replaceChildren();

  const icon = document.createElement("span");
  icon.className = "empty-activity-icon";
  icon.textContent = "◷";

  const heading = document.createElement("b");
  heading.textContent = title;

  const note = document.createElement("p");
  note.textContent = text;

  container.append(icon, heading, note);
}

function renderTransactions(container, transactions, limit) {
  if (!container) return;

  if (!transactions.length) {
    showTransactionMessage(
      container,
      "Your activity will appear here",
      "Your verified transaction history and receipts will be displayed here."
    );
    return;
  }

  container.className = "tx-list";
  container.replaceChildren();

  transactions.slice(0, limit).forEach((transaction) => {
    container.append(buildTransactionItem(transaction));
  });
}

function renderTransactionError(container) {
  if (!container) return;

  showTransactionMessage(
    container,
    "Transactions could not be loaded",
    "Please refresh the page and try again."
  );
}

/* ---------------------------------------------------------
   20. LOAD USER PROFILE, WALLET AND TRANSACTIONS
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
  showTab("home");

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
    const [profileResult, walletResult, transactionResult] =
      await Promise.all([
        supabaseClient
          .from("profiles")
          .select("full_name, phone_e164, email")
          .eq("user_id", user.id)
          .maybeSingle(),

        supabaseClient
          .from("wallets")
          .select("balance, currency")
          .eq("user_id", user.id)
          .maybeSingle(),

        supabaseClient
          .from("wallet_transactions")
          .select(
            "id, transaction_type, direction, amount, balance_before, balance_after, description, reference, created_at"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50)
      ]);

    const profile = profileResult.data;
    const wallet = walletResult.data;

    const profileError = profileResult.error;
    const walletError = walletResult.error;
    const transactionError = transactionResult.error;

    if (profileError) {
      console.error("Profile loading error:", profileError);
    }

    if (walletError) {
      console.error("Wallet loading error:", walletError);
    }

    if (transactionError) {
      console.error("Transaction loading error:", transactionError);
    }

    const name =
      profile?.full_name ||
      user.user_metadata?.full_name ||
      "GGRData Member";

    const firstName = name.trim().split(/\s+/)[0] || "there";

    if (elements.welcome) {
      elements.welcome.textContent = `Hello, ${firstName}`;
    }

    if (elements.profileName) {
      elements.profileName.textContent =
        profileError ? "Not available" : name;
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
        currentWalletBalance = Number(wallet.balance);
      } else {
        elements.balance.textContent = "Not available";
        currentWalletBalance = null;
      }
    }

    if (transactionError) {
      renderTransactionError(elements.recentTransactions);
    } else {
      renderTransactions(
        elements.recentTransactions,
        transactionResult.data || [],
        50
      );
    }

    if (profileError || !profile || walletError || !wallet) {
      showDashboardMessage(
        "Some account information could not be loaded. Please refresh or contact support if the problem continues.",
        "error"
      );
    }

    lastBalanceText = elements.balance
      ? elements.balance.textContent
      : "";

    applyBalanceVisibility();
    updateRecentBeneficiaryDisplay();

    loadedUserId = user.id;

  } catch (error) {
    console.error("Dashboard loading error:", error);

    if (elements.balance) {
      elements.balance.textContent = "Not available";
    }

    currentWalletBalance = null;

    lastBalanceText = "Not available";

    updateQuickBuyBalance();

    renderTransactionError(elements.recentTransactions);

    showDashboardMessage(
      "We could not load your account information. Please refresh the page and try again.",
      "error"
    );

  } finally {
    loadingUserId = null;
  }
}

/* ---------------------------------------------------------
   21. SIGN OUT
   --------------------------------------------------------- */

if (elements.logoutBtn) {
  elements.logoutBtn.addEventListener("click", async () => {
    setButtonLoading(elements.logoutBtn, true, "Signing out...");

    try {
      const { error } = await supabaseClient.auth.signOut();

      if (error) throw error;

      loadedUserId = null;
      loadingUserId = null;
      currentWalletBalance = null;
      lastBalanceText = "";

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
   22. SUPABASE AUTH STATE LISTENER
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
    currentWalletBalance = null;
    lastBalanceText = "";

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
   23. INITIAL APPLICATION STATE
   --------------------------------------------------------- */

async function initialiseApplication() {
  updateRecentBeneficiaryDisplay();

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
