
/* =========================================================
   GGRData — Main Application
   Authentication, Dashboard, Wallet, Transactions,
   QuickBuy and Notifications Center
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

  profileAvatar: document.getElementById("profileAvatar"),
  profileDisplayName: document.getElementById("profileDisplayName"),
  profileUsername: document.getElementById("profileUsername"),
  profileDetails: document.getElementById("profileDetails"),

  finderResults: document.getElementById("finderResults"),
  homeRecentNumber: document.getElementById("homeRecentNumber"),

  /* Airtime screen */
  airtimePhone: document.getElementById("airtimePhone"),
  airtimeDetected: document.getElementById("airtimeDetected"),
  airtimeRecent: document.getElementById("airtimeRecent"),
  airtimeRecentNumber: document.getElementById("airtimeRecentNumber"),

  /* Notifications Center */
  notificationBtn: document.getElementById("notificationBtn"),
  notificationCount: document.getElementById("notificationCount"),
  notificationsView: document.getElementById("notificationsView"),
  notificationsList: document.getElementById("notificationsList"),
  markAllNotificationsRead: document.getElementById("markAllNotificationsRead"),

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

let manuallySelectedNetworkForPhone = null;

let catalogueRequestNumber = 0;
let currentWalletBalance = null;
let lastPlans = [];
let selectedDataPlan = null;
let dataPurchaseInProgress = false;
let currentUsername = "";
let finderBudget = null;
let finderNeed = null;
let airtimeManualForPhone = null;

/* Preserve the user's position separately for each dashboard page. */
let activeDashboardTab = null;
const dashboardScrollPositions = Object.create(null);

/* Notifications Center state */
let activeNotificationsUserId = null;
let notificationItems = [];
let notificationFilter = "all";
let notificationsRequestNumber = 0;

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

  /* Do not force the user to the top when screens are toggled. */
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
   13. NOTIFICATIONS CENTER
   --------------------------------------------------------- */

function formatNotificationTime(value) {
  if (!value) return "Just now";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function updateNotificationCount() {
  if (!elements.notificationCount) return;

  const unread = notificationItems.filter(
    (item) => !item.read_at
  ).length;

  elements.notificationCount.textContent =
    unread > 99 ? "99+" : String(unread);

  elements.notificationCount.hidden = unread === 0;

  elements.notificationBtn?.setAttribute(
    "aria-label",
    unread
      ? `Notifications, ${unread} unread`
      : "Notifications"
  );
}

function renderNotifications() {
  const list = elements.notificationsList;

  if (!list) return;

  const visible = notificationItems.filter((item) =>
    notificationFilter === "unread"
      ? !item.read_at
      : true
  );

  list.replaceChildren();

  if (!visible.length) {
    const empty = document.createElement("div");
    empty.className = "notifications-empty";

    empty.textContent =
      notificationFilter === "unread"
        ? "You are all caught up. No unread notifications."
        : "No notifications yet. Account and service updates will appear here.";

    list.appendChild(empty);

    updateNotificationCount();
    return;
  }

  visible.forEach((item) => {
    const card = document.createElement("button");

    card.type = "button";
    card.className =
      `notification-item${item.read_at ? "" : " unread"}`;

    card.dataset.notificationId = item.id;

    card.setAttribute(
      "aria-label",
      `${item.title || "GGRData update"}. ${item.message || ""}`
    );

    const marker = document.createElement("span");
    marker.className = "notification-item-marker";
    marker.setAttribute("aria-hidden", "true");

    const category = String(item.category || "").toLowerCase();

    marker.textContent =
      category === "wallet" ? "₦"
      : category === "services" ? "↗"
      : category === "transactions" ? "↔"
      : category === "account" ? "♙"
      : "•";

    const copy = document.createElement("span");
    copy.className = "notification-item-copy";

    const title = document.createElement("strong");
    title.textContent = item.title || "GGRData update";

    const message = document.createElement("span");
    message.textContent = item.message || "";

    const time = document.createElement("small");
    time.textContent = formatNotificationTime(item.created_at);

    copy.append(title, message, time);
    card.append(marker, copy);

    if (!item.read_at) {
      const dot = document.createElement("span");

      dot.className = "notification-unread-dot";
      dot.setAttribute("aria-label", "Unread");

      card.appendChild(dot);
    }

    list.appendChild(card);
  });

  updateNotificationCount();
}

async function loadNotifications(userId, showLoading = false) {
  if (!userId || !supabaseClient) return;

  if (activeNotificationsUserId !== userId) {
    notificationItems = [];
    notificationFilter = "all";
    updateNotificationCount();
  }

  activeNotificationsUserId = userId;

  const requestNumber = ++notificationsRequestNumber;

  if (showLoading && elements.notificationsList) {
    showSkeletonRows(elements.notificationsList, 3);
  }

  const { data, error } = await supabaseClient
    .from("notifications")
    .select("id, category, title, message, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (
    requestNumber !== notificationsRequestNumber ||
    activeNotificationsUserId !== userId
  ) {
    return;
  }

  if (error) {
    console.error("Notifications loading error:", error);

    if (elements.notificationsList) {
      showRetryState(
        elements.notificationsList,
        "Notifications could not be loaded.",
        () => loadNotifications(userId, true)
      );
    }

    return;
  }

  notificationItems = Array.isArray(data) ? data : [];

  renderNotifications();
}

async function markNotificationRead(notificationId) {
  const userId = activeNotificationsUserId;

  const item = notificationItems.find(
    (entry) => String(entry.id) === String(notificationId)
  );

  if (!item || item.read_at || !userId) return;

  const readAt = new Date().toISOString();

  const { error } = await supabaseClient
    .from("notifications")
    .update({ read_at: readAt })
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (activeNotificationsUserId !== userId) return;

  if (error) {
    console.error("Mark notification read error:", error);

    showDashboardMessage(
      "We could not update this notification. Please try again.",
      "error"
    );

    return;
  }

  const currentItem = notificationItems.find(
    (entry) => String(entry.id) === String(notificationId)
  );

  if (currentItem) {
    currentItem.read_at = readAt;
  }

  renderNotifications();
}

async function markAllNotificationsRead() {
  const userId = activeNotificationsUserId;

  if (!userId) return;

  const unreadItems = notificationItems.filter(
    (item) => !item.read_at
  );

  if (!unreadItems.length) return;

  setButtonLoading(
    elements.markAllNotificationsRead,
    true,
    "Updating..."
  );

  const readAt = new Date().toISOString();

  try {
    const { error } = await supabaseClient
      .from("notifications")
      .update({ read_at: readAt })
      .eq("user_id", userId)
      .is("read_at", null);

    if (activeNotificationsUserId !== userId) return;

    if (error) throw error;

    notificationItems.forEach((item) => {
      if (!item.read_at) {
        item.read_at = readAt;
      }
    });

    renderNotifications();

  } catch (error) {
    console.error("Mark all notifications read error:", error);

    if (activeNotificationsUserId === userId) {
      showDashboardMessage(
        "We could not update your notifications. Please try again.",
        "error"
      );
    }

  } finally {
    setButtonLoading(
      elements.markAllNotificationsRead,
      false
    );
  }
}

/* Notification filters */

document.querySelectorAll("[data-notification-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    notificationFilter =
      button.dataset.notificationFilter === "unread"
        ? "unread"
        : "all";

    document.querySelectorAll("[data-notification-filter]").forEach((filter) => {
      const active = filter === button;

      filter.classList.toggle("active", active);
      filter.setAttribute("aria-pressed", String(active));
    });

    renderNotifications();
  });
});

if (elements.markAllNotificationsRead) {
  elements.markAllNotificationsRead.addEventListener(
    "click",
    markAllNotificationsRead
  );
}

/* ---------------------------------------------------------
   14. DASHBOARD NAVIGATION
   --------------------------------------------------------- */

