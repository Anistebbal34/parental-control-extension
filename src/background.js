// ✅ Existing code you already have
import {
  analyzeGapOnStartup,
  setupHeartbeatAlarm,
} from "./features/gapMonitoring.js";
import {
  trackYouTubeWatch,
  trackFacebookWatch,
  trackFacebookReel,
  handleNavigation,
} from "./features/videoTracker.js";
// import { trackVisitedSite } from "./siteHistoryTracker.js";
import { setupIncognitoBlocker } from "./features/incognitoBlocker.js";
import { registerTimeTrackingEvents } from "./features/timeTracker.js";

import {
  setupPushNotifications,
  initializePushOnStartup,
} from "./features/Pushnotifications.js";
import { setupBlockedSites } from "./features/Blockedsites.js";
import { setupBrowserLock } from "./features/Browserlock.js";

async function wipeAllDynamicRules_DEV() {
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const allRuleIds = existingRules.map((r) => r.id);

  if (allRuleIds.length === 0) {
    console.log("🧹 [DEV] No DNR rules to wipe");
    return;
  }

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: allRuleIds,
  });

  console.warn("🧹 [DEV] Wiped ALL dynamic DNR rules:", allRuleIds);
}

chrome.runtime.onInstalled.addListener(async (details) => {
  await wipeAllDynamicRules_DEV();

  console.warn("🔧 Extension installed:", details.reason);

  if (["update", "install"].includes(details.reason)) {
    chrome.storage.local.clear(() =>
      console.warn("🧹 Local storage cleared for clean dev state"),
    );
  }

  // Initialize your existing features
  if (typeof ensureOffscreen === "function") {
    ensureOffscreen();
  }

  console.log("✅ Extension installed/updated");
});

chrome.runtime.onStartup.addListener(async () => {
  await wipeAllDynamicRules_DEV();

  console.log("🔁 Chrome startup detected");

  // Initialize push notifications
  initializePushOnStartup();

  // Initialize your existing features
  if (typeof ensureOffscreen === "function") {
    ensureOffscreen();
  }

  console.log("✅ Extension startup complete");
});

setupPushNotifications();
setupBlockedSites();
setupBrowserLock();

// chrome.runtime.onInstalled.addListener(async (details) => {
//   await wipeAllDynamicRules_DEV();
//   offscreenPromise = null;
//   // delayedStartupLog(`Installed: ${details.reason}`);
//   console.warn("🔧 Extension installed:", details.reason);
//   if (["update", "install"].includes(details.reason)) {
//     chrome.storage.local.clear(() =>
//       console.warn("🧹 Local storage cleared for clean dev state"),
//     );
//   }
//   console.warn("i think this being called");
//   ensureOffscreen();
//   // 🕒 Setup alarm for syncing every 2 hours

//   // chrome.action.setBadgeText({ text: "ON" });
//   // chrome.action.setBadgeBackgroundColor({ color: "#ffbb3dff" });
// });

// chrome.runtime.onStartup.addListener(async () => {
//   await wipeAllDynamicRules_DEV();
//   console.log("🔁[FCM] Chrome startup, checking push subscription");
//   subscribeToPushSafe();
//   fetchLatestSettings();
//   offscreenPromise = null;
//   // delayedStartupLog("Startup");
//   console.warn("i think this being called onstartup");
//   ensureOffscreen();

//   // chrome.action.setBadgeText({ text: "vv" });
//   // chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
//   // syncTrackedTimeToServer(); // optional immediate sync
// });

/// notification from the server and apllying it
// const SERVER_PUBLIC_KEY =
//   "BFONSoxhHlMKzLP_ZepAvrHSU0SRDMaqmaPwtqlEdmrkt4xYhpw3Z3XKLVwsLC7dtEGX9rEQnFqTF1H2_AxErCE";
// function urlB64ToUint8Array(base64String) {
//   const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
//   const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

//   const rawData = atob(base64);
//   const outputArray = new Uint8Array(rawData.length);

//   for (let i = 0; i < rawData.length; ++i) {
//     outputArray[i] = rawData.charCodeAt(i);
//   }
//   return outputArray;
// }

// const applicationServerKey = urlB64ToUint8Array(SERVER_PUBLIC_KEY);

// async function subscribeToPushSafe() {
//   const existing = await self.registration.pushManager.getSubscription();
//   if (existing) {
//     console.log("✅ [FCM] Push already subscribed");
//     return existing;
//   }
//   console.log(" [FCM] Push not yet subscribed");
//   const subscription = await self.registration.pushManager.subscribe({
//     userVisibleOnly: true,
//     applicationServerKey,
//   });

//   console.log("🆕 [FCM] Push subscription created");

//   await fetch("http://localhost:3000/subscribe", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(subscription),
//   });

//   return subscription;
// }
// self.addEventListener("install", (event) => {
//   console.log("[FCM] Service worker installed, subscribing...");
//   // event.waitUntil(subscribeToPushSafe());
//   // subscribeToPushSafe();
// });
// self.addEventListener("activate", (event) => {
//   console.log(" [FCM] Service worker activated, checking subscription...");
//   // event.waitUntil(subscribeToPushSafe());
//   subscribeToPushSafe();
// });

// self.addEventListener("push", (event) => {
//   console.log("🔔 [FCM] Push signal received");
//   event.waitUntil(handlePushSignal());
// });
// self.addEventListener("pushsubscriptionchange", async (event) => {
//   console.log("[FCM] Push subscription changed, resubscribing...");
//   await subscribeToPushSafe();
// });

// async function handlePushSignal() {
//   try {
//     // 1️⃣ Fetch latest settings
//     const res = await fetch("http://localhost:3000/settings/latest");
//     const data = await res.json();

//     const { version, settings } = data;

//     console.log("📥 Latest settings fetched:", version, settings);
//     const stored = await chrome.storage.local.get("appliedVersion");

//     if (stored.appliedVersion === version) {
//       console.log("✅ Settings already applied");
//       return;
//     }

//     // 2️⃣ Apply settings (example)
//     await chrome.storage.local.set({
//       ...settings, // 👈 spreads block_facebook_feed
//       appliedVersion: version,
//       lastUpdateTimestamp: Date.now(),
//     });
//     // 3️⃣ Optional notification (debug only)
//     await self.registration.showNotification("Settings updated", {
//       body: `Applied version ${version}`,
//     });

//     // 4️⃣ ACK back to backend
//     await fetch("http://localhost:3000/push-ack", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         version,
//         appliedAt: Date.now(),
//       }),
//     });

//     console.log("✅ ACK sent for version", version);
//   } catch (err) {
//     console.error("❌ Push handling failed:", err);
//   }
// }

// async function fetchLatestSettings() {
//   console.warn("🔁[FCM] fetchLatestSettings ");
//   const res = await fetch("http://localhost:3000/device-status");

//   const status = await res.json();
//   console.log("🔁[FCM]", status);
//   if (status.pending) {
//     console.log("🟡 Pending settings detected, waiting for push");
//     await handlePushSignal();
//   }
// }

// // blocked sites feature
// async function applyBlockedSites(domains) {
//   const rules = buildBlockedSitesRules(domains);

//   const existingRules = await chrome.declarativeNetRequest.getDynamicRules();

//   // 🔐 Remove ONLY blocked-sites rules
//   const blockedSiteRuleIds = existingRules
//     .filter(
//       (r) =>
//         r.id >= BLOCKED_SITES_OFFSET && r.id < BLOCKED_SITES_OFFSET + 10_000,
//     )
//     .map((r) => r.id);

//   await chrome.declarativeNetRequest.updateDynamicRules({
//     removeRuleIds: blockedSiteRuleIds,
//     addRules: rules,
//   });

//   console.log("🚫 [blocked_sites] rules updated");
// }

// const FEATURE_BLOCKED_SITES = "blocked_sites";
// const BLOCKED_SITES_OFFSET = 1_000;

// function buildBlockedSitesRules(domains) {
//   return domains.map((domain) => ({
//     id: hashStringToId(
//       `${FEATURE_BLOCKED_SITES}:${domain}`,
//       BLOCKED_SITES_OFFSET,
//     ),
//     priority: 1,
//     action: { type: "block" },
//     condition: {
//       urlFilter: `||${domain}^`,
//       resourceTypes: ["main_frame"],
//     },
//   }));
// }

// function hashDomain(domain) {
//   let hash = 0;
//   for (let i = 0; i < domain.length; i++) {
//     hash = (hash << 5) - hash + domain.charCodeAt(i);
//     hash |= 0;
//   }
//   return Math.abs(hash);
// }

