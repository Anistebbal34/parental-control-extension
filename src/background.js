// ✅ Modified background.js
import { analyzeGapOnStartup } from "./gapMonitoring.js";
import {
  trackYouTubeWatch,
  trackFacebookWatch,
  trackFacebookReel,
  handleNavigation,
} from "./videoTracker.js";
import { registerTimeTrackingEvents } from "./timeTracker.js";

// Track install and update
chrome.runtime.onInstalled.addListener((details) => {
  console.warn("🔧 Extension installed (reason:", details.reason + ")");

  if (details.reason === "update" || details.reason === "install") {
    chrome.storage.local.clear(() => {
      console.warn("🧹 Local storage cleared (for clean dev state)");
    });
  }

  // Optional: Set uninstall tracking URL
  // chrome.runtime.setUninstallURL("https://yourdomain.com/uninstalled?ts=" + Date.now());
});
analyzeGapOnStartup();
chrome.webNavigation.onCompleted.addListener(handleNavigation, {
  url: [{ urlContains: "youtube.com" }, { urlContains: "facebook.com" }],
});

chrome.webNavigation.onHistoryStateUpdated.addListener(handleNavigation, {
  url: [{ urlContains: "youtube.com" }, { urlContains: "facebook.com" }],
});
registerTimeTrackingEvents();
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
registerTimeTrackingEvents();