const TAB_VIEW_IDS = {
  transactions: "transactionsView",
  wallet: "walletView",
  profile: "profileView",
  notifications: "notificationsView",
  "data-store": "dataStoreView",
  airtime: "airtimeView",
  service: "serviceView",
  purchase: "purchaseView",
  info: "infoView"
};

const NAV_PARENT_TAB = {
  "data-store": "home",
  airtime: "home",
  service: "home",
  notifications: "home",
  purchase: "home",
  info: "profile"
};

function showTab(tabName, options = {}) {
  const isHome = tabName === "home";

  if (!elements.dashboardScreen) return;

  /* Save the page being left before changing the visible dashboard view. */
  if (activeDashboardTab) {
    dashboardScrollPositions[activeDashboardTab] = window.scrollY || 0;
  }

  /* Remember where the user came from so the back arrow returns there. */
  if (
    !options.fromBack &&
    activeDashboardTab &&
    activeDashboardTab !== tabName
  ) {
    if (isHome) {
      navHistory = [];
    } else if (ROOT_TABS.includes(tabName)) {
      navHistory = ["home"];
    } else {
      navHistory.push(activeDashboardTab);

      if (navHistory.length > 20) navHistory.shift();
    }

    if (!isHome) pushBrowserState(tabName);
  }

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
    const navTab = NAV_PARENT_TAB[tabName] || tabName;

    item.classList.toggle("active", item.dataset.tab === navTab);
  });

  clearDashboardMessage();

  /* Restore the exact scroll position previously reached on this page. */
  activeDashboardTab = tabName;
  const freshPage =
    !options.fromBack && ["purchase", "info", "service"].includes(tabName);

  const savedScrollPosition = freshPage
    ? 0
    : dashboardScrollPositions[tabName] || 0;

  window.requestAnimationFrame(() => {
    window.scrollTo(0, savedScrollPosition);
  });

  focusActiveView(tabName);

  if (tabName === "data-store") {
    updateQuickBuyBalance();
    updateRecentBeneficiaryDisplay();
  }

  if (
    tabName === "notifications" &&
    activeNotificationsUserId
  ) {
    loadNotifications(activeNotificationsUserId, true);
  }
}

/* ---------------------------------------------------------
   15. BALANCE VISIBILITY
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

    setEyeIcon(elements.toggleBalance, balanceHidden);
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
   16. GGR QUICKBUY — BENEFICIARY AND NETWORK
   --------------------------------------------------------- */

function updateDetectedNetworkDisplay(network) {
  if (!elements.detectedNetwork) return;

  if (!network) {
    elements.detectedNetwork.textContent =
      "Enter a valid number to detect network";

    return;
  }

  elements.detectedNetwork.textContent =
    `✓ ${SUPPORTED_DATA_NETWORKS[network]} detected`;
}

function handleBeneficiaryInput() {
  if (!elements.dataPhone) return;

  const value = elements.dataPhone.value.trim();
  const normalised = normaliseNigerianPhone(value);

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
    manuallySelectedNetworkForPhone = null;

    handleBeneficiaryInput();
  });
}

/* ---------------------------------------------------------
   17. DATA CATEGORY SELECTOR
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
   18. DATA CATALOGUE
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
  selectedDataPlan = null;

  if (typeof updateNextButtons === "function") updateNextButtons();
}

async function refreshWalletAfterDataPurchase() {
  const userResult = await supabaseClient.auth.getUser();
  const user = userResult?.data?.user;
  if (!user) return;

  const [walletResult, transactionResult] = await Promise.all([
    supabaseClient.from("wallets").select("balance, currency").eq("user_id", user.id).maybeSingle(),
    supabaseClient.from("wallet_transactions")
      .select("id, transaction_type, direction, amount, balance_before, balance_after, description, reference, created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50)
  ]);

  if (!walletResult.error && walletResult.data && elements.balance) {
    currentWalletBalance = Number(walletResult.data.balance);
    elements.balance.textContent = formatNaira(currentWalletBalance);
    lastBalanceText = elements.balance.textContent;
    applyBalanceVisibility();
  }

  if (!transactionResult.error) {
    renderTransactions(elements.recentTransactions, transactionResult.data || [], 50);
  }
}

function renderDataPlans(plans, networkName) {
  if (!elements.dataPlans) return;

  clearDataPlans();

  lastPlans = Array.isArray(plans) ? plans : [];

  if (elements.finderResults) {
    elements.finderResults.replaceChildren();
  }

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

    const selectButton = document.createElement("button");
    selectButton.type = "button";
    selectButton.className = "button-outline data-plan-select";
    selectButton.textContent = "Select bundle";
    selectButton.addEventListener("click", () => {
      selectedDataPlan = plan;

      elements.dataPlans.querySelectorAll(".data-plan-card").forEach((item) => {
        const isSelected = item === card;

        item.classList.toggle("selected", isSelected);

        const itemButton = item.querySelector(".data-plan-select");
        if (itemButton) {
          itemButton.textContent = isSelected ? "✓ Selected" : "Select bundle";
        }
      });

      onBundleSelected();
    });

    card.append(details, price, footer, selectButton);

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
    `${elements.dataPlans.children.length} bundles loaded for ${networkName}. Select a bundle to continue to purchase verification.`,
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
  showSkeletonCards(elements.dataPlans, 4);

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
    clearDataPlans();

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
   18b. AIRTIME SCREEN (design preview only)
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
    `✓ ${SUPPORTED_DATA_NETWORKS[detected]} detected`;

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
   18c. GGR SMART DATA FINDER
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
   18d. GGR TRUSTTRACK — TRANSACTION DETAILS SHEET
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
  sheet.querySelector(".tt-actions .button-outline:last-child")?.focus({ preventScroll: true });
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
   19. SERVICE MESSAGES AND DASHBOARD ACTIONS
   --------------------------------------------------------- */

function showComingSoon(label) {
  showDashboardMessage(
    `${label} will be available soon. We will switch it on only after payment and delivery safeguards are tested.`,
    "success",
    true
  );
}

document.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof Element)) return;

  const tabTarget = target.closest("[data-tab]");

  if (tabTarget) {
    showTab(tabTarget.dataset.tab);
    return;
  }

  const notificationItem = target.closest("[data-notification-id]");

  if (notificationItem) {
    markNotificationRead(notificationItem.dataset.notificationId);
    return;
  }

  if (target.closest("#notificationBtn")) {
    showTab("notifications");
    return;
  }

  if (target.closest("#toggleBalance")) {
    balanceHidden = !balanceHidden;
    applyBalanceVisibility();
    return;
  }

  if (target.closest("[data-close-sheet]")) {
    closeTransactionSheet();
    return;
  }

  if (target.closest("#txCopyRef")) {
    copySheetReference();
    return;
  }

  if (target.closest("#toggleReferral")) {
    referralHidden = !referralHidden;
    applyReferralVisibility();
    return;
  }

  const profileTarget = target.closest("[data-profile]");

  if (profileTarget) {
    const action = profileTarget.dataset.profile;

    if (action === "dark") {
      toggleTheme();
    }

    return;
  }

  const netOption = target.closest(".net-option");

  if (netOption) {
    airtimeManualForPhone = normaliseNigerianPhone(
      elements.airtimePhone?.value || ""
    );

    setAirtimeNetwork(netOption.dataset.net);
    return;
  }

  const amountChip = target.closest("#amountGrid .amount-chip");

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

  const budgetChip = target.closest("#finderBudgets .amount-chip");

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

  const needChip = target.closest(".need-chip");

  if (needChip) {
    finderNeed = needChip.dataset.need;

    document
      .querySelectorAll(".need-chip")
      .forEach((chip) =>
        chip.classList.toggle("selected", chip === needChip)
      );

    return;
  }

  if (target.closest("#finderRun")) {
    runDataFinder();
    return;
  }

  const serviceTarget = target.closest("[data-service]");

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

      if (SERVICE_SCREENS[service]) {
        openServiceScreen(service);
        return;
      }
    }

    const label =
      serviceTarget.querySelector("span:last-child")?.textContent.trim() ||
      "This service";

    showComingSoon(label);
    return;
  }

  if (target.closest("#fundWalletBtn, #walletFundLink")) {
    showComingSoon("Wallet funding");
    return;
  }
});