// chrome.storage.onChanged.addListener((changes) => {
//   if (changes.blocked_sites) {
//     applyBlockedSites(changes.blocked_sites.newValue);
//   }
// });

// async function wipeAllDynamicRules_DEV() {
//   const existingRules = await chrome.declarativeNetRequest.getDynamicRules();

//   const allRuleIds = existingRules.map((r) => r.id);

//   if (allRuleIds.length === 0) {
//     console.log("🧹 [DEV] No DNR rules to wipe");
//     return;
//   }

//   await chrome.declarativeNetRequest.updateDynamicRules({
//     removeRuleIds: allRuleIds,
//   });

//   console.warn("🧹 [DEV] Wiped ALL dynamic DNR rules:", allRuleIds);
// }

// // another feature for blocking whitelist sites and so on

// // ==============================s
// // FEATURE IDENTIFIERS
// // ==============================
// const FEATURE_LOCK = "browser_lock";

// // Rule ID namespace (safe range per feature)
// const RULE_ID_OFFSET = 20_000;
// const RULE_ID_RANGE = 10_000;

// // ==============================
// // STABLE HASH (deterministic ID)
// // ==============================
// function hashStringToId(str, offset = 0) {
//   let hash = 0;
//   for (let i = 0; i < str.length; i++) {
//     hash = (hash << 5) - hash + str.charCodeAt(i);
//     hash |= 0;
//   }

//   return offset + (Math.abs(hash) % RULE_ID_RANGE);
// }

// function isTimeInRange(current, start, end) {
//   const [cH, cM] = current.split(":").map(Number);
//   const [sH, sM] = start.split(":").map(Number);
//   const [eH, eM] = end.split(":").map(Number);

//   const curr = cH * 60 + cM;
//   const startMin = sH * 60 + sM;
//   const endMin = eH * 60 + eM;

//   // Log for debugging
//   console.log("[DEBUG_LOCK] isTimeInRange:", {
//     current,
//     start,
//     end,
//     curr,
//     startMin,
//     endMin,
//   });

//   // Normal range
//   if (startMin < endMin) {
//     const result = curr >= startMin && curr < endMin;
//     console.log("[DEBUG_LOCK] Normal range result:", result);
//     return result;
//   }

//   // Overnight range
//   const result = curr >= startMin || curr < endMin;
//   console.log("[DEBUG_LOCK] Overnight range result:", result);
//   return result;
// }

// function isCurrentlyLocked(schedules) {
//   const now = new Date();
//   const day = now.getDay();
//   const time = `${String(now.getHours()).padStart(2, "0")}:${String(
//     now.getMinutes(),
//   ).padStart(2, "0")}`;

//   console.log("[DEBUG_LOCK] Checking isCurrentlyLocked:", { day, time });

//   const locked = schedules.some(
//     (s) =>
//       s.active &&
//       s.daysOfWeek.includes(day) &&
//       isTimeInRange(time, s.start, s.end),
//   );

//   console.log("[DEBUG_LOCK] isCurrentlyLocked result:", locked);
//   return locked;
// }

// function buildLockdownRules() {
//   const rules = [];

//   // ✅ FIRST: Allow extension's own URLs (highest priority)
//   // chrome-extension://fhacdkkgijinholcnecjkbjmcmfhaakg/locked.html?reason=lockdown
//   // rules.push({
//   //   id: hashStringToId(`${FEATURE_LOCK}:allow:extension`, RULE_ID_OFFSET),
//   //   priority: 200,  // ✅ HIGHEST priority
//   //   action: { type: "allow" },
//   //   condition: {
//   //     urlFilter: `chrome-extension://${chrome.runtime.id}/*`,
//   //     resourceTypes: ["main_frame"],
//   //   },
//   // });

//   // ✅ THEN: Redirect ALL other sites to locked.html
//   //
//   rules.push({
//     id: hashStringToId(`${FEATURE_LOCK}:lock:redirect`, RULE_ID_OFFSET),
//     priority: 1,
//     action: {
//       type: "redirect",
//       redirect: {
//         url: chrome.runtime.getURL("locked.html?reason=lockdown"),
//       },
//     },
//     condition: {
//       urlFilter: "*://*/*",
//       resourceTypes: ["main_frame"],
//     },
//   });

//   console.log(
//     "[DEBUG_LOCK] buildLockdownRules: Created redirect-all rule with priority 1",
//   );
//   return rules;
// }

// // ✅ FIX: Allow Google domains properly
// function addGoogleAllowRules(rules) {
//   // Allow all Google domains and subdomains
//   const googleDomains = [
//     "google.com",
//     // Add other Google domains as needed
//   ];

//   for (const domain of googleDomains) {
//     // Allow main domain
//     rules.push({
//       id: hashStringToId(`${FEATURE_LOCK}:allow:${domain}`, RULE_ID_OFFSET),
//       priority: 100,
//       action: { type: "allow" },
//       condition: {
//         urlFilter: `*://${domain}/*`,
//         resourceTypes: ["main_frame"],
//       },
//     });

//     // Allow all subdomains
//     rules.push({
//       id: hashStringToId(
//         `${FEATURE_LOCK}:allow:subdomain:${domain}`,
//         RULE_ID_OFFSET,
//       ),
//       priority: 100,
//       action: { type: "allow" },
//       condition: {
//         urlFilter: `*://*.${domain}/*`,
//         resourceTypes: ["main_frame"],
//       },
//     });
//   }
//   //   rules.push({
//   //   id: hashStringToId(
//   //     `${FEATURE_LOCK}:allow:google-redirects`,
//   //     RULE_ID_OFFSET
//   //   ),
//   //   priority: 100,
//   //   action: { type: "allow" },
//   //   condition: {
//   //     urlFilter: "*://www.google.*/url?*",  // Google redirect URLs
//   //     resourceTypes: ["main_frame"],
//   //   },
//   // });
// }

// function buildWhitelistRules(allowedSites) {
//   const rules = [];

//   //   rules.push({
//   //   id: hashStringToId(`${FEATURE_LOCK}:allow:extension-whitelist`, RULE_ID_OFFSET),
//   //   priority: 200,  // ✅ HIGHEST priority
//   //   action: { type: "allow" },
//   //   condition: {
//   //     urlFilter: `chrome-extension://${chrome.runtime.id}/*`,
//   //     resourceTypes: ["main_frame"],
//   //   },
//   // });
//   // 1️⃣ Block everything (LOWER priority now)
//   rules.push({
//     id: hashStringToId(`${FEATURE_LOCK}:whitelist:blockall`, RULE_ID_OFFSET),
//     priority: 1, // ✅ Low priority so allow rules can override
//     action: {
//       type: "redirect",
//       redirect: {
//         url: chrome.runtime.getURL("locked.html?reason=whitelist"),
//       },
//     },
//     condition: {
//       urlFilter: "*://*/*",
//       resourceTypes: ["main_frame"],
//     },
//   });

//   // 2️⃣ Always allow Google
//   addGoogleAllowRules(rules);

//   // 3️⃣ Allow whitelisted sites
//   for (const site of allowedSites) {
//     // Allow main domain
//     rules.push({
//       id: hashStringToId(`${FEATURE_LOCK}:allow:${site}`, RULE_ID_OFFSET),
//       priority: 10,
//       action: { type: "allow" },
//       condition: {
//         urlFilter: `*://${site}/*`,
//         resourceTypes: ["main_frame"],
//       },
//     });

//     // Allow all subdomains
//     rules.push({
//       id: hashStringToId(
//         `${FEATURE_LOCK}:allow:subdomain:${site}`,
//         RULE_ID_OFFSET,
//       ),
//       priority: 10,
//       action: { type: "allow" },
//       condition: {
//         urlFilter: `*://*.${site}/*`,
//         resourceTypes: ["main_frame"],
//       },
//     });
//   }

//   return rules;
// }

// async function applyFeatureRules(featureName, newRules) {
//   console.log(
//     "[DEBUG_LOCK] Applying feature rules for:",
//     featureName,
//     newRules,
//   );

//   // 🔍 Log detailed rule info BEFORE applying
//   console.table(
//     newRules.map((r) => ({
//       id: r.id,
//       priority: r.priority,
//       action: r.action.type,
//       redirectTo: r.action.redirect?.url?.substring(0, 50) || "N/A",
//       urlFilter: r.condition.urlFilter,
//     })),
//   );

