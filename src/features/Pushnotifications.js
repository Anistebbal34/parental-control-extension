// ==========================================
// PUSH NOTIFICATIONS FEATURE
// ==========================================
// Handles server push notifications and settings synchronization

const SERVER_PUBLIC_KEY =
  "BFONSoxhHlMKzLP_ZepAvrHSU0SRDMaqmaPwtqlEdmrkt4xYhpw3Z3XKLVwsLC7dtEGX9rEQnFqTF1H2_AxErCE";

function urlB64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const applicationServerKey = urlB64ToUint8Array(SERVER_PUBLIC_KEY);

/**
 * Subscribe to push notifications safely
 */
async function subscribeToPushSafe() {
  const existing = await self.registration.pushManager.getSubscription();
  if (existing) {
    console.log("✅ [FCM] Push already subscribed");
    return existing;
  }

  console.log("[FCM] Push not yet subscribed");
  const subscription = await self.registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });

  console.log("🆕 [FCM] Push subscription created");

  await fetch("http://localhost:3000/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription),
  });

  return subscription;
}

/**
 * Handle incoming push signal from server
 */
async function handlePushSignal() {
  try {
    // 1️⃣ Fetch latest settings
    const res = await fetch("http://localhost:3000/settings/latest");
    const data = await res.json();

    const { version, settings } = data;

    console.log("📥 Latest settings fetched:", version, settings);
    const stored = await chrome.storage.local.get("appliedVersion");

    if (stored.appliedVersion === version) {
      console.log("✅ Settings already applied");
      return;
    }

    // 2️⃣ Apply settings
    await chrome.storage.local.set({
      ...settings,
      appliedVersion: version,
      lastUpdateTimestamp: Date.now(),
    });

    // 3️⃣ Optional notification (debug only)
    await self.registration.showNotification("Settings updated", {
      body: `Applied version ${version}`,
    });

    // 4️⃣ ACK back to backend
    await fetch("http://localhost:3000/push-ack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version,
        appliedAt: Date.now(),
      }),
    });

    console.log("✅ ACK sent for version", version);
  } catch (err) {
    console.error("❌ Push handling failed:", err);
  }
}

/**
 * Fetch latest settings from server
 */
async function fetchLatestSettings() {
  console.warn("🔁[FCM] fetchLatestSettings");
  const res = await fetch("http://localhost:3000/device-status");

  const status = await res.json();
  console.log("🔁[FCM]", status);

  if (status.pending) {
    console.log("🟡 Pending settings detected, waiting for push");
    await handlePushSignal();
  }
}

/**
 * Setup push notification listeners
 */
export function setupPushNotifications() {
  // Install event
  self.addEventListener("install", (event) => {
    console.log("[FCM] Service worker installed, subscribing...");
  });

  // Activate event
  self.addEventListener("activate", (event) => {
    console.log("[FCM] Service worker activated, checking subscription...");
    subscribeToPushSafe();
  });

  // Push event
  self.addEventListener("push", (event) => {
    console.log("🔔 [FCM] Push signal received");
    event.waitUntil(handlePushSignal());
  });

  // Subscription change event
  self.addEventListener("pushsubscriptionchange", async (event) => {
    console.log("[FCM] Push subscription changed, resubscribing...");
    await subscribeToPushSafe();
  });

  console.log("✅ Push notifications feature initialized");
}

/**
 * Initialize push on startup
 */
export function initializePushOnStartup() {
  subscribeToPushSafe();
  fetchLatestSettings();
}