/* ---------------------------------------------------------
   19b. SERVICE SCREENS
   --------------------------------------------------------- */

const NETWORK_CHOICES = ["MTN", "Airtel", "Glo"];

const DISCO_CHOICES = [
  "Ikeja", "Eko", "Abuja", "Kano", "Kaduna", "Ibadan",
  "Enugu", "Jos", "Port Harcourt", "Benin", "Yola", "Aba"
];

const SERVICE_SCREENS = {
  cable: {
    kicker: "CABLE TV",
    title: "Pay for Cable TV",
    sub: "Renew your decoder subscription.",
    fields: [
      { type: "chips", label: "Provider", options: ["DStv", "GOtv", "StarTimes"] },
      { type: "input", label: "Smartcard / IUC number", placeholder: "Enter decoder number", mode: "numeric" }
    ],
    note: "Packages and prices load from the provider once cable payments are switched on.",
    action: "Continue",
    safeguard: true
  },

  electricity: {
    kicker: "ELECTRICITY",
    title: "Buy electricity",
    sub: "Pay for prepaid or postpaid meters.",
    fields: [
      { type: "chips", label: "Distribution company", options: DISCO_CHOICES, wide: true },
      { type: "chips", label: "Meter type", options: ["Prepaid", "Postpaid"] },
      { type: "input", label: "Meter number", placeholder: "Enter meter number", mode: "numeric" },
      { type: "input", label: "Amount (₦)", placeholder: "e.g. 5000", mode: "numeric" }
    ],
    note: "Your meter name is confirmed with the provider before you pay.",
    action: "Continue",
    safeguard: true
  },

  "data-card": {
    kicker: "DATA CARD",
    title: "Buy data cards",
    sub: "Data cards you can sell or share.",
    fields: [
      { type: "chips", label: "Network", options: NETWORK_CHOICES },
      { type: "input", label: "Quantity", placeholder: "e.g. 5", mode: "numeric" }
    ],
    note: "Card sizes and prices will appear here once data cards are switched on.",
    action: "Continue",
    safeguard: true
  },

  bonus: {
    kicker: "BONUS TO WALLET",
    title: "Move bonus to wallet",
    sub: "Add your referral bonus to your wallet balance.",
    useReferralInfo: true,
    note: "Your bonus can be moved once you have a balance to transfer.",
    action: "Move to wallet",
    safeguard: true
  },

  "airtime-cash": {
    kicker: "AIRTIME TO CASH",
    title: "Convert airtime to cash",
    sub: "Turn spare airtime into wallet money.",
    fields: [
      { type: "chips", label: "Network", options: NETWORK_CHOICES },
      { type: "input", label: "Phone number", placeholder: "08012345678", mode: "numeric" },
      { type: "input", label: "Airtime amount (₦)", placeholder: "e.g. 1000", mode: "numeric" }
    ],
    note: "The payout rate is shown before you confirm.",
    action: "Continue",
    safeguard: true
  },

  "recharge-pin": {
    kicker: "RECHARGE PIN",
    title: "Buy recharge PINs",
    sub: "Printable airtime PINs.",
    fields: [
      { type: "chips", label: "Network", options: NETWORK_CHOICES },
      { type: "chips", label: "Value", options: ["₦100", "₦200", "₦500", "₦1,000"] },
      { type: "input", label: "Quantity", placeholder: "e.g. 10", mode: "numeric" }
    ],
    note: "PINs are delivered to your account once purchases are switched on.",
    action: "Continue",
    safeguard: true
  },

  "edu-pin": {
    kicker: "EDU PIN",
    title: "Buy exam PINs",
    sub: "Result checker and registration PINs.",
    fields: [
      { type: "chips", label: "Exam body", options: ["WAEC", "NECO", "NABTEB", "JAMB"] },
      { type: "input", label: "Quantity", placeholder: "e.g. 1", mode: "numeric" }
    ],
    note: "Prices appear here once exam PINs are switched on.",
    action: "Continue",
    safeguard: true
  },

  affiliate: {
    kicker: "AFFILIATE WEBSITE",
    title: "Your own GGRData website",
    sub: "A storefront of your own, powered by GGRData.",
    note: "Setup details will appear here when this service opens.",
    action: "Notify me",
    safeguard: false
  },

  referrals: {
    kicker: "MY REFERRALS",
    title: "Refer and earn",
    sub: "Share your link and track the friends you bring in.",
    referralPanel: true,
    note: "Rewards are credited once referral tracking is switched on.",
    safeguard: false
  },

  other: {
    kicker: "OTHER SERVICES",
    title: "More services",
    sub: "We are adding more ways to pay and connect.",
    note: "New services will show up here as soon as they are ready.",
    safeguard: false
  }
};

function el(tag, className, text) {
  const node = document.createElement(tag);

  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;

  return node;
}

function showSoon(label) {
  showDashboardMessage(`${label} will be added soon.`, "success", true);
}

function buildReferralPanel() {
  const panel = el("div", "referral-panel");

  const link = currentUsername
    ? `${window.location.origin}/?ref=${encodeURIComponent(currentUsername)}`
    : window.location.origin;

  const stats = el("div", "referral-stats");

  const people = el("div", "referral-stat");
  people.append(el("b", "", "0"), el("small", "", "People referred"));

  const earned = el("div", "referral-stat");
  earned.append(
    el("b", "", document.getElementById("referralBalance")?.textContent || "₦0.00"),
    el("small", "", "Bonus earned")
  );

  stats.append(people, earned);

  const field = el("div", "field");
  const label = el("label", "", "Your referral link");
  label.htmlFor = "referralLinkInput";

  const input = el("input");
  input.id = "referralLinkInput";
  input.readOnly = true;
  input.value = link;

  field.append(label, input);

  const copy = el("button", "button-primary", "Copy my link");
  copy.type = "button";

  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(link);
      copy.textContent = "Copied ✓";
    } catch (error) {
      input.select();
      copy.textContent = "Select and copy the link";
    }
  });

  panel.append(stats, field, copy);

  return panel;
}

function renderServiceScreen(key) {
  const config = SERVICE_SCREENS[key];
  const body = document.getElementById("serviceBody");

  if (!config || !body) return false;

  body.replaceChildren();

  body.append(el("span", "card-kicker", config.kicker));
  body.append(el("h2", "", config.title));

  if (config.sub) body.append(el("p", "service-sub", config.sub));

  if (config.referralPanel) body.append(buildReferralPanel());

  if (config.useReferralInfo) {
    const row = el("div", "detail-row");
    row.append(
      el("span", "", "Referral bonus"),
      el("b", "", document.getElementById("referralBalance")?.textContent || "₦0.00")
    );
    body.append(row);
  }

  (config.fields || []).forEach((field, index) => {
    if (field.type === "chips") {
      body.append(el("div", "pick-label", field.label));

      const row = el("div", field.wide ? "choice-row wide" : "choice-row");

      field.options.forEach((option) => {
        const chip = el("button", "choice-chip", option);
        chip.type = "button";
        row.append(chip);
      });

      row.addEventListener("click", (event) => {
        const chip = event.target.closest(".choice-chip");
        if (!chip) return;

        row.querySelectorAll(".choice-chip").forEach((c) =>
          c.classList.toggle("selected", c === chip)
        );
      });

      body.append(row);
      return;
    }

    const wrap = el("div", "field");
    const label = el("label", "", field.label);
    const input = el("input");

    input.id = `svc-${key}-${index}`;
    label.htmlFor = input.id;
    input.placeholder = field.placeholder || "";
    input.inputMode = field.mode || "text";

    wrap.append(label, input);
    body.append(wrap);
  });

  if (config.action) {
    const button = el("button", "button-primary", config.action);
    button.type = "button";

    button.addEventListener("click", () => {
      if (config.safeguard) {
        showComingSoon(config.title);
      } else {
        showSoon(config.title);
      }
    });

    body.append(button);
  }

  if (config.note) body.append(el("p", "preview-note", config.note));

  return true;
}

