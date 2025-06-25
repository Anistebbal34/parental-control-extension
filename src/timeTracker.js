// // timeTracker.js

// const TRACKED_SITES = ["facebook.com", "youtube.com"];
// let currentTabId = null;
// let currentDomain = null;
// let timerStart = null;
// let isUserActive = true;
// const injectedContentScripts = new Set();
// const videoPlayingInTab = {};

// // Utility: formatted logging
// function log(action, message) {
//   const now = new Date();
//   const timeStr =
//     now.toLocaleTimeString() +
//     "." +
//     now.getMilliseconds().toString().padStart(3, "0");
//   console.warn(`[${timeStr}] ${action}: ${message}`);
// }

// // Utility: domain checker
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

// // Start time tracking
// function startTimer(tabId, url, reason, isWindowCurrentlyFocused) {
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

//   if (timerStart && currentDomain !== domain) {
//     stopTimer(`switching-to-${domain}`);
//   }

//   currentTabId = tabId;
//   currentDomain = domain;
//   timerStart = Date.now();
//   log("START", `Tracking ${domain} (${reason})`);
// }

// // Stop and save tracked time
// function stopTimer(reason) {
//   if (!timerStart) return;

//   const seconds = Math.floor((Date.now() - timerStart) / 1000);
//   if (seconds >= 5) {
//     log("STOP", `Logged ${seconds}s on ${currentDomain} (${reason})`);
//     chrome.storage.local.get(["activityLog"], (res) => {
//       const updatedLog = [
//         ...(res.activityLog || []),
//         {
//           domain: currentDomain,
//           duration: seconds,
//           timestamp: Date.now(),
//           type: "site-visit",
//           reason,
//         },
//       ];
//       chrome.storage.local.set({ activityLog: updatedLog });
//     });
//   } else {
//     log("SHORT", `Ignored short ${seconds}s on ${currentDomain}`);
//   }

//   timerStart = null;
//   currentDomain = null;
// }

// // Main registration function
// export function registerTimeTrackingEvents() {
//   // Inject content.js into YouTube tabs
//   chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
//     if (
//       changeInfo.status === "complete" &&
//       isTrackedSite(tab.url) &&
//       getDomain(tab.url).includes("youtube.com") &&
//       !injectedContentScripts.has(tabId)
//     ) {
//       chrome.scripting
//         .executeScript({
//           target: { tabId },
//           files: ["content.js"],
//         })
//         .then(() => {
//           injectedContentScripts.add(tabId);
//           chrome.tabs.sendMessage(tabId, { action: "resetVideoState" });
//         });
//     } else if (
//       changeInfo.url &&
//       isTrackedSite(tab.url) &&
//       getDomain(tab.url).includes("youtube.com")
//     ) {
//       chrome.tabs.sendMessage(tabId, { action: "resetVideoState" });
//     }
//   });

//   // Track play/pause from content script
//   chrome.runtime.onMessage.addListener((request, sender) => {
//     if (
//       request.action === "videoPlaying" &&
//       sender.tab &&
//       sender.tab.id !== undefined
//     ) {
//       videoPlayingInTab[sender.tab.id] = request.isPlaying;
//     }
//   });

//   // Tab switch
//   chrome.tabs.onActivated.addListener(({ tabId }) => {
//     chrome.windows.getCurrent((currentWindow) => {
//       chrome.tabs.get(tabId, (tab) => {
//         if (tab?.url) {
//           startTimer(tabId, tab.url, "tab-switch", currentWindow.focused);
//           if (
//             isTrackedSite(tab.url) &&
//             getDomain(tab.url).includes("youtube.com") &&
//             !injectedContentScripts.has(tabId)
//           ) {
//             chrome.scripting
//               .executeScript({
//                 target: { tabId },
//                 files: ["content.js"],
//               })
//               .then(() => {
//                 injectedContentScripts.add(tabId);
//                 chrome.tabs.sendMessage(tabId, { action: "resetVideoState" });
//               });
//           } else if (
//             isTrackedSite(tab.url) &&
//             getDomain(tab.url).includes("youtube.com")
//           ) {
//             chrome.tabs.sendMessage(tabId, { action: "resetVideoState" });
//           }
//         }
//         currentTabId = tabId;
//       });
//     });
//   });

//   // Detect URL changes in the current tab
//   chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
//     console.warn("onupdates is fired");
//     if (changeInfo.url && tabId === currentTabId) {
//       chrome.windows.getCurrent((currentWindow) => {
//         if (isTrackedSite(changeInfo.url)) {
//           startTimer(
//             tabId,
//             changeInfo.url,
//             "url-change",
//             currentWindow.focused
//           );
//         } else {
//           stopTimer("left-tracked-site");
//         }
//       });
//     }
//   });