//   const existing = await chrome.declarativeNetRequest.getDynamicRules();

//   // Only remove rules belonging to THIS feature
//   const featureRuleIds = existing
//     .filter((r) => r.id >= RULE_ID_OFFSET && r.id < RULE_ID_OFFSET + 10_000)
//     .map((r) => r.id);

//   console.log("[DEBUG_LOCK] Existing feature rule IDs:", featureRuleIds);

//   await chrome.declarativeNetRequest.updateDynamicRules({
//     removeRuleIds: featureRuleIds,
//     addRules: newRules,
//   });

//   // 🔍 Verify rules were applied
//   const afterRules = await chrome.declarativeNetRequest.getDynamicRules();
//   console.log(
//     `[DEBUG_LOCK] ✅ [${featureName}] rules applied successfully. Total active rules:`,
//     afterRules.length,
//   );
// }

// async function checkAndApplyBrowserLock() {
//   const { browserLockConfig } =
//     await chrome.storage.local.get("browserLockConfig");

//   console.log("[DEBUG_LOCK] Loaded browserLockConfig:", browserLockConfig);

//   if (!browserLockConfig) return;

//   const { lockdown, whitelist, currentMode } = browserLockConfig;

//   let nextMode = "normal";

//   if (lockdown.enabled && isCurrentlyLocked(lockdown.schedules)) {
//     nextMode = "locked";
//   } else if (whitelist.enabled) {
//     nextMode = "whitelist";
//   }

//   console.log(
//     "[DEBUG_LOCK] Determined nextMode:",
//     nextMode,
//     "currentMode:",
//     currentMode,
//   );

//   if (nextMode === currentMode) {
//     console.log(
//       "[DEBUG_LOCK] No change in browser mode, skipping rule update.",
//     );
//     return; // 🚫 No changes needed
//   }

//   console.log(
//     `[DEBUG_LOCK] Browser mode changing: ${currentMode} → ${nextMode}`,
//   );

//   let rules = [];

//   if (nextMode === "locked") {
//     rules = buildLockdownRules();
//     addGoogleAllowRules(rules);
//   }

//   if (nextMode === "whitelist") {
//     rules = buildWhitelistRules(whitelist.sites);
//   }

//   await applyFeatureRules(FEATURE_LOCK, rules);

//   browserLockConfig.currentMode = nextMode;
//   await chrome.storage.local.set({ browserLockConfig });

//   console.log("[DEBUG_LOCK] Browser lock status updated and stored.");
// }
// chrome.alarms.create("browserLockCheck", { periodInMinutes: 1 });

// chrome.alarms.onAlarm.addListener(async (alarm) => {
//   if (alarm.name === "browserLockCheck") {
//     checkAndApplyBrowserLock();

//     const activeRules = await chrome.declarativeNetRequest.getDynamicRules();
//     console.log("[DEBUG_LOCK] Active rules after check:", activeRules.length);
//     console.table(
//       activeRules.map((r) => ({
//         id: r.id,
//         priority: r.priority,
//         action: r.action.type,
//         redirectTo: r.action.redirect?.url || "N/A",
//         urlFilter: r.condition.urlFilter,
//       })),
//     );
//   }
// });
// chrome.storage.onChanged.addListener((changes) => {
//   if (changes.browserLockConfig) {
//     if (changes.browserLockConfig.newValue) {
//       console.log("[DEBUG_LOCK] Browserlockconfing changed ");

//       checkAndApplyBrowserLock();
//     } else {
//       console.log("nothing");
//     }
//   }
// });

// // ✅ NEW: Handle search engine redirects via webNavigation
// // This catches typing "google" in the address bar
// chrome.webNavigation.onBeforeNavigate.addListener(
//   async (details) => {
//     if (details.frameId !== 0) return; // Only main frame

//     const url = new URL(details.url);

//     // Check if user typed a search query in address bar (using default search engine)
//     // Support ALL Yahoo country domains, Bing, DuckDuckGo, etc.
//     const searchEngines = [
//       { pattern: /\.yahoo\.com$/, param: "p" }, // Matches any Yahoo domain
//       { pattern: /^www\.bing\.com$/, param: "q" },
//       { pattern: /^duckduckgo\.com$/, param: "q" },
//       { pattern: /^search\.brave\.com$/, param: "q" },
//     ];

//     for (const engine of searchEngines) {
//       if (engine.pattern.test(url.hostname)) {
//         const query = url.searchParams.get(engine.param);
//         console.log(
//           `[SEARCH_REDIRECT] Detected ${url.hostname}, query:`,
//           query,
//         );
//         if (query) {
//           // Redirect to Google search instead
//           const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
//           chrome.tabs.update(details.tabId, { url: googleUrl });
//           return;
//         }
//       }
//     }
//   },
//   { url: [{ urlMatches: ".*" }] },
// );

setupSyncAlarm();
setupHeartbeatAlarm();
registerTimeTrackingEvents();
analyzeGapOnStartup();
setupIncognitoBlocker();

chrome.webNavigation.onCompleted.addListener(handleNavigation, {
  url: [{ urlContains: "youtube.com" }, { urlContains: "facebook.com" }],
});
chrome.webNavigation.onHistoryStateUpdated.addListener(handleNavigation, {
  url: [{ urlContains: "youtube.com" }, { urlContains: "facebook.com" }],
});

// 🧠 Alarm event: sync data periodically
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "sync_to_server") {
    console.log("⏰ Alarm triggered: Syncing tracked time");
    syncTrackedTimeToServer();
  }
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.url) return;

  // Detect navigation to chrome://history
  if (tab.url.startsWith("chrome://history")) {
    console.warn("🚫 History tab detected:", tab.url);

    chrome.tabs.remove(tabId, () => {
      if (chrome.runtime.lastError) {
        console.warn(
          "❌ Failed to remove tab:",
          chrome.runtime.lastError.message,
        );
      } else {
        console.log("✅ History tab closed.");
      }
    });
  }
});
function setupSyncAlarm() {
  chrome.alarms.get("sync_to_server", (alarm) => {
    if (!alarm) {
      chrome.alarms.create("sync_to_server", {
        periodInMinutes: 2,
      });
      console.log("⏱️ Created sync_to_server alarm.");
    } else {
      console.log("✅ sync_to_server alarm already exists.");
    }
  });
}
// background.js

// Run this on extension startup
// applyDynamicBlockRules();

function syncTrackedTimeToServer() {
  chrome.storage.local.get(["site_time", "sync_metadata"], (res) => {
    const siteTime = res.site_time || {};
    const metadata = res.sync_metadata || {};
    const unsyncedDates = [];

    // 🔍 Find unsynced dates
    for (const date in siteTime) {
      if (!metadata[date] || metadata[date].synced === false) {
        unsyncedDates.push(date);
      }
    }

    if (unsyncedDates.length === 0) {
      console.log("🟢 All dates already synced");
      return;
    }

    // 📨 Prepare fake payload for simulation
    const payload = {};
    unsyncedDates.forEach((date) => {
      payload[date] = siteTime[date];
    });

    console.log("📦 Simulating sync for payload:", payload);

    // 🔁 Fake sync using timeout instead of real fetch
    setTimeout(() => {
      unsyncedDates.forEach((date) => {
        delete siteTime[date]; // Remove synced time
        delete metadata[date]; // Remove metadata too
      });

      metadata.last_sync_time = Date.now(); // Optional but useful

      // ✅ Save cleaned data
      chrome.storage.local.set(
        {
          site_time: siteTime,
          sync_metadata: metadata,
        },
        () => {
          console.log(
            "✅ [SIMULATED] Sync complete. Remaining data:",
            siteTime,
          );
          console.log("🧠 Updated metadata:", metadata);
        },
      );
    }, 500); // 0.5 second simulation delay

    // 🌐 Real fetch would go here
    /*
    fetch("https://yourserver.com/api/sync", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    })
    .then(...)
    */
  });
}

let offscreenPromise = null;

