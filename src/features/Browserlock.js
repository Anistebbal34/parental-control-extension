// ==========================================
// BROWSER LOCK FEATURE
// ==========================================
// Lockdown mode and whitelist mode with scheduling

import { hashStringToId } from "../utils/hash.js";

const FEATURE_LOCK = "browser_lock";
const RULE_ID_OFFSET = 20_000;

// ==============================
// TIME CHECKING UTILITIES
// ==============================

function isTimeInRange(current, start, end) {
  const [cH, cM] = current.split(":").map(Number);
  const [sH, sM] = start.split(":").map(Number);
  const [eH, eM] = end.split(":").map(Number);

  const curr = cH * 60 + cM;
  const startMin = sH * 60 + sM;
  const endMin = eH * 60 + eM;

  console.log("[DEBUG_LOCK] isTimeInRange:", {
    current,
    start,
    end,
    curr,
    startMin,
    endMin,
  });

  // Normal range
  if (startMin < endMin) {
    const result = curr >= startMin && curr < endMin;
    console.log("[DEBUG_LOCK] Normal range result:", result);
    return result;
  }

  // Overnight range
  const result = curr >= startMin || curr < endMin;
  console.log("[DEBUG_LOCK] Overnight range result:", result);
  return result;
}

function isCurrentlyLocked(schedules) {
  const now = new Date();
  const day = now.getDay();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;

  console.log("[DEBUG_LOCK] Checking isCurrentlyLocked:", { day, time });

  const locked = schedules.some(
    (s) =>
      s.active &&
      s.daysOfWeek.includes(day) &&
      isTimeInRange(time, s.start, s.end),
  );

  console.log("[DEBUG_LOCK] isCurrentlyLocked result:", locked);
  return locked;
}

// ==============================
// RULE BUILDERS
// ==============================

function buildLockdownRules() {
  const rules = [];
  // Redirect ALL sites to locked.html
  rules.push({
    id: hashStringToId(`${FEATURE_LOCK}:lock:redirect`, RULE_ID_OFFSET),
    priority: 1,
    action: {
      type: "redirect",
      redirect: {
        url: chrome.runtime.getURL("locked.html?reason=lockdown"),
      },
    },
    condition: {
      urlFilter: "*://*/*",
      resourceTypes: ["main_frame"],
    },
  });

  console.log("[DEBUG_LOCK] buildLockdownRules: Created redirect-all rule");
  return rules;
}

function addGoogleAllowRules(rules) {
  const googleDomains = ["google.com"];

  for (const domain of googleDomains) {
    // Allow main domain
    rules.push({
      id: hashStringToId(`${FEATURE_LOCK}:allow:${domain}`, RULE_ID_OFFSET),
      priority: 100,
      action: { type: "allow" },
      condition: {
        urlFilter: `*://${domain}/*`,
        resourceTypes: ["main_frame"],
      },
    });

    // Allow all subdomains
    rules.push({
      id: hashStringToId(
        `${FEATURE_LOCK}:allow:subdomain:${domain}`,
        RULE_ID_OFFSET,
      ),
      priority: 100,
      action: { type: "allow" },
      condition: {
        urlFilter: `*://*.${domain}/*`,
        resourceTypes: ["main_frame"],
      },
    });
  }
}

function buildWhitelistRules(allowedSites) {
  const rules = [];

  // Block everything (low priority)
  rules.push({
    id: hashStringToId(`${FEATURE_LOCK}:whitelist:blockall`, RULE_ID_OFFSET),
    priority: 1,
    action: {
      type: "redirect",
      redirect: {
        url: chrome.runtime.getURL("locked.html?reason=whitelist"),
      },
    },
    condition: {
      urlFilter: "*://*/*",
      resourceTypes: ["main_frame"],
    },
  });

  // Always allow Google
  addGoogleAllowRules(rules);

  // Allow whitelisted sites
  for (const site of allowedSites) {
    // Allow main domain
    rules.push({
      id: hashStringToId(`${FEATURE_LOCK}:allow:${site}`, RULE_ID_OFFSET),
      priority: 10,
      action: { type: "allow" },
      condition: {
        urlFilter: `*://${site}/*`,
        resourceTypes: ["main_frame"],
      },
    });

    // Allow all subdomains
    rules.push({
      id: hashStringToId(
        `${FEATURE_LOCK}:allow:subdomain:${site}`,
        RULE_ID_OFFSET,
      ),
      priority: 10,
      action: { type: "allow" },
      condition: {
        urlFilter: `*://*.${site}/*`,
        resourceTypes: ["main_frame"],
      },
    });
  }

  return rules;
}

// ==============================
// RULE APPLICATION
// ==============================