//   // Focus/blur of browser window
//   chrome.windows.onFocusChanged.addListener((windowId) => {
//     const focused = windowId !== chrome.windows.WINDOW_ID_NONE;
//     if (!focused) {
//       stopTimer("window-blur");
//     } else {
//       chrome.tabs.query({ active: true, windowId }, (tabs) => {
//         const tab = tabs[0];
//         if (tab?.url && isTrackedSite(tab.url)) {
//           chrome.windows.getCurrent((currentWindow) => {
//             startTimer(tab.id, tab.url, "window-focus", currentWindow.focused);
//             currentTabId = tab.id;
//           });
//         }
//       });
//     }
//   });

//   // Idle state (keyboard/mouse)
//   chrome.idle.setDetectionInterval(60);
//   chrome.idle.onStateChanged.addListener((state) => {
//     isUserActive = state === "active";

//     chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
//       const tab = tabs[0];
//       if (tab?.url && isTrackedSite(tab.url)) {
//         const activeTabId = tab.id;
//         const isVideoPlaying = videoPlayingInTab[activeTabId] || false;

//         if (state === "idle" && !isVideoPlaying) {
//           stopTimer("user-idle");
//         } else if (state === "active") {
//           chrome.windows.getCurrent((currentWindow) => {
//             startTimer(
//               activeTabId,
//               tab.url,
//               "user-active",
//               currentWindow.focused
//             );
//             currentTabId = activeTabId;
//           });
//         }
//       } else if (state === "idle") {
//         stopTimer("user-idle");
//       }
//     });
//   });

//   // Periodic validation every 30s
//   setInterval(() => {
//     if (!timerStart) return;

//     chrome.tabs.get(currentTabId, (tab) => {
//       if (!tab?.url || !isTrackedSite(tab.url)) {
//         stopTimer("periodic-check");
//       }
//     });
//   }, 30000);

//   log("INIT", "Time tracker registered");
// }
// timeTracker.js
// background.js (Manifest V3, with heartbeat and local storage state)

const TRACKED_SITES = ["facebook.com", "youtube.com"];
let currentTabId = null;
let currentDomain = null;
let timerStart = null;
let isUserActive = true;
const injectedContentScripts = new Set();
let heartbeatInterval = null;

// Utility: formatted logging
function log(action, message) {
  const now = new Date();
  const timeStr =
    now.toLocaleTimeString() +
    "." +
    now.getMilliseconds().toString().padStart(3, "0");
  console.warn(`[${timeStr}] ${action}: ${message}`);
}

function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function isTrackedSite(url) {
  const domain = getDomain(url);
  return domain && TRACKED_SITES.some((site) => domain.includes(site));
}

function safeSendMessage(tabId, message, retries = 3) {
  chrome.tabs.sendMessage(tabId, message, (response) => {
    if (chrome.runtime.lastError) {
      if (retries > 0) {
        setTimeout(() => {
          safeSendMessage(tabId, message, retries - 1);
        }, 300);
      } else {
        console.warn("❌ Message failed:", chrome.runtime.lastError.message);
      }
    } else {
      console.log("✅ Received response from content script:", response);
    }
  });
}

function startHeartbeat() {
  if (heartbeatInterval) return;
  heartbeatInterval = setInterval(() => {
    chrome.storage.local.set({ heartbeat: Date.now() });
  }, 20000);
  log("HEARTBEAT", "Started");
}

function stopHeartbeat() {
  clearInterval(heartbeatInterval);
  heartbeatInterval = null;
  log("HEARTBEAT", "Stopped");
}

function startTimer(tabId, url, reason, isWindowCurrentlyFocused) {
  if (!isTrackedSite(url) || !isWindowCurrentlyFocused || !isUserActive) {
    log(
      "SKIP START",
      `url=${url} focused=${isWindowCurrentlyFocused} active=${isUserActive}`
    );
    return;
  }

  const domain = getDomain(url);
  if (timerStart && currentDomain === domain) {
    log("ALREADY", `Already tracking ${domain}`);
    return;
  }

  if (timerStart && currentDomain !== domain) {
    stopTimer(`switching-to-${domain}`);
  }

  currentTabId = tabId;
  currentDomain = domain;
  timerStart = Date.now();

  startHeartbeat();
  log("START", `Tracking ${domain} (${reason})`);
}

