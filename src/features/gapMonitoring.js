// gapMonitor.js

const HEARTBEAT_INTERVAL_MINUTES = 1;
const SUSPICIOUS_GAP_MINUTES = 2;

export function setupHeartbeatAlarm() {
  chrome.alarms.get("heartbeat", (alarm) => {
    if (!alarm) {
      chrome.alarms.create("heartbeat", {
        periodInMinutes: HEARTBEAT_INTERVAL_MINUTES,
      });
      console.log("⏱️ Created heartbeat alarm.");
    } else {
      console.log("✅ Heartbeat alarm already exists.");
    }
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "heartbeat") {
    const now = Date.now();
    chrome.storage.local.set({ lastSeen: now });
    console.log("✅ Heartbeat saved at", new Date(now).toLocaleTimeString());
  }
});

// On extension startup, check gap
export function analyzeGapOnStartup() {
  const now = Date.now();
  console.warn("🔧 Extension  is fired ");

  chrome.storage.local.get(["lastSeen", "lastSuspicious"], (data) => {
    const lastSeen = data.lastSeen || now;
    const gap = now - lastSeen;
    const gapMinutes = Math.floor(gap / 60000);
    console.warn(gapMinutes, "hmm gap 0 ");

    if (gapMinutes >= SUSPICIOUS_GAP_MINUTES) {
      console.warn(gapMinutes, "hmm gap 1 ");
      const entry = {
        timestamp: now,
        type: "suspicious-gap",
        gapMinutes,
        lastSeen,
      };

      console.warn(`⚠️ Suspicious gap: ${gapMinutes} minutes`);
      chrome.action.setBadgeText({ text: "sN" });
      chrome.action.setBadgeBackgroundColor({ color: "#e4004cff" });

      storeSuspiciousActivity(entry);

      chrome.storage.local.set({ suspiciousGap: gapMinutes });
      analyzeHistoryDuringGap(lastSeen, now);
    }

    chrome.storage.local.set({ lastSeen: now });
  });
}

function storeSuspiciousActivity(entry) {
  chrome.storage.local.get(["activityLog"], (data) => {
    const log = data.activityLog || [];
    log.push(entry);
    chrome.storage.local.set({ activityLog: log });
  });
}

function analyzeHistoryDuringGap(lastSeen, now) {
  chrome.history.search(
    {
      text: "",
      startTime: lastSeen,
      endTime: now,
      maxResults: 20,
    },
    (results) => {
      if (results.length > 0) {
        console.warn("❗ Browser was active during suspicious gap:", results);
        storeSuspiciousActivity({
          timestamp: now,
          type: "history-during-gap",
          urls: results.map((r) => r.url),
        });
      } else {
        console.log(
          "🧼 No browser activity during suspicious gap (maybe shutdown)"
        );
      }
    }
  );
}