function openServiceScreen(key) {
  if (!renderServiceScreen(key)) return;

  setPageTitle("serviceView", SERVICE_SCREENS[key].title || "Service");

  showTab("service");
}

/* ---------------------------------------------------------
   19c. PROFILE SETTINGS AND DARK MODE
   --------------------------------------------------------- */

const THEME_KEY = "ggrdata_theme";

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";

  document.getElementById("darkSwitch")?.setAttribute(
    "aria-checked",
    String(theme === "dark")
  );
}

function loadSavedTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch (error) {
    return "light";
  }
}

function toggleTheme() {
  const next =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";

  applyTheme(next);

  try {
    localStorage.setItem(THEME_KEY, next);
  } catch (error) {
    console.warn("Could not save theme:", error);
  }
}

applyTheme(loadSavedTheme());

function setEyeIcon(button, hidden) {
  button
    ?.querySelector("use")
    ?.setAttribute("href", hidden ? "#i-eye" : "#i-eyeoff");
}

let referralHidden = false;

function applyReferralVisibility() {
  const value = document.getElementById("referralBalance");
  const button = document.getElementById("toggleReferral");

  if (!value) return;

  value.textContent = referralHidden ? "₦ ••••" : "₦0.00";

  button?.setAttribute(
    "aria-label",
    referralHidden ? "Show referral bonus" : "Hide referral bonus"
  );

  setEyeIcon(button, referralHidden);
}

/* ---------------------------------------------------------
   20. TRANSACTION LIST RENDERING
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
    "Check your connection, then try again."
  );

  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "retry-button";
  retry.textContent = "Try again";
  retry.addEventListener("click", () => refreshAccountData(true));
  container.append(retry);
}

/* ---------------------------------------------------------
   21. LOAD USER PROFILE, WALLET, TRANSACTIONS
   --------------------------------------------------------- */

async function loadDashboard(user) {
  if (!user?.id) return;

  if (loadingUserId === user.id) return;

  if (loadedUserId === user.id) {
    showScreen("dashboard");
    return;
  }

  loadingUserId = user.id;

  /* Start a fresh notification session for this user. */
  activeNotificationsUserId = user.id;
  notificationItems = [];
  notificationFilter = "all";
  updateNotificationCount();
  loadNotifications(user.id, true);

  /* A newly signed-in account starts with a clean page-position history. */
  activeDashboardTab = null;
  navHistory = [];
  Object.keys(dashboardScrollPositions).forEach((key) => {
    delete dashboardScrollPositions[key];
  });

  showScreen("dashboard");
  showTab("home");

  if (elements.welcome) {
    elements.welcome.textContent = "Welcome to GGRData";
  }

  if (elements.balance) {
    elements.balance.textContent = "₦00,000.00";
    elements.balance.classList.add("skeleton-text");
  }

  showTransactionSkeleton();

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

    /* Ignore dashboard results if the signed-in user changed. */
    if (loadedUserId && loadedUserId !== user.id) return;

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

    currentUsername = String(user.user_metadata?.username || "").trim();

    if (elements.profileDisplayName) {
      elements.profileDisplayName.textContent = name;
    }

    if (elements.profileUsername) {
      elements.profileUsername.textContent = currentUsername
        ? `@${currentUsername}`
        : "";
    }

    if (elements.profileAvatar) {
      elements.profileAvatar.textContent =
        name.trim().charAt(0).toUpperCase() || "G";
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

    profileInfo = {
      name,
      username: currentUsername,
      email: profile?.email || user.email || "",
      phone:
        profile?.phone_e164 || user.user_metadata?.phone_e164 || "",
      joined: user.created_at || ""
    };

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
    lastRefreshAt = Date.now();
    elements.balance?.classList.remove("skeleton-text");
  }
}

/* ---------------------------------------------------------
   22. SIGN OUT
   --------------------------------------------------------- */