async function ensureOffscreen() {
  console.warn("[background] ensureOffscreen() called");

  // If already creating offscreen, return the same promise
  if (offscreenPromise) {
    console.warn(
      "[background] Offscreen creation already in progress, waiting...",
    );
    return offscreenPromise;
  }

  try {
    // Chrome 116+ check
    if (chrome.offscreen && chrome.offscreen.hasDocument) {
      console.warn("[background] Checking chrome.offscreen.hasDocument...");
      const has = await chrome.offscreen.hasDocument();
      console.warn("[background] Offscreen document exists?", has);
      if (has) {
        console.warn("[background] ✅ Offscreen already running");
        return true;
      }
    } else {
      console.warn(
        "[background] Using fallback runtime.getContexts() for older Chrome",
      );
      const contexts = await chrome.runtime.getContexts();
      const offscreenExists = contexts.some(
        (c) => c.contextType === "OFFSCREEN_DOCUMENT",
      );
      console.warn(
        "[background] Offscreen exists in contexts?",
        offscreenExists,
      );
      if (offscreenExists) {
        console.warn("[background] ✅ Offscreen already running (fallback)");
        return true;
      }
    }

    console.warn("[background] Creating offscreen document now...");

    // Store the creation promise BEFORE awaiting it
    offscreenPromise = chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["WORKERS"],
      justification:
        "Run NSFWJS (TF.js) outside content scripts and share across tabs",
    });

    // Wait for creation to complete
    await offscreenPromise;
    console.warn("[background] 🎉 Offscreen document created successfully!");
    return true;
  } catch (err) {
    console.error("[background] ❌ Failed to create offscreen document:", err);
    // Reset promise on failure so we can retry
    offscreenPromise = null;
    throw err; // Re-throw so caller knows it failed
  }
}

// Relay CS -> Offscreen, return Offscreen's response to the sender.
let relayCounter = 0;

// Relay CS -> Offscreen, return Offscreen's response to the sender.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  relayCounter++;
  const id = `[Relay-${relayCounter}]`;

  console.warn(`${id} [background] Received message:`, msg);

  // if (!msg || !msg.target) return;

  if (!msg || !msg.target) {
    // ✅ NEW: Handle GET_TAB_ID request
    if (msg.type === "GET_TAB_ID") {
      sendResponse({ tabId: sender.tab?.id || "unknown" });
      return true;
    }
    return;
  }

  if (msg.target === "offscreen") {
    (async () => {
      try {
        console.warn(`${id} Ensuring offscreen document exists...`);
        await ensureOffscreen();

        console.warn(`${id} Forwarding message to offscreen:`, msg);
        const response = await chrome.runtime.sendMessage(msg);

        console.warn(`${id} Got response from offscreen:`, response);
        console.warn(`${id} Sending response back to sender`);
        sendResponse(response);
      } catch (error) {
        console.error(`${id} Error in message relay:`, error);

        sendResponse({
          ok: false,
          error: error.message || "Background relay failed",
          src: msg?.src,
        });
      }
    })();

    return true;
  }
});

// function addGoogleAllowRules(rules) {
//   // =========================
//   // 1️⃣ Allow Google itself
//   // =========================
//   const googleAllowPatterns = [
//     "*://google.com/*",
//     "*://*.google.com/*",
//   ];

//   for (const pattern of googleAllowPatterns) {
//     rules.push({
//       id: hashStringToId(
//         `${FEATURE_LOCK}:allow:google:${pattern}`,
//         RULE_ID_OFFSET
//       ),
//        priority: 100, // must beat block-all
//       action: { type: "allow" },
//       condition: {
//         urlFilter: pattern,
//         resourceTypes: ["main_frame"],
//       },
//     });
//   }

//   // ==========================================
//   // 2️⃣ Redirect OTHER search engines → Google
//   // ==========================================

//   const searchRedirects = [
//     {
//       name: "yahoo",
//       match: "search.yahoo.com/search",
//       queryParam: "p",
//     },
//     {
//       name: "bing",
//       match: "www.bing.com/search",
//       queryParam: "q",
//     },
//     {
//       name: "duckduckgo",
//       match: "duckduckgo.com",
//       queryParam: "q",
//     },
//   ];

//   for (const engine of searchRedirects) {
//     rules.push({
//       id: hashStringToId(
//         `${FEATURE_LOCK}:redirect:${engine.name}-to-google`,
//         RULE_ID_OFFSET
//       ),
//       priority: 110, // higher than allow/block rules
//       action: {
//         type: "redirect",
//      redirect: {
//        transform: {
//     scheme: "https",
//     host: "www.google.com",
//     path: "/search",
//     queryTransform: {
//       addOrReplaceParams: [
//         { key: "q", value: "{searchTerms}" },
//       ],
//     },
//   },
// },
//   },
//       condition: {
//         urlFilter: engine.match,
//         resourceTypes: ["main_frame"],
//       },
//     });
//   }

// }

// function buildWhitelistRules(allowedSites) {
//   const rules = [];

//   // 1️⃣ Block everything
//   rules.push({
//     id: hashStringToId(`${FEATURE_LOCK}:whitelist:blockall`, RULE_ID_OFFSET),
//     priority: 1,
//     action: {
//       type: "redirect",
//       redirect: {
//         url: chrome.runtime.getURL("locked.html?reason=whitelist"),
//       },
//     },
//     condition: {
//       urlFilter: "*://*/*",
//       resourceTypes: ["main_frame"],
//     },
//   });

//   // 2️⃣ Always allow Google
//   addGoogleAllowRules(rules);

//   // 3️⃣ Allow whitelisted sites
//   for (const site of allowedSites) {
//     const patterns = [
//       `*://${site}/*`,
//       `*://*.${site}/*`,
//     ];

//     for (const pattern of patterns) {
//       rules.push({
//         id: hashStringToId(
//           `${FEATURE_LOCK}:allow:${site}:${pattern}`,
//           RULE_ID_OFFSET
//         ),
//         priority: 10,
//         action: { type: "allow" },
//         condition: {
//           urlFilter: pattern,
//           resourceTypes: ["main_frame"],
//         },
//       });
//     }
//   }

//   return rules;
// }

// async function ensureOffscreen() {
//   console.warn("[background] ensureOffscreen() called");

//   // Chrome 116+ check
//   if (chrome.offscreen && chrome.offscreen.hasDocument) {
//     console.warn("[background] Checking chrome.offscreen.hasDocument...");
//     const has = await chrome.offscreen.hasDocument();
//     console.warn("[background] Offscreen document exists?", has);
//     if (has) {
//       console.warn("[background] ✅ Offscreen already running");
//       return;
//     }
//   } else {
//     console.warn(
//       "[background] Using fallback runtime.getContexts() for older Chrome"
//     );
//     const contexts = await chrome.runtime.getContexts();
//     const offscreenExists = contexts.some(
//       (c) => c.contextType === "OFFSCREEN_DOCUMENT"
//     );
//     console.warn("[background] Offscreen exists in contexts?", offscreenExists);
//     if (offscreenExists) {
//       console.warn("[background] ✅ Offscreen already running (fallback)");
//       return;
//     }
//   }

//   console.warn("[background] Creating offscreen document now...");
//   try {
//     await chrome.offscreen.createDocument({
//       url: "offscreen.html",
//       reasons: ["WORKERS"],
//       justification:
//         "Run NSFWJS (TF.js) outside content scripts and share across tabs",
//     });
//     console.warn("[background] 🎉 Offscreen document created successfully!");
//   } catch (err) {
//     console.error("[background] ❌ Failed to create offscreen document:", err);
//   }
// }

// // Relay CS -> Offscreen, return Offscreen's response to the sender.
// chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
//   console.warn("background", msg);
//   if (!msg || !msg.target) return;

//   if (msg.target === "offscreen") {
//     (async () => {
//       await ensureOffscreen();
//       console.warn(msg);
//       // Forward to offscreen and pipe its async response back
//       chrome.runtime.sendMessage(msg).then(sendResponse);
//     })();
//     return true; // keep channel open
//   }
// });
////////////////////////////////////////////////////////////////////////////

// Enhanced background.js with detailed message flow debugging

// // ✅ Existing code you already have
// import { analyzeGapOnStartup, setupHeartbeatAlarm } from "./gapMonitoring.js";
// import {
//   trackYouTubeWatch,
//   trackFacebookWatch,
//   trackFacebookReel,
//   handleNavigation,
// } from "./videoTracker.js";
// import { setupIncognitoBlocker } from "./incognitoBlocker.js";
// import { registerTimeTrackingEvents } from "./timeTracker.js";

// function delayedStartupLog(reason) {
//   setTimeout(() => {
//     console.log(`🚀 Chrome event triggered: ${reason}`);
//   }, 3000);
// }

// // Enhanced message debugging
// function debugLog(message, data = null) {
//   console.warn(`[BACKGROUND DEBUG] ${message}`, data || "");
// }