async function applyFeatureRules(featureName, newRules) {
  console.log("[DEBUG_LOCK] Applying feature rules for:", featureName);

  // Log detailed rule info BEFORE applying
  console.table(
    newRules.map((r) => ({
      id: r.id,
      priority: r.priority,
      action: r.action.type,
      redirectTo: r.action.redirect?.url?.substring(0, 50) || "N/A",
      urlFilter: r.condition.urlFilter,
    })),
  );

  const existing = await chrome.declarativeNetRequest.getDynamicRules();

  // Only remove rules belonging to THIS feature
  const featureRuleIds = existing
    .filter((r) => r.id >= RULE_ID_OFFSET && r.id < RULE_ID_OFFSET + 10_000)
    .map((r) => r.id);

  console.log("[DEBUG_LOCK] Existing feature rule IDs:", featureRuleIds);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: featureRuleIds,
    addRules: newRules,
  });

  // Verify rules were applied
  const afterRules = await chrome.declarativeNetRequest.getDynamicRules();
  console.log(
    `[DEBUG_LOCK] ✅ [${featureName}] rules applied successfully. Total active rules:`,
    afterRules.length,
  );
}

// ==============================
// MAIN LOCK CHECK LOGIC
// ==============================

async function checkAndApplyBrowserLock() {
  try {
    const { browserLockConfig } =
      await chrome.storage.local.get("browserLockConfig");

    console.log("[DEBUG_LOCK] Loaded browserLockConfig:", browserLockConfig);

    if (!browserLockConfig) return;

    const { lockdown, whitelist, currentMode } = browserLockConfig;

    let nextMode = "normal";

    if (lockdown.enabled && isCurrentlyLocked(lockdown.schedules)) {
      nextMode = "locked";
    } else if (whitelist.enabled) {
      nextMode = "whitelist";
    }

    console.log(
      "[DEBUG_LOCK] Determined nextMode:",
      nextMode,
      "currentMode:",
      currentMode,
    );

    if (nextMode === currentMode) {
      console.log(
        "[DEBUG_LOCK] No change in browser mode, skipping rule update.",
      );
      return;
    }

    console.log(
      `[DEBUG_LOCK] Browser mode changing: ${currentMode} → ${nextMode}`,
    );

    let rules = [];

    if (nextMode === "locked") {
      rules = buildLockdownRules();
      addGoogleAllowRules(rules);
    }

    if (nextMode === "whitelist") {
      rules = buildWhitelistRules(whitelist.sites);
    }

    await applyFeatureRules(FEATURE_LOCK, rules);

    browserLockConfig.currentMode = nextMode;
    await chrome.storage.local.set({ browserLockConfig });

    console.log("[DEBUG_LOCK] Browser lock status updated and stored.");
  } catch (error) {
    console.error("[DEBUG_LOCK] Error in checkAndApplyBrowserLock:", error);
  }
}

// ==============================
// SEARCH ENGINE REDIRECT
// ==============================

function setupSearchEngineRedirect() {
  chrome.webNavigation.onBeforeNavigate.addListener(
    async (details) => {
      if (details.frameId !== 0) return; // Only main frame

      const url = new URL(details.url);

      const searchEngines = [
        { pattern: /\.yahoo\.com$/, param: "p" },
        { pattern: /^www\.bing\.com$/, param: "q" },
        { pattern: /^duckduckgo\.com$/, param: "q" },
        { pattern: /^search\.brave\.com$/, param: "q" },
      ];

      for (const engine of searchEngines) {
        if (engine.pattern.test(url.hostname)) {
          const query = url.searchParams.get(engine.param);
          console.log(
            `[SEARCH_REDIRECT] Detected ${url.hostname}, query:`,
            query,
          );
          if (query) {
            const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(
              query,
            )}`;
            chrome.tabs.update(details.tabId, { url: googleUrl });
            return;
          }
        }
      }
    },
    { url: [{ urlMatches: ".*" }] },
  );

  console.log("✅ Search engine redirect initialized");
}

// ==============================
// PUBLIC API
// ==============================

/**
 * Setup browser lock feature
 */
export function setupBrowserLock() {
  // Create periodic check alarm
  chrome.alarms.clear("browserLockCheck", () => {
    chrome.alarms.create("browserLockCheck", { periodInMinutes: 1 });
  });

  // Listen for alarm
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "browserLockCheck") {
      await checkAndApplyBrowserLock();

      const activeRules = await chrome.declarativeNetRequest.getDynamicRules();
      console.log("[DEBUG_LOCK] Active rules after check:", activeRules.length);
      console.table(
        activeRules.map((r) => ({
          id: r.id,
          priority: r.priority,
          action: r.action.type,
          redirectTo: r.action.redirect?.url || "N/A",
          urlFilter: r.condition.urlFilter,
        })),
      );
    }
  });

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.browserLockConfig) {
      if (changes.browserLockConfig) {
        console.log("[DEBUG_LOCK] browserLockConfig changed");
        checkAndApplyBrowserLock();
      }
    }
  });

  // Setup search engine redirect
  setupSearchEngineRedirect();

  console.log("✅ Browser lock feature initialized");
}