function clearNotificationSession() {
  activeNotificationsUserId = null;
  notificationItems = [];
  notificationFilter = "all";

  /* Invalidate outstanding notification requests. */
  notificationsRequestNumber += 1;

  updateNotificationCount();

  if (elements.notificationsList) {
    elements.notificationsList.replaceChildren();

    const empty = document.createElement("div");
    empty.className = "notifications-empty";
    empty.textContent = "Sign in to view your notifications.";

    elements.notificationsList.appendChild(empty);
  }

  document.querySelectorAll("[data-notification-filter]").forEach((button) => {
    const active = button.dataset.notificationFilter === "all";

    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

if (elements.logoutBtn) {
  elements.logoutBtn.addEventListener("click", async () => {
    elements.logoutBtn.disabled = true;

    try {
      const { error } = await supabaseClient.auth.signOut();

      if (error) throw error;

      loadedUserId = null;
      loadingUserId = null;
      currentWalletBalance = null;
      lastBalanceText = "";

      clearNotificationSession();

      showAuth();

    } catch (error) {
      console.error("Sign out error:", error);

      showDashboardMessage(
        "We could not sign you out. Please try again.",
        "error"
      );
    } finally {
      elements.logoutBtn.disabled = false;
    }
  });
}

/* ---------------------------------------------------------
   23. SUPABASE AUTH STATE LISTENER
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

    clearNotificationSession();

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
   24. INITIAL APPLICATION STATE
   --------------------------------------------------------- */

async function initialiseApplication() {
  updateRecentBeneficiaryDisplay();

  try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) throw error;

    if (data.session?.user) {
      await loadDashboard(data.session.user);
    } else if (!isPasswordRecovery) {
      clearNotificationSession();
      showAuth();
    }

  } catch (error) {
    console.error("Session initialisation error:", error);

    clearNotificationSession();
    showAuth();

    showMessage(
      "We could not verify your session. Please sign in again.",
      "error"
    );
  }
}

/* ---------------------------------------------------------
   26. USER EXPERIENCE ENHANCEMENTS
   Skeletons, refresh, offline banner, input polish
   --------------------------------------------------------- */

let lastRefreshAt = Date.now();
let refreshing = false;

function showSkeletonRows(container, count = 3) {
  if (!container) return;

  container.replaceChildren();

  for (let i = 0; i < count; i += 1) {
    const row = document.createElement("div");
    row.className = "skeleton-row";
    row.setAttribute("aria-hidden", "true");
    row.innerHTML =
      '<span class="skeleton sk-icon"></span>' +
      '<span class="sk-lines"><span class="skeleton sk-line"></span>' +
      '<span class="skeleton sk-line short"></span></span>' +
      '<span class="skeleton sk-amount"></span>';
    container.append(row);
  }
}

function showSkeletonCards(container, count = 4) {
  if (!container) return;

  container.replaceChildren();

  for (let i = 0; i < count; i += 1) {
    const card = document.createElement("div");
    card.className = "data-plan-card sk-card";
    card.setAttribute("aria-hidden", "true");
    card.innerHTML =
      '<span class="skeleton sk-line"></span>' +
      '<span class="skeleton sk-line short"></span>' +
      '<span class="skeleton sk-price"></span>';
    container.append(card);
  }
}

function showTransactionSkeleton() {
  const box = elements.recentTransactions;
  if (!box) return;

  box.className = "tx-list";
  showSkeletonRows(box, 3);
}

function showRetryState(container, text, onRetry) {
  if (!container) return;

  container.replaceChildren();

  const box = document.createElement("div");
  box.className = "notifications-empty";
  box.textContent = text + " ";

  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "retry-button";
  retry.textContent = "Try again";
  retry.addEventListener("click", onRetry);

  box.append(retry);
  container.append(box);
}

function focusActiveView(tabName) {
  const id = TAB_VIEW_IDS[tabName];
  const view = id ? document.getElementById(id) : null;
  const heading = view?.querySelector("h2");

  if (!heading) return;

  heading.setAttribute("tabindex", "-1");
  heading.focus({ preventScroll: true });
}

/* ----- Refresh ----- */

async function refreshAccountData(manual = false) {
  if (refreshing || !loadedUserId) return;

  if (!navigator.onLine) {
    if (manual) {
      showDashboardMessage(
        "You are offline. Reconnect and try again.",
        "error",
        true
      );
    }
    return;
  }

  refreshing = true;

  const userId = loadedUserId;
  document.body.classList.add("is-refreshing");

  try {
    const [walletResult, txResult] = await Promise.all([
      supabaseClient
        .from("wallets")
        .select("balance, currency")
        .eq("user_id", userId)
        .maybeSingle(),

      supabaseClient
        .from("wallet_transactions")
        .select(
          "id, transaction_type, direction, amount, balance_before, balance_after, description, reference, created_at"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50)
    ]);

    if (loadedUserId !== userId) return;

    if (
      !walletResult.error &&
      walletResult.data &&
      Number.isFinite(Number(walletResult.data.balance))
    ) {
      currentWalletBalance = Number(walletResult.data.balance);
      lastBalanceText = formatNaira(walletResult.data.balance);
      elements.balance.textContent = lastBalanceText;
      applyBalanceVisibility();
    }

    if (txResult.error) {
      if (manual) renderTransactionError(elements.recentTransactions);
    } else {
      renderTransactions(elements.recentTransactions, txResult.data || [], 50);
    }

    await loadNotifications(userId, false);

    lastRefreshAt = Date.now();

    if (manual) {
      showDashboardMessage("You are up to date.", "success", true);
    }

  } catch (error) {
    console.error("Refresh error:", error);

    if (manual) {
      showDashboardMessage(
        "We could not refresh just now. Please try again.",
        "error",
        true
      );
    }

  } finally {
    refreshing = false;
    document.body.classList.remove("is-refreshing");
  }
}

document.addEventListener("visibilitychange", () => {
  if (
    document.visibilityState === "visible" &&
    Date.now() - lastRefreshAt > 60000
  ) {
    refreshAccountData(false);
  }
});

/* ----- Offline banner ----- */

const offlineBanner = document.createElement("div");
offlineBanner.id = "offlineBanner";
offlineBanner.className = "offline-banner hidden";
offlineBanner.setAttribute("role", "status");
offlineBanner.textContent =
  "You are offline. Balances and updates will refresh when you reconnect.";
document.body.prepend(offlineBanner);

function syncOnlineState() {
  offlineBanner.classList.toggle("hidden", navigator.onLine);
}

window.addEventListener("offline", syncOnlineState);

window.addEventListener("online", () => {
  syncOnlineState();
  refreshAccountData(false);
});

syncOnlineState();

/* ----- Pull to refresh ----- */

(function setupPullToRefresh() {
  const indicator = document.createElement("div");
  indicator.className = "pull-indicator";
  indicator.setAttribute("aria-hidden", "true");
  indicator.textContent = "↓";
  document.body.append(indicator);

  let startY = null;
  let pull = 0;
  const THRESHOLD = 80;

  const active = () =>
    elements.dashboardScreen &&
    !elements.dashboardScreen.classList.contains("hidden") &&
    document.getElementById("txSheet")?.classList.contains("hidden") !== false;

  document.addEventListener("touchstart", (event) => {
    startY = active() && window.scrollY <= 0
      ? event.touches[0].clientY
      : null;
    pull = 0;
  }, { passive: true });

  document.addEventListener("touchmove", (event) => {
    if (startY === null) return;

    pull = Math.max(0, event.touches[0].clientY - startY);

    if (pull > 0 && window.scrollY <= 0) {
      const shown = Math.min(pull * 0.5, 56);
      indicator.style.transform = `translate(-50%, ${shown - 44}px)`;
      indicator.style.opacity = String(Math.min(pull / THRESHOLD, 1));
      indicator.classList.toggle("ready", pull >= THRESHOLD);
    }
  }, { passive: true });

  document.addEventListener("touchend", () => {
    if (startY === null) return;

    const ready = pull >= THRESHOLD;

    indicator.style.transform = "";
    indicator.style.opacity = "";
    indicator.classList.remove("ready");

    startY = null;
    pull = 0;

    if (ready) refreshAccountData(true);
  });
})();

/* ----- Input polish ----- */

function addPasswordToggles() {
  document.querySelectorAll('input[type="password"]').forEach((input) => {
    if (input.closest(".password-wrap")) return;

    const wrap = document.createElement("div");
    wrap.className = "password-wrap";

    input.parentNode.insertBefore(wrap, input);
    wrap.append(input);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "pw-toggle";
    toggle.textContent = "Show";
    toggle.setAttribute("aria-label", "Show password");
    toggle.setAttribute("aria-pressed", "false");

    toggle.addEventListener("click", () => {
      const show = input.type === "password";

      input.type = show ? "text" : "password";
      toggle.textContent = show ? "Hide" : "Show";
      toggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
      toggle.setAttribute("aria-pressed", String(show));
    });

    wrap.append(toggle);
  });
}

function formatPhoneAsTyped(input) {
  if (input.selectionStart !== input.value.length) return;

  const raw = input.value;

  if (raw.trim().startsWith("+")) return;

  const digits = raw.replace(/\D/g, "").slice(0, 11);

  if (!digits.startsWith("0")) {
    input.value = digits;
    return;
  }

  input.value = [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7, 11)]
    .filter(Boolean)
    .join(" ");
}

function polishInputs() {
  addPasswordToggles();

  ["phone", "dataPhone", "airtimePhone"].forEach((id) => {
    const input = document.getElementById(id);
    if (!input) return;

    input.setAttribute("inputmode", "tel");
    input.setAttribute("maxlength", "16");
    input.addEventListener("input", () => formatPhoneAsTyped(input));
  });

  const email = document.getElementById("email");

  if (email) {
    email.setAttribute("autocapitalize", "none");
    email.setAttribute("autocorrect", "off");
    email.setAttribute("spellcheck", "false");
    email.setAttribute("enterkeyhint", "next");
  }

  document.getElementById("password")?.setAttribute("enterkeyhint", "go");

  document.getElementById("notificationBtn")?.setAttribute("aria-label", "Notifications");

  document.querySelectorAll("button:not([type])").forEach((button) => {
    button.type = "button";
  });
}

/* ---------------------------------------------------------
   25. PAGE BARS, BACK NAVIGATION, PURCHASE FLOW, INFO PAGES
   --------------------------------------------------------- */

/* Fill these in with your real details. Empty values are hidden. */
const SITE_CONTACT = {
  whatsapp: "",   // e.g. "2348012345678" (digits only, with country code)
  phone: "",      // e.g. "08012345678"
  email: "",      // e.g. "support@yourdomain.com"
  address: "",    // e.g. "12 Example Street, Lagos"
  hours: ""       // e.g. "Mon–Sat, 8am–8pm"
};

/* Airtime purchases switch on when the secure airtime function exists. */
const AIRTIME_PURCHASE_LIVE = false;

const NETWORK_LOGOS = {
  mtn: "./assets/mtn.png",
  airtel: "./assets/airtel.png",
  glo: "./assets/glo.jpg"
};

const ROOT_TABS = ["transactions", "wallet", "profile"];

let navHistory = [];
let profileInfo = null;
let pendingPurchase = null;
let purchaseInProgress = false;

/* ----- Page bars with a back arrow on every page ----- */

const PAGE_TITLES = {
  dataStoreView: "Data bundles",
  airtimeView: "Airtime",
  notificationsView: "Notifications",
  profileView: "Profile",
  transactionsView: "Transactions",
  walletView: "Wallet",
  purchaseView: "Confirm purchase",
  infoView: "",
  serviceView: ""
};