// chrome.runtime.onInstalled.addListener((details) => {
//   delayedStartupLog(`Installed: ${details.reason}`);
//   console.warn("🔧 Extension installed:", details.reason);
//   if (["update", "install"].includes(details.reason)) {
//     chrome.storage.local.clear(() =>
//       console.warn("🧹 Local storage cleared for clean dev state")
//     );
//   }

//   ensureOffscreen();
// });

// chrome.runtime.onStartup.addListener(() => {
//   delayedStartupLog("Startup");
//   ensureOffscreen();
// });

// setupSyncAlarm();
// setupHeartbeatAlarm();
// registerTimeTrackingEvents();
// analyzeGapOnStartup();
// setupIncognitoBlocker();

// chrome.webNavigation.onCompleted.addListener(handleNavigation, {
//   url: [{ urlContains: "youtube.com" }, { urlContains: "facebook.com" }],
// });
// chrome.webNavigation.onHistoryStateUpdated.addListener(handleNavigation, {
//   url: [{ urlContains: "youtube.com" }, { urlContains: "facebook.com" }],
// });

// chrome.alarms.onAlarm.addListener((alarm) => {
//   if (alarm.name === "sync_to_server") {
//     console.log("⏰ Alarm triggered: Syncing tracked time");
//     syncTrackedTimeToServer();
//   }
// });

// chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
//   if (!tab.url) return;

//   if (tab.url.startsWith("chrome://history")) {
//     console.warn("🚫 History tab detected:", tab.url);
//     chrome.tabs.remove(tabId, () => {
//       if (chrome.runtime.lastError) {
//         console.warn(
//           "❌ Failed to remove tab:",
//           chrome.runtime.lastError.message
//         );
//       } else {
//         console.log("✅ History tab closed.");
//       }
//     });
//   }
// });

// function setupSyncAlarm() {
//   chrome.alarms.get("sync_to_server", (alarm) => {
//     if (!alarm) {
//       chrome.alarms.create("sync_to_server", {
//         periodInMinutes: 2,
//       });
//       console.log("⏱️ Created sync_to_server alarm.");
//     } else {
//       console.log("✅ sync_to_server alarm already exists.");
//     }
//   });
// }

// // Your existing dynamic block rules code
// const blockedSites = ["tiktok.com", "instagram.com"];

// async function applyDynamicBlockRules() {
//   console.log("[DNR] Starting to apply dynamic block rules...");
//   const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
//   console.log("[DNR] Existing dynamic rules fetched:", existingRules);

//   const existingIds = existingRules.map((rule) => rule.id);
//   console.log("[DNR] Existing rule IDs to be removed:", existingIds);

//   const newRules = blockedSites.map((domain, i) => {
//     const rule = {
//       id: i + 1,
//       priority: 1,
//       action: { type: "block" },
//       condition: {
//         urlFilter: domain,
//         resourceTypes: ["main_frame"],
//       },
//     };
//     console.log(`[DNR] Constructed rule for domain: ${domain}`, rule);
//     return rule;
//   });

//   try {
//     console.log("[DNR] Updating dynamic rules (removing + adding)...");
//     await chrome.declarativeNetRequest.updateDynamicRules({
//       removeRuleIds: existingIds,
//       addRules: newRules,
//     });
//     console.log("[DNR] Dynamic blocking rules successfully applied.");
//   } catch (error) {
//     console.error("[DNR] Failed to update dynamic rules:", error);
//   }

//   const finalRules = await chrome.declarativeNetRequest.getDynamicRules();
//   console.log("[DNR] Final dynamic rules now active:", finalRules);
// }

// applyDynamicBlockRules();

// function syncTrackedTimeToServer() {
//   chrome.storage.local.get(["site_time", "sync_metadata"], (res) => {
//     const siteTime = res.site_time || {};
//     const metadata = res.sync_metadata || {};
//     const unsyncedDates = [];

//     for (const date in siteTime) {
//       if (!metadata[date] || metadata[date].synced === false) {
//         unsyncedDates.push(date);
//       }
//     }

//     if (unsyncedDates.length === 0) {
//       console.log("🟢 All dates already synced");
//       return;
//     }

//     const payload = {};
//     unsyncedDates.forEach((date) => {
//       payload[date] = siteTime[date];
//     });

//     console.log("📦 Simulating sync for payload:", payload);

//     setTimeout(() => {
//       unsyncedDates.forEach((date) => {
//         delete siteTime[date];
//         delete metadata[date];
//       });

//       metadata.last_sync_time = Date.now();

//       chrome.storage.local.set(
//         {
//           site_time: siteTime,
//           sync_metadata: metadata,
//         },
//         () => {
//           console.log(
//             "✅ [SIMULATED] Sync complete. Remaining data:",
//             siteTime
//           );
//           console.log("🧠 Updated metadata:", metadata);
//         }
//       );
//     }, 500);
//   });
// }

// // ENHANCED OFFSCREEN MANAGEMENT
// async function ensureOffscreen() {
//   debugLog("ensureOffscreen() called");

//   // Chrome 116+ check
//   if (chrome.offscreen && chrome.offscreen.hasDocument) {
//     debugLog("Checking chrome.offscreen.hasDocument...");
//     const has = await chrome.offscreen.hasDocument();
//     debugLog("Offscreen document exists?", has);
//     if (has) {
//       debugLog("✅ Offscreen already running");
//       return true; // Return success status
//     }
//   } else {
//     debugLog("Using fallback runtime.getContexts() for older Chrome");
//     const contexts = await chrome.runtime.getContexts();
//     const offscreenExists = contexts.some(
//       (c) => c.contextType === "OFFSCREEN_DOCUMENT"
//     );
//     debugLog("Offscreen exists in contexts?", offscreenExists);
//     if (offscreenExists) {
//       debugLog("✅ Offscreen already running (fallback)");
//       return true; // Return success status
//     }
//   }

//   debugLog("Creating offscreen document now...");
//   try {
//     await chrome.offscreen.createDocument({
//       url: "offscreen.html",
//       reasons: ["WORKERS"],
//       justification:
//         "Run NSFWJS (TF.js) outside content scripts and share across tabs",
//     });
//     debugLog("🎉 Offscreen document created successfully!");

//     // Wait a moment for the offscreen document to initialize
//     await new Promise((resolve) => setTimeout(resolve, 100));

//     return true; // Return success status
//   } catch (err) {
//     debugLog("❌ Failed to create offscreen document:", err);
//     return false; // Return failure status
//   }
// }

// // ENHANCED MESSAGE RELAY WITH DETAILED LOGGING
// chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
//   debugLog("=== MESSAGE RECEIVED IN BACKGROUND ===");
//   debugLog("Message:", msg);
//   debugLog("Sender:", {
//     tab: sender.tab?.id,
//     url: sender.tab?.url?.substring(0, 50),
//     origin: sender.origin,
//     documentId: sender.documentId,
//   });

//   // Check if message is properly formatted
//   if (!msg) {
//     debugLog("❌ Message is null/undefined");
//     return;
//   }

//   if (!msg.target) {
//     debugLog("❌ Message has no target property");
//     return;
//   }

//   debugLog("Message target:", msg.target);

//   if (msg.target === "offscreen") {
//     debugLog("🎯 Message is for offscreen - starting relay process");

//     (async () => {
//       try {
//         // Ensure offscreen exists before forwarding
//         debugLog("Ensuring offscreen document exists...");
//         const offscreenReady = await ensureOffscreen();

//         if (!offscreenReady) {
//           debugLog("❌ Failed to ensure offscreen document");
//           sendResponse({
//             ok: false,
//             error: "Failed to create/verify offscreen document",
//           });
//           return;
//         }

//         debugLog("✅ Offscreen document ready, forwarding message...");
//         debugLog("Message being forwarded:", msg);

//         // Forward to offscreen with enhanced error handling
//         chrome.runtime
//           .sendMessage(msg)
//           .then((response) => {
//             debugLog("📨 Response from offscreen received:", response);
//             sendResponse(response);
//           })
//           .catch((error) => {
//             debugLog("❌ Error forwarding to offscreen:", error);
//             sendResponse({
//               ok: false,
//               error: error.message || "Unknown forwarding error",
//               stack: error.stack,
//             });
//           });
//       } catch (error) {
//         debugLog("❌ Exception in message relay:", error);
//         sendResponse({
//           ok: false,
//           error: error.message || "Unknown relay error",
//           stack: error.stack,
//         });
//       }
//     })();