function stopTimer(reason) {
  if (!timerStart) return;

  const seconds = Math.floor((Date.now() - timerStart) / 1000);
  if (seconds >= 5) {
    log("STOP", `Logged ${seconds}s on ${currentDomain} (${reason})`);
    chrome.storage.local.get(["activityLog"], (res) => {
      const updatedLog = [
        ...(res.activityLog || []),
        {
          domain: currentDomain,
          duration: seconds,
          timestamp: Date.now(),
          type: "site-visit",
          reason,
        },
      ];
      chrome.storage.local.set({ activityLog: updatedLog });
    });
  } else {
    log("SHORT", `Ignored short ${seconds}s on ${currentDomain}`);
  }

  timerStart = null;
  currentDomain = null;
  stopHeartbeat();
}

export function registerTimeTrackingEvents() {
  chrome.runtime.onMessage.addListener((request, sender) => {
    if (
      request.action === "videoPlaying" &&
      sender.tab &&
      sender.tab.id !== undefined
    ) {
      console.warn("📩 videoPlaying received:", request.isPlaying);
      chrome.storage.local.set({
        [`videoPlaying_${sender.tab.id}`]: request.isPlaying,
      });
    }
  });

  chrome.tabs.onActivated.addListener(({ tabId }) => {
    chrome.windows.getCurrent((currentWindow) => {
      chrome.tabs.get(tabId, (tab) => {
        if (tab?.url) {
          startTimer(tabId, tab.url, "tab-switch", currentWindow.focused);
          if (
            isTrackedSite(tab.url) &&
            getDomain(tab.url).includes("youtube.com") &&
            !injectedContentScripts.has(tabId)
          ) {
            chrome.scripting
              .executeScript({ target: { tabId }, files: ["content.js"] })
              .then(() => {
                injectedContentScripts.add(tabId);
                safeSendMessage(tabId, { action: "resetVideoState" });
              });
          } else {
            safeSendMessage(tabId, { action: "resetVideoState" });
          }
        }
        currentTabId = tabId;
      });
    });
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && isTrackedSite(tab.url)) {
      if (!injectedContentScripts.has(tabId)) {
        chrome.scripting
          .executeScript({ target: { tabId }, files: ["content.js"] })
          .then(() => {
            injectedContentScripts.add(tabId);
            safeSendMessage(tabId, { action: "resetVideoState" });
          });
      } else {
        safeSendMessage(tabId, { action: "resetVideoState" });
      }
    }
  });

  chrome.windows.onFocusChanged.addListener((windowId) => {
    const focused = windowId !== chrome.windows.WINDOW_ID_NONE;
    if (!focused) {
      stopTimer("window-blur");
    } else {
      chrome.tabs.query({ active: true, windowId }, (tabs) => {
        const tab = tabs[0];
        if (tab?.url && isTrackedSite(tab.url)) {
          chrome.windows.getCurrent((currentWindow) => {
            startTimer(tab.id, tab.url, "window-focus", currentWindow.focused);
            currentTabId = tab.id;
          });
        }
      });
    }
  });

  chrome.idle.setDetectionInterval(60);
  chrome.idle.onStateChanged.addListener((state) => {
    isUserActive = state === "active";
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.url && isTrackedSite(tab.url)) {
        const activeTabId = tab.id;
        chrome.storage.local.get(`videoPlaying_${activeTabId}`, (res) => {
          const isPlaying = res[`videoPlaying_${activeTabId}`] || false;
          console.warn(`💤 Idle state: ${state}, videoPlaying=${isPlaying}`);

          if (state === "idle" && !isPlaying) {
            stopTimer("user-idle");
          } else if (state === "active") {
            chrome.windows.getCurrent((currentWindow) => {
              startTimer(
                activeTabId,
                tab.url,
                "user-active",
                currentWindow.focused
              );
              currentTabId = activeTabId;
            });
          }
        });
      } else if (state === "idle") {
        stopTimer("user-idle");
      }
    });
  });

  setInterval(() => {
    if (!timerStart) return;
    chrome.tabs.get(currentTabId, (tab) => {
      if (!tab?.url || !isTrackedSite(tab.url)) {
        stopTimer("periodic-check");
      }
    });
  }, 30000);

  chrome.tabs.onRemoved.addListener((tabId) => {
    injectedContentScripts.delete(tabId);
    chrome.storage.local.remove(`videoPlaying_${tabId}`);
  });

  log("INIT", "Time tracker registered");
}