function svgIcon(id, className = "ico") {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", className);
  svg.setAttribute("aria-hidden", "true");

  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `#${id}`);
  svg.append(use);

  return svg;
}

function buildPageBars() {
  Object.entries(PAGE_TITLES).forEach(([id, title]) => {
    const view = document.getElementById(id);

    if (!view || view.querySelector(":scope > .page-bar")) return;

    const bar = el("div", "page-bar");

    const back = el("button", "page-back");
    back.type = "button";
    back.dataset.back = "true";
    back.setAttribute("aria-label", "Go back");
    back.append(svgIcon("i-back"));

    const heading = el("span", "page-bar-title", title);
    heading.id = `${id}Title`;

    const action = el("span", "page-bar-action");

    bar.append(back, heading, action);
    view.prepend(bar);

    if (id === "dataStoreView" || id === "airtimeView") {
      const next = el("button", "page-next", "Next");
      next.type = "button";
      next.id = id === "dataStoreView" ? "dataNextBtn" : "airtimeNextBtn";
      next.dataset.next = id === "dataStoreView" ? "data" : "airtime";
      next.append(svgIcon("i-chev"));
      action.append(next);
    }
  });
}

function setPageTitle(viewId, text) {
  const node = document.getElementById(`${viewId}Title`);
  if (node) node.textContent = text;
}

function pushBrowserState(tabName) {
  try {
    history.pushState({ ggrTab: tabName }, "");
  } catch (error) {
    /* History is optional. */
  }
}

function goBack(fromBrowser = false) {
  if (fromBrowser && activeDashboardTab === "home") return;

  const previous = navHistory.pop() || "home";

  showTab(previous, { fromBack: true });
}

window.addEventListener("popstate", () => {
  if (elements.dashboardScreen?.classList.contains("hidden")) return;

  goBack(true);
});

document.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof Element)) return;

  if (target.closest("[data-back]")) {
    if (history.state && history.state.ggrTab) {
      history.back();
    } else {
      goBack();
    }
  }
});

/* ----- Network tick ----- */

function syncNetworkTicks() {
  const pairs = [
    ["#dataStoreView .data-network-selector", elements.dataPhone],
    ["#airtimeView .data-network-selector", elements.airtimePhone]
  ];

  pairs.forEach(([selector, input]) => {
    const group = document.querySelector(selector);
    if (!group || !input) return;

    group.classList.toggle(
      "has-tick",
      Boolean(normaliseNigerianPhone(input.value))
    );
  });
}

document.addEventListener("input", syncNetworkTicks);

/* ----- Next buttons ----- */

function getAirtimeNetwork() {
  return (
    document.querySelector(
      '.net-picker[data-picker="airtime"] .net-option.active'
    )?.dataset.net || "mtn"
  );
}

function getAirtimeAmount() {
  const value = Number(document.getElementById("airtimeAmount")?.value);

  return Number.isFinite(value) ? Math.round(value) : 0;
}

function nextProblem(kind) {
  if (kind === "data") {
    if (!normaliseNigerianPhone(elements.dataPhone?.value || "")) {
      elements.dataPhone?.focus();
      return "Enter a valid Nigerian phone number to continue.";
    }

    if (!selectedDataPlan) {
      return "Select a bundle to continue.";
    }

    return "";
  }

  if (!normaliseNigerianPhone(elements.airtimePhone?.value || "")) {
    elements.airtimePhone?.focus();
    return "Enter a valid Nigerian phone number to continue.";
  }

  const amount = getAirtimeAmount();

  if (amount < 50 || amount > 50000) {
    document.getElementById("airtimeAmount")?.focus();
    return "Enter an airtime amount between ₦50 and ₦50,000.";
  }

  return "";
}

function updateNextButtons() {
  const data = document.getElementById("dataNextBtn");
  const airtime = document.getElementById("airtimeNextBtn");

  /* Do not move focus while only checking readiness. */
  const check = (kind) => {
    const phoneInput =
      kind === "data" ? elements.dataPhone : elements.airtimePhone;

    if (!normaliseNigerianPhone(phoneInput?.value || "")) return false;

    if (kind === "data") return Boolean(selectedDataPlan);

    const amount = getAirtimeAmount();

    return amount >= 50 && amount <= 50000;
  };

  data?.classList.toggle("is-ready", check("data"));
  airtime?.classList.toggle("is-ready", check("airtime"));
}

document.addEventListener("input", updateNextButtons);

document.addEventListener("click", () => {
  setTimeout(updateNextButtons, 0);
});

function onBundleSelected() {
  updateNextButtons();

  const next = document.getElementById("dataNextBtn");

  if (next) {
    next.classList.remove("pulse-once");
    void next.offsetWidth;
    next.classList.add("pulse-once");
  }

  const ready = Boolean(
    normaliseNigerianPhone(elements.dataPhone?.value || "")
  );

  setCatalogueStatus(
    ready
      ? `${selectedDataPlan.name} selected. Tap Next at the top right to review and buy.`
      : `${selectedDataPlan.name} selected. Enter the recipient's phone number, then tap Next.`,
    "success"
  );
}

document.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof Element)) return;

  const next = target.closest("[data-next]");

  if (next) {
    goToPurchase(next.dataset.next);
    return;
  }

  if (target.closest("#airtimeBuyBtn")) {
    goToPurchase("airtime");
  }
});

/* ----- Purchase page ----- */

function newPurchaseKey() {
  return `ggrdata_${crypto.randomUUID().replaceAll("-", "")}`;
}

function goToPurchase(kind) {
  const problem = nextProblem(kind);

  if (problem) {
    showDashboardMessage(problem, "error", true);
    return;
  }

  if (kind === "data") {
    pendingPurchase = {
      kind: "data",
      network: selectedDataNetwork,
      phone: getLocalPhoneDigits(elements.dataPhone.value),
      amount: Number(selectedDataPlan.amount),
      planName: String(selectedDataPlan.name),
      planCode: String(selectedDataPlan.code || ""),
      key: newPurchaseKey(),
      state: "review"
    };
  } else {
    pendingPurchase = {
      kind: "airtime",
      network: getAirtimeNetwork(),
      phone: getLocalPhoneDigits(elements.airtimePhone.value),
      amount: getAirtimeAmount(),
      planName: "",
      planCode: "",
      key: newPurchaseKey(),
      state: "review"
    };
  }

  renderPurchaseReview();
  showTab("purchase");
}

function purchaseRow(label, value) {
  const row = el("div", "detail-row");

  row.append(el("span", "", label), el("b", "", value));

  return row;
}