//     debugLog("🔄 Returning true to keep message channel open");
//     return true; // Keep channel open for async response
//   } else {
//     debugLog("📝 Message not for offscreen, target is:", msg.target);
//   }
// });

// // ADD OFFSCREEN ERROR MONITORING
// chrome.runtime.onConnect.addListener((port) => {
//   debugLog("Port connected:", port.name);

//   port.onDisconnect.addListener(() => {
//     debugLog("Port disconnected:", port.name);
//     if (chrome.runtime.lastError) {
//       debugLog("Port disconnect error:", chrome.runtime.lastError);
//     }
//   });
// });

// // Monitor runtime errors
// chrome.runtime.onSuspend.addListener(() => {
//   debugLog("Service worker is being suspended");
// });

// // Add startup verification
// chrome.runtime.onStartup.addListener(async () => {
//   debugLog("Service worker startup - verifying offscreen");
//   const ready = await ensureOffscreen();
//   debugLog("Offscreen ready status:", ready);
// });

// chrome.runtime.onInstalled.addListener(async () => {
//   debugLog("Extension installed - verifying offscreen");
//   const ready = await ensureOffscreen();
//   debugLog("Offscreen ready status:", ready);
// });

// ✅ Sync function: collects unsynced data and POSTs it to the server
// function syncTrackedTimeToServer() {
//   chrome.storage.local.get(["site_time", "sync_metadata"], (res) => {
//     const siteTime = res.site_time || {};
//     const metadata = res.sync_metadata || {};
//     const unsyncedDates = [];

//     for (const date in siteTime) {
//       if (!metadata[date] || metadata[date].synced === false) {
//         unsyncedDates.push(date);
//       }
//     }

//     if (unsyncedDates.length === 0) {
//       console.log("🟢 All dates already synced");
//       return;
//     }

//     const payload = {};
//     unsyncedDates.forEach((date) => {
//       payload[date] = siteTime[date];
//     });

//     fetch("https://yourserver.com/api/sync", {
//       method: "POST",
//       body: JSON.stringify(payload),
//       headers: { "Content-Type": "application/json" },
//     }).then((res) => {
//         if (!res.ok) throw new Error("Failed to sync");

//         // Mark synced and remove from storage
//         unsyncedDates.forEach((date) => {
//           delete siteTime[date]; // remove time data
//           delete metadata[date]; // remove metadata if synced
//         });

//         // Keep only the last sync time
//         metadata.last_sync_time = Date.now();

//         chrome.storage.local.set(
//           {
//             site_time,
//             sync_metadata: metadata,
//           },
//           () =>
//             console.log(
//               "✅ Synced, cleaned metadata and site_time:",
//               Object.keys(payload)
//             )
//         );
//       })
//       .catch((err) => {
//         console.warn("❌ Sync failed:", err);
//       });
//   });

// }

// Handle image classification requests from content scripts
// Single active offscreen creation promise
// let offscreenReady = null;

// // Handle requests from content scripts to classify images
// chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
//   if (msg.type === "CLASSIFY_IMAGE" && msg.imageDataUrl) {
//     try {
//       // Ensure offscreen document exists before sending data
//       await ensureOffscreen();

//       // Send image data to offscreen document for processing
//       chrome.runtime.sendMessage({
//         type: "PROCESS_IMAGE",
//         imageDataUrl: msg.imageDataUrl,
//         tabId: sender.tab?.id,
//         originalSrc: msg.imageSrc || "", // For tracking original image src
//       });

//       sendResponse({ status: "processing" }); // Optional confirmation
//     } catch (err) {
//       console.error("[Background] Failed to ensure offscreen:", err);
//       sendResponse?.({ error: err.message });
//     }

//     // Return true to keep message channel open for async sendResponse
//     return true;
//   }
// });

// // Handle responses coming back from offscreen document
// // Handle responses coming back from offscreen document
// chrome.runtime.onMessage.addListener((msg) => {
//   if (msg.type === "CLASSIFY_RESULT" && typeof msg.tabId === "number") {
//     chrome.tabs.sendMessage(
//       msg.tabId,
//       {
//         type: "CLASSIFY_RESULT",
//         predictions: msg.predictions,
//         src: msg.originalSrc,
//         error: msg.error || null,
//       },
//       (response) => {
//         if (chrome.runtime.lastError) {
//           console.warn(
//             "[Background] Unable to send CLASSIFY_RESULT to tab:",
//             chrome.runtime.lastError.message
//           );
//         }
//       }
//     );
//   }
// });

// // Utility to ensure the offscreen document is created only once
// async function ensureOffscreen() {
//   const alreadyExists = await chrome.offscreen.hasDocument();
//   if (alreadyExists) return;

//   if (!offscreenReady) {
//     offscreenReady = chrome.offscreen
//       .createDocument({
//         url: "offscreen.html",
//         reasons: ["BLOBS", "DOM_SCRAPING"],
//         justification: "Run TensorFlow model in isolated background safely",
//       })
//       .catch((err) => {
//         offscreenReady = null; // Reset so retry works
//         throw err;
//       });
//   }

//   return offscreenReady;
// }

// let nsfwModel;

// async function loadModel() {
//   if (nsfwModel) {
//     console.warn("[NSFWJS] Model already loaded, returning cached model.");
//     return nsfwModel;
//   }

//   try {
//     console.warn("[NSFWJS] Loading TensorFlow.js...");
//     console.warn("[NSFWJS] Setting environment flags...");
//     tf.env().set("WASM_HAS_MULTITHREAD_SUPPORT", true);
//     tf.env().set("WASM_HAS_SIMD_SUPPORT", true);

//     tf.setWasmPaths(chrome.runtime.getURL("libs/"));
//     await tf.setBackend("wasm");
//     await tf.ready();

//     nsfwModel = await nsfwjs.load(
//       chrome.runtime.getURL("public/models/model.json")
//     );
//     return nsfwModel;
//   } catch (err) {
//     console.warn("[NSFWJS] Failed to load model:", err);
//     throw err;
//   }
// }

// async function classifyImage(dataUrl) {
//   try {
//     console.warn("[NSFWJS] Starting image classification...");
//     const model = await loadModel();

//     console.warn("[NSFWJS] Creating image element...");
//     const img = new Image();
//     img.src = dataUrl;
//     await new Promise((resolve) => (img.onload = resolve));

//     console.warn("[NSFWJS] Drawing image on OffscreenCanvas...");
//     const canvas = new OffscreenCanvas(img.width, img.height);
//     const ctx = canvas.getContext("2d", { willReadFrequently: true });
//     ctx.drawImage(img, 0, 0);

//     console.warn("[NSFWJS] Running model prediction...");
//     const predictions = await model.classify(canvas);
//     console.warn("[NSFWJS] Prediction complete:", predictions);

//     return predictions;
//   } catch (err) {
//     console.warn("[NSFWJS] Error during classification:", err);
//     throw err;
//   }
// }

// chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
//   if (msg.type === "CLASSIFY_IMAGE" && msg.imageDataUrl) {
//     console.warn("[NSFWJS] Received CLASSIFY_IMAGE message.");
//     classifyImage(msg.imageDataUrl)
//       .then((predictions) => {
//         console.warn("[NSFWJS] Sending predictions back to sender.");
//         sendResponse({ predictions });
//       })
//       .catch((err) => {
//         console.warn("[NSFWJS] Sending error back to sender:", err);
//         sendResponse({ error: err.message });
//       });
//     return true; // Keep message channel open
//   } else {
//     console.warn("[NSFWJS] Unknown message type or missing imageDataUrl.");
//   }
// });

// const HEARTBEAT_INTERVAL_MINUTES = 1;
// const SUSPICIOUS_GAP_MINUTES = 2;
// const ANALYSIS_WINDOW_MINUTES = 15; // for optional heuristics

// // Set up heartbeat
// chrome.alarms.create("heartbeat", {
//   periodInMinutes: HEARTBEAT_INTERVAL_MINUTES,
// });

// chrome.alarms.onAlarm.addListener((alarm) => {
//   if (alarm.name === "heartbeat") {
//     const now = Date.now();
//     chrome.storage.local.set({ lastSeen: now });
//     console.log("✅ Heartbeat saved at", new Date(now).toLocaleTimeString());
//   }
// });

// // Startup analyzer
// (async function analyzeGapOnStartup() {
//   const now = Date.now();

