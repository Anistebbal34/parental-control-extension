export function registerTimeTrackingEvents() {
  let activeTabId = null;
  let activeStartTime = null;
  let activeDomain = null;

  function getTodayKey() {
    const today = new Date();
    return `${today.getFullYear()}_${String(today.getMonth() + 1).padStart(
      2,
      "0",
    )}_${String(today.getDate()).padStart(2, "0")}`;
  }

  function getDomainFromUrl(url) {
    try {
      const domain = new URL(url).hostname.replace(/^www\./, "");
      console.warn("🌍 Extracted domain:", domain, "from URL:", url);
      return domain;
    } catch (e) {
      console.warn("❌ Failed to extract domain from URL:", url);
      return null;
    }
  }

  function updateStorage(domain, seconds) {
    const key = getTodayKey();
    console.warn(`💾 Storing ${seconds}s for ${domain} on ${key}`);
    chrome.storage.local.get(["site_time", "sync_metadata"], (res) => {
      const data = res.site_time || {};
      const metadata = res.sync_metadata || {};

      if (!data[key]) data[key] = {};
      if (!data[key][domain]) data[key][domain] = 0;

      data[key][domain] += seconds;

      // Mark today's data as not yet synced
      if (!metadata[key]) metadata[key] = {};
      metadata[key].synced = false;

      chrome.storage.local.set(
        { site_time: data, sync_metadata: metadata },
        () => {
          console.warn("✅ Storage updated:", data[key]);
        },
      );
    });
  }

  function onTabChange(tabId, changeInfo, tab) {
    if (changeInfo.status === "complete" && tab.active) {
      console.warn("🧭 onTabChange → tab completed and active:", tab.url);
      if (activeTabId !== null && activeStartTime) {
        const timeSpent = Math.floor((Date.now() - activeStartTime) / 1000);
        console.warn(
          "🕒 Tab change → saving previous session:",
          activeDomain,
          timeSpent,
        );
        if (activeDomain) updateStorage(activeDomain, timeSpent);
      }

      activeTabId = tabId;
      activeStartTime = Date.now();
      activeDomain = getDomainFromUrl(tab.url);
      console.warn("🔁 Switched to new tab:", activeDomain);
    }
  }

  chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    console.warn("🧲 onActivated → Tab ID:", tabId);
    try {
      const tab = await chrome.tabs.get(tabId);
      if (!tab.url) {
        console.warn("⚠️ Tab has no URL.");
        return;
      }

      if (activeTabId !== null && activeStartTime) {
        const timeSpent = Math.floor((Date.now() - activeStartTime) / 1000);
        console.warn(
          "🕒 Tab activated → saving previous session:",
          activeDomain,
          timeSpent,
        );
        if (activeDomain) updateStorage(activeDomain, timeSpent);
      }

      activeTabId = tabId;
      activeStartTime = Date.now();
      activeDomain = getDomainFromUrl(tab.url);
      console.warn("✅ New active tab:", activeDomain);
    } catch (error) {
      console.warn("❌ Error in onActivated:", error);
    }
  });

  chrome.tabs.onUpdated.addListener(onTabChange);

  chrome.idle.onStateChanged.addListener((newState) => {
    console.warn("⚡ Idle state changed:", newState);
    if (newState !== "active" && activeDomain && activeStartTime) {
      const timeSpent = Math.floor((Date.now() - activeStartTime) / 1000);
      console.warn(
        "😴 User became idle → saving session:",
        activeDomain,
        timeSpent,
      );
      updateStorage(activeDomain, timeSpent);
      activeStartTime = null;
    } else if (newState === "active") {
      console.warn("👤 User is active again → starting new timer");
      activeStartTime = Date.now();
    }
  });
  chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    if (tabId === activeTabId && activeStartTime) {
      const timeSpent = Math.floor((Date.now() - activeStartTime) / 1000);
      console.warn("🗑️ Tab closed → saving session:", activeDomain, timeSpent);
      if (activeDomain) updateStorage(activeDomain, timeSpent);
      activeTabId = null;
      activeStartTime = null;
      activeDomain = null;
    }
  });

  console.log("📡 Tab tracking initialized");
}