function renderPurchaseReview(notice = "") {
  const body = document.getElementById("purchaseBody");
  const p = pendingPurchase;

  if (!body || !p) return;

  body.replaceChildren();

  const isData = p.kind === "data";
  const networkName = SUPPORTED_DATA_NETWORKS[p.network] || p.network;

  const hero = el("div", "purchase-hero");
  const logo = el("img", "purchase-logo");
  logo.src = NETWORK_LOGOS[p.network] || "";
  logo.alt = `${networkName} logo`;
  logo.width = 56;
  logo.height = 56;

  const heroText = el("div", "purchase-hero-text");
  heroText.append(
    el("small", "", isData ? "DATA BUNDLE" : "AIRTIME TOP-UP"),
    el("strong", "", formatNaira(p.amount)),
    el("span", "", isData ? p.planName : `${networkName} airtime`)
  );

  hero.append(logo, heroText);

  const details = el("div", "purchase-card");
  details.append(
    purchaseRow("Service", isData ? "Data bundle" : "Airtime"),
    purchaseRow("Network", networkName),
    ...(isData ? [purchaseRow("Bundle", p.planName)] : []),
    purchaseRow("Recipient", p.phone),
    purchaseRow("Amount", formatNaira(p.amount)),
    purchaseRow("Total to pay", formatNaira(p.amount))
  );

  const balance = currentWalletBalance;
  const enough = balance === null || balance >= p.amount;

  const wallet = el("div", `purchase-wallet${enough ? "" : " low"}`);

  const walletLeft = el("div");
  walletLeft.append(
    el("small", "", "WALLET BALANCE"),
    el("strong", "", balance === null ? "Not available" : formatNaira(balance))
  );

  const walletRight = el("div", "purchase-after");
  walletRight.append(
    el("small", "", "AFTER PURCHASE"),
    el(
      "strong",
      "",
      balance === null
        ? "—"
        : enough
          ? formatNaira(balance - p.amount)
          : "Insufficient"
    )
  );

  wallet.append(walletLeft, walletRight);

  body.append(hero, details, wallet);

  if (!enough) {
    const fund = el("button", "button-outline", "Fund wallet to continue");
    fund.type = "button";
    fund.addEventListener("click", () => showComingSoon("Wallet funding"));
    body.append(fund);
  }

  if (notice) {
    body.append(el("p", "purchase-notice", notice));
  }

  body.append(
    el(
      "p",
      "purchase-safety",
      "Please check the number and amount. Your wallet is debited only after the order is validated, and a failed delivery is refunded to your wallet."
    )
  );

  const confirm = el(
    "button",
    "button-primary purchase-confirm",
    `Purchase ${formatNaira(p.amount)}`
  );

  confirm.type = "button";
  confirm.id = "purchaseConfirmBtn";
  confirm.disabled = !enough || purchaseInProgress;
  confirm.addEventListener("click", confirmPurchase);

  body.append(confirm);
}

function renderPurchaseResult(kind, title, message, reference = "") {
  const body = document.getElementById("purchaseBody");
  const p = pendingPurchase;

  if (!body || !p) return;

  body.replaceChildren();

  const symbol = { success: "✓", failed: "✕", pending: "◷" }[kind] || "•";

  const card = el("div", `purchase-result ${kind}`);

  card.append(
    el("span", "purchase-result-icon", symbol),
    el("h3", "", title),
    el("p", "", message)
  );

  const rows = el("div", "purchase-card");

  rows.append(
    purchaseRow("Network", SUPPORTED_DATA_NETWORKS[p.network] || p.network),
    purchaseRow("Recipient", p.phone),
    purchaseRow("Amount", formatNaira(p.amount))
  );

  if (reference) rows.append(purchaseRow("Reference", reference));

  card.append(rows);
  body.append(card);

  const done = el("button", "button-primary", "Done");
  done.type = "button";
  done.addEventListener("click", () => showTab("home"));

  const history = el("button", "button-outline", "View transactions");
  history.type = "button";
  history.addEventListener("click", () => showTab("transactions"));

  body.append(done, history);
}

function clearSelectionsAfterPurchase() {
  selectedDataPlan = null;

  document
    .querySelectorAll("#dataPlans .data-plan-card.selected")
    .forEach((card) => {
      card.classList.remove("selected");
      const button = card.querySelector(".data-plan-select");
      if (button) button.textContent = "Select bundle";
    });

  const amount = document.getElementById("airtimeAmount");
  if (amount) amount.value = "";

  document
    .querySelectorAll("#amountGrid .amount-chip")
    .forEach((chip) => chip.classList.remove("selected"));

  updateNextButtons();
}

async function confirmPurchase() {
  const p = pendingPurchase;

  if (!p || purchaseInProgress) return;

  if (currentWalletBalance !== null && currentWalletBalance < p.amount) {
    showDashboardMessage(
      "Your wallet balance is not enough for this purchase.",
      "error",
      true
    );
    return;
  }

  if (p.kind === "airtime" && !AIRTIME_PURCHASE_LIVE) {
    renderPurchaseReview(
      "Airtime purchases are being connected and are not live yet. Nothing has been charged."
    );
    return;
  }

  if (p.kind === "data" && !p.planCode) {
    renderPurchaseReview(
      "This bundle has no verified plan code. Go back, refresh the list and choose another bundle."
    );
    return;
  }

  purchaseInProgress = true;

  const button = document.getElementById("purchaseConfirmBtn");

  if (button) {
    button.disabled = true;
    button.textContent = "Processing…";
  }

  try {
    const { data: sessionData, error: sessionError } =
      await supabaseClient.auth.getSession();

    const accessToken = sessionData?.session?.access_token;

    if (sessionError || !accessToken) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    const slug =
      p.kind === "data" ? "vtpass-data-purchase" : "vtpass-airtime-purchase";

    const payload =
      p.kind === "data"
        ? {
            action: "purchase",
            network: p.network,
            phone: p.phone,
            variationCode: p.planCode,
            idempotencyKey: p.key
          }
        : {
            action: "purchase",
            network: p.network,
            phone: p.phone,
            amount: p.amount,
            idempotencyKey: p.key
          };

    const response = await fetch(`${SUPABASE_URL}/functions/v1/${slug}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_PUBLISHABLE_KEY,
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || !result) {
      throw new Error(
        result?.error || `Purchase request failed (${response.status}).`
      );
    }

    const status = String(result.status || "processing").toLowerCase();
    const reference = result.orderId || result.requestId || "";

    if (["successful", "success", "completed"].includes(status)) {
      p.state = "done";
      saveRecentBeneficiary(p.phone);
      clearSelectionsAfterPurchase();

      renderPurchaseResult(
        "success",
        "Purchase successful",
        result.message || "Your purchase has been delivered.",
        reference
      );

    } else if (["failed", "reversed"].includes(status)) {
      p.state = "done";

      renderPurchaseResult(
        "failed",
        "Purchase failed",
        result.message ||
          "The purchase could not be completed. Any debit is refunded to your wallet.",
        reference
      );

    } else if (result.success && status === "processing") {
      p.state = "done";
      clearSelectionsAfterPurchase();

      renderPurchaseResult(
        "pending",
        "Purchase processing",
        result.message ||
          "We are confirming this purchase with the provider. Check your transactions for updates.",
        reference
      );

    } else {
      throw new Error(
        result.error || result.message || "The purchase could not be confirmed."
      );
    }

    refreshWalletAfterDataPurchase();

  } catch (error) {
    console.error("Purchase error:", error);

    renderPurchaseReview(
      error instanceof Error
        ? error.message
        : "The purchase could not be completed. Please try again."
    );

  } finally {
    purchaseInProgress = false;
  }
}

/* ----- Information pages (profile settings) ----- */

function infoCard(title, paragraphs = []) {
  const card = el("section", "info-card");

  if (title) card.append(el("h3", "", title));

  paragraphs.forEach((text) => card.append(el("p", "", text)));

  return card;
}

function infoRows(rows) {
  const card = el("div", "purchase-card");

  rows
    .filter(([, value]) => value)
    .forEach(([label, value]) => card.append(purchaseRow(label, value)));

  return card;
}

function faqList(items) {
  const wrap = el("div", "faq-list");

  items.forEach(([question, answer]) => {
    const item = document.createElement("details");
    item.className = "faq-item";

    item.append(el("summary", "", question), el("p", "", answer));
    wrap.append(item);
  });

  return wrap;
}

function actionButton(label, onClick, outline = false) {
  const button = el(
    "button",
    outline ? "button-outline" : "button-primary",
    label
  );

  button.type = "button";
  button.addEventListener("click", onClick);

  return button;
}

function linkButton(label, href) {
  const link = el("a", "button-primary info-link", label);

  link.href = href;
  link.target = href.startsWith("http") ? "_blank" : "_self";
  link.rel = "noopener";

  return link;
}

function formatMemberSince(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function contactButtons() {
  const buttons = [];

  if (SITE_CONTACT.whatsapp) {
    buttons.push(
      linkButton(
        "Chat on WhatsApp",
        `https://wa.me/${SITE_CONTACT.whatsapp.replace(/\D/g, "")}`
      )
    );
  }

  if (SITE_CONTACT.phone) {
    buttons.push(
      linkButton(
        `Call ${SITE_CONTACT.phone}`,
        `tel:${SITE_CONTACT.phone.replace(/\s/g, "")}`
      )
    );
  }

  if (SITE_CONTACT.email) {
    buttons.push(
      linkButton("Send an email", `mailto:${SITE_CONTACT.email}`)
    );
  }

  return buttons;
}