//   chrome.storage.local.get(["lastSeen", "lastSuspicious"], (data) => {
//     const lastSeen = data.lastSeen || now;
//     const gap = now - lastSeen;
//     const gapMinutes = Math.floor(gap / 60000);

//     if (gapMinutes >= SUSPICIOUS_GAP_MINUTES) {
//       const entry = {
//         timestamp: now,
//         type: "suspicious-gap",
//         gapMinutes,
//         lastSeen,
//       };

//       console.warn(`⚠️ Suspicious gap: ${gapMinutes} minutes`);

//       storeSuspiciousActivity(entry);

//       chrome.storage.local.set({ suspiciousGap: gapMinutes });
//       analyzeHistoryDuringGap(lastSeen, now);
//     }

//     chrome.storage.local.set({ lastSeen: now });
//   });
// })();

// // Suspicious activity log
// function storeSuspiciousActivity(entry) {
//   chrome.storage.local.get(["activityLog"], (data) => {
//     const log = data.activityLog || [];
//     log.push(entry);
//     chrome.storage.local.set({ activityLog: log });
//   });
// }

// function analyzeHistoryDuringGap(lastSeen, now) {
//   chrome.history.search(
//     {
//       text: "",
//       startTime: lastSeen,
//       endTime: now,
//       maxResults: 20,
//     },
//     (results) => {
//       if (results.length > 0) {
//         console.warn("❗ Browser was active during suspicious gap:", results);
//         storeSuspiciousActivity({
//           timestamp: now,
//           type: "history-during-gap",
//           urls: results.map((r) => r.url),
//         });
//       } else {
//         console.log(
//           "🧼 No browser activity during suspicious gap (maybe shutdown)"
//         );
//       }
//     }
//   );
// }

// ✅ YouTube Watch Tracker
// const trackYouTubeWatch = (url) => {
//   if (!url.hostname.includes("youtube.com")) return;

//   let videoId = null;
//   let isShort = false;

//   if (url.pathname === "/watch") {
//     videoId = url.searchParams.get("v");
//   } else if (url.pathname.startsWith("/shorts/")) {
//     videoId = url.pathname.split("/")[2];
//     isShort = true;
//   }

//   if (videoId) {
//     const storageKey = isShort ? "shorts" : "watchedVideos";
//     chrome.storage.local.get({ [storageKey]: [] }, (result) => {
//       const list = result[storageKey];
//       if (!list.includes(videoId)) {
//         list.push(videoId);
//         chrome.storage.local.set({ [storageKey]: list });
//         console.log(`📼 Tracked ${isShort ? "short" : "video"}:`, videoId);
//       } else {
//         console.log(
//           `✅ Already tracked ${isShort ? "short" : "video"}:`,
//           videoId
//         );
//       }
//     });
//   }
// };

// // ✅ Facebook Watch Tracker
// const trackFacebookWatch = (url) => {
//   if (!url.hostname.includes("facebook.com")) return;

//   if (url.pathname === "/watch") {
//     const videoId = url.searchParams.get("v");
//     if (videoId) {
//       chrome.storage.local.get({ facebookVideos: [] }, (result) => {
//         const list = result.facebookVideos;
//         if (!list.includes(videoId)) {
//           list.push(videoId);
//           chrome.storage.local.set({ facebookVideos: list });
//           console.log("🎥 Tracked Facebook Watch video:", videoId);
//         } else {
//           console.log("✅ Already tracked Facebook Watch video:", videoId);
//         }
//       });
//     }
//   }
// };

// // ✅ Facebook Reels Tracker
// const trackFacebookReel = (url) => {
//   if (!url.hostname.includes("facebook.com")) return;

//   if (url.pathname.startsWith("/reel/")) {
//     const reelId = url.pathname.split("/")[2];
//     if (reelId) {
//       chrome.storage.local.get({ facebookReels: [] }, (result) => {
//         const list = result.facebookReels;
//         if (!list.includes(reelId)) {
//           list.push(reelId);
//           chrome.storage.local.set({ facebookReels: list });
//           console.log("🎬 Tracked Facebook Reel:", reelId);
//         } else {
//           console.log("✅ Already tracked Facebook Reel:", reelId);
//         }
//       });
//     }
//   }
// };

// // ✅ Navigation handler for both YouTube and Facebook
// const handleNavigation = (details) => {
//   try {
//     const url = new URL(details.url);
//     console.log("🎯 Checking URL:", url.href);

//     trackYouTubeWatch(url);
//     trackFacebookReel(url);
//     trackFacebookWatch(url);
//   } catch (err) {
//     console.error("💥 Error parsing URL:", err);
//   }
// };

// ✅ Listen for YouTube/Facebook navigation events
// chrome.webNavigation.onCompleted.addListener(handleNavigation, {
//   url: [{ urlContains: "youtube.com" }, { urlContains: "facebook.com" }],
// });

// chrome.webNavigation.onHistoryStateUpdated.addListener(handleNavigation, {
//   url: [{ urlContains: "youtube.com" }, { urlContains: "facebook.com" }],
// });

// const TRACKED_SITES = ["facebook.com", "youtube.com"];
// let currentTabId = null;
// let currentDomain = null;
// let timerStart = null;
// let isUserActive = true;
// const injectedContentScripts = new Set();
// // Track if a video is playing in a specific tab
// const videoPlayingInTab = {};

// // Simple logging that always shows
// function log(action, message) {
//   const now = new Date();
//   const timeStr =
//     now.toLocaleTimeString() +
//     "." +
//     now.getMilliseconds().toString().padStart(3, "0");
//   console.warn(`[${timeStr}] ${action}: ${message}`);
// }

// function getDomain(url) {
//   try {
//     return new URL(url).hostname;
//   } catch {
//     return null;
//   }
// }

// function isTrackedSite(url) {
//   const domain = getDomain(url);
//   return domain && TRACKED_SITES.some((site) => domain.includes(site));
// }

// function startTimer(tabId, url, reason, isWindowCurrentlyFocused) {
//   console.warn("start", reason, "focused:", isWindowCurrentlyFocused);
//   if (!isTrackedSite(url) || !isWindowCurrentlyFocused || !isUserActive) {
//     log(
//       "SKIP START",
//       `url=${url} focused=${isWindowCurrentlyFocused} active=${isUserActive}`
//     );
//     return;
//   }

//   const domain = getDomain(url);
//   if (timerStart && currentDomain === domain) {
//     log("ALREADY", `Already tracking ${domain}`);
//     return;
//   }

//   // If switching to different site, stop current timer first
//   if (timerStart && currentDomain !== domain) {
//     stopTimer(`switching-to-${domain}`);
//   }

//   currentTabId = tabId;
//   currentDomain = domain;
//   timerStart = Date.now();
//   log("START", `Tracking ${domain} (${reason})`);
// }

// function stopTimer(reason) {
//   console.warn("stop", reason);
//   if (!timerStart) {
//     console.warn("stop - no timer", reason);
//     log("SKIP STOP", "No active timer", reason);
//     return;
//   }

//   const seconds = Math.floor((Date.now() - timerStart) / 1000);
//   console.warn("duration:", seconds);
//   if (seconds >= 5) {
//     log("STOP", `Logged ${seconds}s on ${currentDomain} (${reason})`);
//     chrome.storage.local.get(["activityLog"], (res) => {
//       const logEntry = {
//         domain: currentDomain,
//         duration: seconds,
//         timestamp: Date.now(),
//         type: "site-visit",
//         reason,
//       };
//       const updatedLog = [...(res.activityLog || []), logEntry];
//       chrome.storage.local.set({ activityLog: updatedLog });
//     });
//   } else {
//     console.warn("its short");
//     log("SHORT", `Ignored short ${seconds}s on ${currentDomain}`);
//   }

//   timerStart = null;
//   currentDomain = null;
// }

// // Inject content script into YouTube tabs
// // To track tabs where content script is injected

// // ... (Your log, getDomain, isTrackedSite, startTimer, stopTimer functions)

