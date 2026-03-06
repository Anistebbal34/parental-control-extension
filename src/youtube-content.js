

(() => {
  let feedObserver = null;
  let shortsObserver = null;

  // ═══════════════════════════════════════════════════════════
  // UTILITY FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  function isHomePage() {
    const path = location.pathname;
    return (
      path === "/" ||
      path === "/feed/explore" ||
      path === "/feed/trending" ||
      path.startsWith("/feed/")
    );
  }

  function isWatchPage() {
    return location.pathname.startsWith("/watch");
  }

  function isShortsPage() {
    return location.pathname.startsWith("/shorts");
  }

  function isSearchPage() {
    return location.pathname === "/results";
  }

  // ═══════════════════════════════════════════════════════════
  // FEED BLOCKING FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  function hideYouTubeFeed() {
    // Target the feed grid specifically
    const feedGrid = document.querySelector("ytd-rich-grid-renderer");

    console.warn("[YT Feed] Checking for feed grid:", feedGrid);

    if (feedGrid) {
      feedGrid.style.display = "none";
      console.warn("✅ [YT Feed] YouTube feed hidden");

      // Optional: Show a message to user
      showFeedBlockedMessage();
    }
  }

  function unhideYouTubeFeed() {
    const feedGrid = document.querySelector("ytd-rich-grid-renderer");

    console.warn("[YT Feed] Unhiding feed grid:", feedGrid);

    if (feedGrid) {
      feedGrid.style.display = "";
      console.log("🔓 [YT Feed] YouTube feed shown");

      // Remove blocked message if present
      removeFeedBlockedMessage();
    }
  }

  function showFeedBlockedMessage() {
    // Check if message already exists
    if (document.getElementById("yt-feed-blocked-msg")) return;

    const primary = document.querySelector("#primary");
    if (!primary) return;

    const message = document.createElement("div");
    message.id = "yt-feed-blocked-msg";
    message.style.cssText = `
      padding: 40px;
      text-align: center;
      color: var(--yt-spec-text-secondary);
      font-size: 18px;
      margin-top: 100px;
    `;
    message.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 20px;">🚫</div>
      <div style="font-weight: 500;">YouTube Feed is Blocked</div>
      <div style="margin-top: 10px; font-size: 14px;">
        Disable this setting in the extension popup to see recommendations
      </div>
    `;

    primary.appendChild(message);
    console.log("📌 [YT Feed] Blocked message shown");
  }

  function removeFeedBlockedMessage() {
    const message = document.getElementById("yt-feed-blocked-msg");
    if (message) {
      message.remove();
      console.log("🗑️ [YT Feed] Blocked message removed");
    }
  }

  function setupFeedObserver() {
    console.warn("[YT Feed] Setting up feed observer");

    // Don't create multiple observers
    if (feedObserver) {
      console.warn("[YT Feed] Observer already exists");
      return;
    }

    // Only block on homepage/feed pages
    if (!isHomePage()) {
      console.warn("[YT Feed] Not on homepage, skipping observer");
      return;
    }

    // Create observer
    feedObserver = new MutationObserver(() => {
      if (isHomePage()) {
        hideYouTubeFeed();
      }
    });

    // Observe the main app container
    const appContainer = document.querySelector("ytd-rich-grid-renderer");
    if (appContainer) {
      feedObserver.observe(appContainer, {
        childList: true,
        subtree: true,
      });
      console.log("📌 [YT Feed] Observer activated");
    } else {
      console.error("❌ [YT Feed] Could not find ytd-app container");
    }

    // Hide immediately
    hideYouTubeFeed();
  }

  function stopFeedObserver() {
    console.warn("[YT Feed] Stopping feed observer");

    if (feedObserver) {
      feedObserver.disconnect();
      feedObserver = null;
      console.log("🛑 [YT Feed] Observer stopped");
    }

    unhideYouTubeFeed();
  }
  function blockShortsIfNeeded() {
    // Check if we're on a Shorts page
    if (!isShortsPage()) return;

    // Check if blocking is enabled
    chrome.storage.local.get(["block_youtube_shorts"], (settings) => {
      if (settings.block_youtube_shorts) {
        console.warn(
          "🚫 [YT Shorts] Shorts page detected, redirecting to home"
        );

        // Show brief message before redirect (optional)
        showShortsBlockedNotification();

        // Redirect to homepage
        setTimeout(() => {
          location.href = "/";
        }, 500); // Small delay so user sees what happened
      }
    });
  }

  function showShortsBlockedNotification() {
    // Optional: Show a brief toast notification
    const toast = document.createElement("div");
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #ff0000;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    toast.textContent = "🚫 YouTube Shorts is blocked";

    document.body.appendChild(toast);

    // Remove after redirect
    setTimeout(() => toast.remove(), 600);
  }

  // ═══════════════════════════════════════════════════════════
  // NAVIGATION HANDLING (Important for YouTube SPA)
  // ═══════════════════════════════════════════════════════════

  // YouTube doesn't do full page reloads, so we need to detect navigation
  let lastUrl = location.href;

  function handleNavigation() {
    const currentUrl = location.href;

    if (currentUrl !== lastUrl) {
      console.log("[YT Feed] Navigation detected:", lastUrl, "→", currentUrl);
      lastUrl = currentUrl;

      // ✅ Check if we navigated to Shorts
      blockShortsIfNeeded();

      // Check if feed should be hidden on new page
      chrome.storage.local.get(["block_youtube_feed"], (settings) => {
        if (settings.block_youtube_feed) {
          if (isHomePage()) {
            console.log("[YT Feed] On homepage after navigation, hiding feed");
            hideYouTubeFeed();
          } else {
            console.log(
              "[YT Feed] Not on homepage after navigation, showing feed"
            );
            unhideYouTubeFeed();
          }
        }
      });
    }
  }
  document.addEventListener("yt-navigate-finish", () => {
    console.log("[YT Feed] yt-navigate-finish");
  });

  // Watch for URL changes (YouTube SPA navigation)
  const urlObserver = new MutationObserver(handleNavigation);
  urlObserver.observe(document.querySelector("title"), {
    childList: true,
    subtree: true,
  });

  // curl -X POST http://localhost:3000/settings/update ^
  // -H "Content-Type: application/json" ^
  // -d "{ \"browserLockConfig\": { \"whitelist\": { \"enabled\": true, \"sites\": [\"youtube.com\",\"facebook.com\", \"wikipedia.org\"], \"blockMessage\": \"Only whitelisted sites are allowed\" } } }"


  // curl -X POST http://localhost:3000/settings/update ^
  // -H "Content-Type: application/json" ^
  // -d "{ \"block_facebook_feed\": false , \"block_youtube_feed\": true ,\"block_youtube_shorts\": true  }"

  // curl -X POST http://localhost:3000/settings/update ^
  // -H "Content-Type: application/json" ^
  // -d "{ \"block_facebook_feed\": false , \"block_facebook_reels\": true , \"block_facebook_videos\": false , \"block_youtube_feed\": true ,\"block_youtube_shorts\": false  }"

  // curl -X POST http://localhost:3000/settings/update ^
  // -H "Content-Type: application/json" ^  block_facebook_videos: false,  block_facebook_reels
  // -d "{ \"block_facebook_feed\": false , \"block_youtube_feed\": false }"

  // // Also check periodically (backup)
  // setInterval(handleNavigation, 1000);

  // ═══════════════════════════════════════════════════════════
  // INITIALIZATION & STORAGE LISTENERS
  // ═══════════════════════════════════════════════════════════

  // 🚀 Initial load
  chrome.storage.local.get(
    ["block_youtube_feed", "block_youtube_shorts"],
    (settings) => {
      console.log("[YT Feed] Initial settings:", settings);

      if (settings.block_youtube_feed) {
        console.log("[YT Feed] Feed blocking enabled on load");
        setupFeedObserver();
      }

      if (settings.block_youtube_shorts) {
        console.log("[YT Shorts] Shorts blocking enabled on load");
        blockShortsIfNeeded();

        // setupShortsObserver(); // We'll implement this next
      }
    }
  );

  // 🔁 Live toggle listener
  chrome.storage.onChanged.addListener((changes) => {
    console.log("[YT Feed] Storage changed:", changes);

    if (changes.block_youtube_feed) {
      console.log(
        "[YT Feed] Feed blocking changed:",
        changes.block_youtube_feed
      );

      if (changes.block_youtube_feed.newValue) {
        console.log("[YT Feed] Enabling feed blocking");
        setupFeedObserver();
      } else {
        console.log("[YT Feed] Disabling feed blocking");
        stopFeedObserver();
      }
    }

    // ✅ Handle shorts toggle (simple check, no setup/stop needed)
    if (changes.block_youtube_shorts) {
      console.log(
        "[YT Shorts] Shorts blocking changed:",
        changes.block_youtube_shorts
      );

      if (changes.block_youtube_shorts.newValue) {
        console.log("[YT Shorts] Enabling shorts blocking");
        // If already on shorts page, redirect now
        blockShortsIfNeeded();
      } else {
        console.log("[YT Shorts] Disabling shorts blocking");
        // Nothing to stop - it's just a redirect
      }
    }
  });

  // ✅ Listen for messages from service worker (for FCM updates)
  // chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  //   if (message.type === "SETTINGS_UPDATED") {
  //     console.log(
  //       "🔔 [YT Feed] Settings updated from server!",
  //       message.settings
  //     );

  //     // Re-apply settings
  //     if (message.settings.block_youtube_feed) {
  //       setupFeedObserver();
  //     } else {
  //       stopFeedObserver();
  //     }

  //     sendResponse({ received: true });
  //   }
  // });
})();