const INFO_PAGES = {
  profile() {
    const info = profileInfo || {};
    const name = info.name || "GGRData Member";
    const pack =
      document.getElementById("userPackage")?.textContent.trim() ||
      "GGR Starter";

    const head = el("div", "profile-head");
    const avatar = el(
      "span",
      "profile-avatar",
      name.trim().charAt(0).toUpperCase() || "G"
    );

    head.append(avatar, el("h2", "", name));

    if (info.username) {
      head.append(el("span", "profile-username", `@${info.username}`));
    }

    return {
      title: "My profile",
      nodes: [
        head,
        infoRows([
          ["Full name", name],
          ["Username", info.username ? `@${info.username}` : ""],
          ["Email address", info.email],
          ["Phone number", info.phone],
          ["Account package", pack],
          ["Account status", "Active"],
          ["Member since", formatMemberSince(info.joined)]
        ]),
        el(
          "p",
          "purchase-safety",
          "To change your name, email or phone number, contact support. Your password can be reset from the sign-in screen."
        )
      ]
    };
  },

  pricing() {
    return {
      title: "Pricing",
      nodes: [
        infoCard("Clear, live prices", [
          "Data bundle prices come straight from the live catalogue and are shown before you buy. The price you see on the confirmation page is the amount debited from your wallet.",
          "Airtime is charged at the amount you enter. Bundle availability and prices can change when the network or provider updates them, so always check the confirmation page."
        ]),
        actionButton("View live data prices", () => openDataStore())
      ]
    };
  },

  codes() {
    const dial = (code) => `tel:${code.replace("#", "%23")}`;

    const codeCard = (label, code) => {
      const row = el("div", "code-row");
      const text = el("div");

      text.append(el("small", "", label), el("strong", "", code));

      const call = el("a", "code-dial", "Dial");
      call.href = dial(code);

      row.append(text, call);
      return row;
    };

    const list = el("div", "purchase-card code-card");

    list.append(
      codeCard("Airtime (account) balance", "*310#"),
      codeCard("Data balance", "*323#")
    );

    return {
      title: "Balance codes",
      nodes: [
        infoCard("Check your balance", [
          "These are the unified codes published by the Nigerian Communications Commission. They work on MTN, Airtel and Glo."
        ]),
        list,
        el(
          "p",
          "purchase-safety",
          "If a code does not respond on your SIM, your network may still use its own older code. Check with your network provider."
        )
      ]
    };
  },

  contact() {
    const buttons = contactButtons();

    const nodes = [];

    if (buttons.length) {
      nodes.push(
        infoCard("We are here to help", [
          SITE_CONTACT.hours
            ? `Support hours: ${SITE_CONTACT.hours}.`
            : "Reach us on any of the channels below."
        ]),
        ...buttons
      );
    } else {
      nodes.push(
        infoCard("Contact support", [
          "Our support contact details will appear here soon.",
          "In the meantime, quote the reference from your Transactions page for any order question."
        ])
      );
    }

    return { title: "Contact us", nodes };
  },

  complaint() {
    const steps = faqList([
      [
        "1. Find the transaction",
        "Open Transactions and tap the order you want to report."
      ],
      [
        "2. Copy the reference",
        "Tap “Copy reference” on the details sheet. The reference helps support find your order quickly."
      ],
      [
        "3. Send it to support",
        "Send the reference with a short description of what went wrong and the number you used."
      ]
    ]);

    steps.querySelectorAll("details").forEach((d) => (d.open = true));

    return {
      title: "Log a complaint",
      nodes: [
        infoCard("Report a problem", [
          "If a purchase did not arrive or a debit looks wrong, follow these steps. Failed deliveries are refunded to your wallet automatically."
        ]),
        steps,
        actionButton("Open my transactions", () => showTab("transactions")),
        ...contactButtons()
      ]
    };
  },

  limits() {
    const pack =
      document.getElementById("userPackage")?.textContent.trim() ||
      "GGR Starter";

    return {
      title: "Account limits",
      nodes: [
        infoRows([
          ["Account package", pack],
          ["Airtime per purchase", "₦50 – ₦50,000"],
          ["Data bundles", "Price of the selected bundle"],
          ["Wallet funding limits", "Shown when funding is live"]
        ]),
        el(
          "p",
          "purchase-safety",
          "Limits protect your wallet and may change as account levels are introduced. Any change will be shown here."
        )
      ]
    };
  },

  upgrade() {
    const pack =
      document.getElementById("userPackage")?.textContent.trim() ||
      "GGR Starter";

    return {
      title: "Upgrade account",
      nodes: [
        infoRows([["Current package", pack]]),
        infoCard("Account upgrades", [
          "Account upgrades are not open yet. When they are, you will see the available packages and what each one includes on this page."
        ])
      ]
    };
  },

  help() {
    return {
      title: "Help & support",
      nodes: [
        faqList([
          [
            "How do I buy data or airtime?",
            "Choose Data or Airtime, enter the recipient's number (the network is detected automatically), pick a bundle or amount, then tap Next. Review the details and tap Purchase."
          ],
          [
            "How do I fund my wallet?",
            "Wallet funding is being switched on after payment verification is fully tested. Your funding details will appear on the home screen."
          ],
          [
            "My purchase is still processing",
            "Some purchases take a little time to be confirmed by the provider. Your wallet debit is held while it is checked. Open Transactions for updates. If it fails, the amount is refunded to your wallet."
          ],
          [
            "I sent airtime or data to a wrong number",
            "Always check the number on the confirmation page before you buy. Delivered purchases cannot be recalled, but contact support with your reference and we will look into it."
          ],
          [
            "Which networks are supported?",
            "MTN, Airtel and Glo."
          ],
          [
            "Where do I find my transaction reference?",
            "Open Transactions, tap an order, and use Copy reference."
          ]
        ]),
        actionButton("Contact support", () => openInfoPage("contact"), true)
      ]
    };
  },

  legal() {
    return {
      title: "Legal",
      nodes: [
        faqList([
          [
            "Privacy",
            "We collect the details you give us when you register (name, username, email and phone number) and your wallet and order records. We use them to run your account, deliver your purchases and provide support. Your records are stored securely and each account can only access its own information. We share only what is needed with the payment and delivery providers that complete your orders. GGRData will never ask for your password."
          ],
          [
            "Terms of use",
            "Use GGRData lawfully and keep your sign-in details private. You are responsible for entering the correct recipient number and amount. Your wallet is debited when an order is accepted and refunded if delivery fails. Prices and availability depend on the networks and providers and may change. We may suspend accounts that are misused."
          ],
          [
            "Security",
            "Payments and purchases are processed on secure servers. Wallet changes are made only by the system after verification, not by the app on your device."
          ]
        ])
      ]
    };
  },

  address() {
    return {
      title: "Our address",
      nodes: [
        SITE_CONTACT.address
          ? infoRows([["Address", SITE_CONTACT.address]])
          : infoCard("Our address", [
              "Our office address will be shown here soon."
            ]),
        ...contactButtons()
      ]
    };
  }
};

function openInfoPage(key) {
  const build = INFO_PAGES[key];

  if (!build) return;

  const page = build();
  const body = document.getElementById("infoBody");

  if (!body) return;

  body.replaceChildren(...page.nodes);
  setPageTitle("infoView", page.title);

  showTab("info");
}

document.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof Element)) return;

  const item = target.closest('[data-profile="info"]');

  if (item) {
    openInfoPage(item.dataset.info);
  }
});

buildPageBars();
syncNetworkTicks();
updateNextButtons();


polishInputs();

initialiseApplication();