// // Inject content script into YouTube tabs (only once per tab)
// chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
//   console.warn("onUpdated:", tabId, changeInfo, tab.url);
//   if (
//     changeInfo.status === "complete" &&
//     isTrackedSite(tab.url) &&
//     getDomain(tab.url).includes("youtube.com") &&
//     !injectedContentScripts.has(tabId)
//   ) {
//     console.warn("Injecting content script into tab:", tabId);
//     chrome.scripting
//       .executeScript({
//         target: { tabId: tabId },
//         files: ["content.js"],
//       })
//       .then(() => {
//         injectedContentScripts.add(tabId);
//         // Reset video playing state on initial injection
//         chrome.tabs.sendMessage(tabId, { action: "resetVideoState" });
//       })
//       .catch((error) => {
//         console.error("Failed to inject content script:", error);
//       });
//   } else if (
//     changeInfo.url &&
//     isTrackedSite(tab.url) &&
//     getDomain(tab.url).includes("youtube.com")
//   ) {
//     // Reset video playing state on navigation within YouTube (even if already injected)
//     chrome.tabs.sendMessage(tabId, { action: "resetVideoState" });
//   }
// });

// // Listen for messages from the content script
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   console.warn("onmessage in the backgound");
//   if (
//     request.action === "videoPlaying" &&
//     sender.tab &&
//     sender.tab.id !== undefined
//   ) {
//     videoPlayingInTab[sender.tab.id] = request.isPlaying;
//     console.warn(`Tab ${sender.tab.id} video playing: ${request.isPlaying}`);
//   }
//   // You don't seem to be sending a response, so no need to return true here.
// });

// // Tab events
// chrome.tabs.onActivated.addListener(({ tabId }) => {
//   console.warn("inside onactivated");
//   chrome.windows.getCurrent((currentWindow) => {
//     chrome.tabs.get(tabId, (tab) => {
//       log("TAB", `Switched to tab ${tabId} (${tab.url || "no url"})`);
//       if (tab.url) {
//         startTimer(tabId, tab.url, "tab-switch", currentWindow.focused);
//         // Check if it's a YouTube URL and inject content script if not already done
//         console.warn(
//           isTrackedSite(tab.url),
//           getDomain(tab.url).includes("youtube.com"),
//           injectedContentScripts.has(tabId)
//         );
//         if (
//           isTrackedSite(tab.url) &&
//           getDomain(tab.url).includes("youtube.com") &&
//           !injectedContentScripts.has(tabId)
//         ) {
//           console.warn("Injecting content script on activation:", tabId);
//           chrome.scripting
//             .executeScript({
//               target: { tabId: tabId },
//               files: ["content.js"],
//             })
//             .then(() => {
//               injectedContentScripts.add(tabId);
//               chrome.tabs.sendMessage(tabId, { action: "resetVideoState" });
//               console.warn("message is sent");
//             })
//             .catch((error) => {
//               console.error("Failed to inject content script:", error);
//             });
//         } else if (
//           isTrackedSite(tab.url) &&
//           getDomain(tab.url).includes("youtube.com")
//         ) {
//           // If already injected, still ensure reset for potential new video
//           chrome.tabs.sendMessage(tabId, { action: "resetVideoState" });
//           console.warn("message is sent nested in another ");
//         }
//       }
//       currentTabId = tabId; // Update currentTabId here as well
//     });
//   });
// });

// chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
//   if (changeInfo.url && tabId === currentTabId) {
//     log("URL", `URL changed to ${changeInfo.url}`);
//     chrome.windows.getCurrent((currentWindow) => {
//       if (isTrackedSite(changeInfo.url)) {
//         startTimer(tabId, changeInfo.url, "url-change", currentWindow.focused);
//       } else {
//         stopTimer("left-tracked-site");
//       }
//     });
//   }
// });

// // Window focus
// chrome.windows.onFocusChanged.addListener((windowId) => {
//   const focused = windowId !== chrome.windows.WINDOW_ID_NONE;
//   log("FOCUS", `Window focus changed to ${focused ? windowId : "NONE"}`);
//   if (!focused) {
//     stopTimer("window-blur");
//   } else {
//     chrome.tabs.query({ active: true, windowId }, (tabs) => {
//       if (tabs[0]?.url && isTrackedSite(tabs[0].url)) {
//         chrome.windows.getCurrent((currentWindow) => {
//           startTimer(
//             tabs[0].id,
//             tabs[0].url,
//             "window-focus",
//             currentWindow.focused
//           );
//           currentTabId = tabs[0].id; // Ensure currentTabId is updated
//         });
//       }
//     });
//   }
// });

// // Idle detection
// chrome.idle.setDetectionInterval(60);
// chrome.idle.onStateChanged.addListener((state) => {
//   isUserActive = state === "active";
//   log("IDLE", `User state: ${state}`);

//   chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
//     if (tabs[0]?.url && isTrackedSite(tabs[0].url)) {
//       const activeTabId = tabs[0].id;
//       const isVideoPlayingOnActiveTab = videoPlayingInTab[activeTabId] || false;
//       console.warn(
//         "videoPlayingInTab[activeTabId] ",
//         videoPlayingInTab[activeTabId],
//         activeTabId
//       );
//       if (state === "idle" && !isVideoPlayingOnActiveTab) {
//         stopTimer(`user-${state}`);
//       } else if (state === "active") {
//         chrome.windows.getCurrent((currentWindow) => {
//           startTimer(
//             activeTabId,
//             tabs[0].url,
//             "user-active",
//             currentWindow.focused
//           );
//           currentTabId = activeTabId; // Ensure currentTabId is updated
//         });
//       }
//     } else if (state === "idle") {
//       stopTimer(`user-${state}`); // Still stop if not on a tracked site
//     }
//   });
// });

// // Simple periodic check (every 30 seconds)
// setInterval(() => {
//   if (!timerStart) return;

//   chrome.tabs.get(currentTabId, (tab) => {
//     if (!tab?.url || !isTrackedSite(tab.url)) {
//       log("CHECK", "Tab changed unexpectedly");
//       stopTimer("periodic-check");
//     }
//   });
// }, 30000);

// log("INIT", "Time tracker started");
//--------------

// {
//   "manifest_version": 3,
//   "name": "Parental Control Extension",
//   "version": "1.0",
//   "description": "Parental control extension for monitoring online activity",
//   "permissions": [
//     "scripting",
//     "tabs",
//     "idle",
//     "declarativeNetRequestWithHostAccess",
//     "declarativeNetRequest",
//     "storage",
//     "webNavigation",
//     "alarms",
//     "offscreen",
//     "history",
//     "notifications"
//   ],
//   "background": {
//     "service_worker": "background.js",
//     "type": "module"
//   },
//   "content_scripts": [
//      {
//       "matches": ["https://www.facebook.com/*"],
//       "js": ["facebook-content.js", "block-feeds.js"],
//       "run_at": "document_idle"
//     },
//     {
//       "matches": ["https://www.youtube.com/*"],
//       "js": ["youtube-content.js", "block-feeds.js"],
//       "run_at": "document_idle"
//     },
//     {
//       "matches": ["<all_urls>"],
//       "js": ["nsfw-content.js"],
//     "run_at": "document_start"
//     }
//   ],
//     "incognito": "spanning",
//   "host_permissions": ["<all_urls>"],
//   "action": {
//     "default_popup": "popup.html",
//     "default_icon": {
//       "16": "vite.svg",
//       "48": "vite.svg",
//       "128": "vite.svg"
//     }
//   },
//   "icons": {
//     "16": "vite.svg",
//     "48": "vite.svg",
//     "128": "vite.svg"
//   },
//   "web_accessible_resources": [
//     {
//       "resources": [
//         // "sandbox.html",
//         "locked.html"
//         // "sandbox.js",
//         // "libs/tf.min.js",
//         // "libs/tf-backend-wasm.js",
//         // "libs/nsfwjs.min.js",
//         // "libs/tfjs-backend-wasm.wasm",
//         // "libs/tfjs-backend-wasm-simd.wasm",
//         // "libs/tfjs-backend-wasm-threaded-simd.wasm",
//         // "libstwo/tf-backend-wasm.js",
//         // "libstwo/tfjs-backend-wasm.wasm",
//         // "libstwo/tfjs-backend-wasm-simd.wasm",
//         // "libstwo/tfjs-backend-wasm-threaded-simd.wasm",
//         // "libstwo/tf-backend-wasm.es2017.js",
//         // "libstwo/tf-backend-wasm.fesm.js",
//         // "models/*/*",
//         // "m/wasm/*.wasm",
//         // "human-models/*"
//       ],
//       "matches": ["<all_urls>"]
//     }
//   ],
//   "declarative_net_request": {
//     "rule_resources": [
//       {
//         "id": "ruleset_1",
//         "enabled": true,
//         "path": "rules.json"
//       }
//     ]
//   },
//     "sandbox": {
//     "pages": ["sandbox.html"]
//   },
//  "content_security_policy": {
//  "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
//   }

// }
