
(() => {
let feedObserver = null;
let reelsObserver = null;
let videosObserver = null;

// ===== Path Checks =====
function isFacebookHome() {
  return location.pathname === "/" || location.pathname === "/home.php";
}
function isReelPage() {
  return location.pathname.startsWith("/reel/");
}
function isWatchPage() {
  return location.pathname.startsWith("/watch");
}
function isVideosPage() {
  return location.pathname.startsWith("/videos/");
}

// ===== Redirect Logic =====
function redirectFromFacebookReels() {
  if (isReelPage()) {
    console.warn("🚫 Blocked Facebook Reels page. Redirecting...");
    location.href = "/";
  }
}
function redirectFromFacebookVideos() {
  if (isWatchPage() || isVideosPage()) {
    console.warn("🚫 Blocked Facebook Video page. Redirecting...");
    location.href = "/";
  }
}

// ===== Feed =====
function hideFacebookFeed() {
  if (!isFacebookHome()) return;
  const mainFeed = document.querySelector('div[role="main"]');
  if (mainFeed) {
    mainFeed.dataset.feedHidden = "true";
    mainFeed.style.pointerEvents = "none";
    mainFeed.style.filter = "blur(16px)";
    mainFeed.style.opacity = "0.1";
    mainFeed.style.userSelect = "none";
    mainFeed.style.transition = "all 0.3s ease";
    console.warn("✅ Facebook main feed visually hidden");
  }
}
function unhideFacebookFeed() {
  const mainFeed = document.querySelector('div[role="main"]');
  if (mainFeed && mainFeed.dataset.feedHidden === "true") {
    mainFeed.removeAttribute("data-feed-hidden");
    mainFeed.style.pointerEvents = "";
    mainFeed.style.filter = "";
    mainFeed.style.opacity = "";
    mainFeed.style.userSelect = "";
    mainFeed.style.transition = "";
    console.log("🔓 Facebook main feed shown again");
  }
}
function setupFeedObserver() {
  if (feedObserver) return;
  feedObserver = new MutationObserver(hideFacebookFeed);
  feedObserver.observe(document.body, { childList: true, subtree: true });
  hideFacebookFeed();
  console.log("📌 Feed observer running");
}
function stopFeedObserver() {
  if (feedObserver) {
    feedObserver.disconnect();
    feedObserver = null;
    unhideFacebookFeed();
    console.log("🛑 Feed observer stopped");
  }
}

// ===== Reels =====
function removeReelsContainers() {
  document
    .querySelectorAll('div[aria-label="Reels"][role="region"]')
    .forEach((el) => {
      el.style.display = "none";
      el.dataset.reelHidden = "true";
      console.warn("✅ Reels container hidden");
    });

  document.querySelectorAll('a[href*="/reels/"]').forEach((a) => {
    const li = a.closest("li");
    if (li) li.remove();
  });
}
function setupReelsObserver() {
  if (reelsObserver) return;
  reelsObserver = new MutationObserver(() => {
    removeReelsContainers();
    redirectFromFacebookReels();
  });
  reelsObserver.observe(document.body, { childList: true, subtree: true });
  removeReelsContainers();
  redirectFromFacebookReels();
  console.log("📌 Reels observer running");
}
function stopReelsObserver() {
  if (reelsObserver) {
    reelsObserver.disconnect();
    reelsObserver = null;
    // Unhide reels containers if any were hidden
    document.querySelectorAll('[data-reel-hidden="true"]').forEach((el) => {
      el.style.display = "";
      el.removeAttribute("data-reel-hidden");
    });
    console.log("🛑 Reels observer stopped");
  }
}

// ===== Videos =====
function removeVideoContainers() {
  // 🛑 Skip if we're on a single Reel page (respect toggle)
  if (isReelPage()) {
    console.log("⚠️ On a Reel page, skipping video container blocking");
    return;
  }

  // Remove sidebar video links
  document
    .querySelectorAll('a[href^="/watch"], a[href^="/videos/"]')
    .forEach((a) => {
      const li = a.closest("li");
      if (li) li.remove();
    });

  // Hide videos conditionally
  document.querySelectorAll("video").forEach((video) => {
    const container = video.closest(
      '[role="article"], div[class*="x1lliihq"], div[class*="x9f619"]',
    );
    if (!container || container.dataset.videoHidden) return;

    const rect = video.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    // 🔴 If width and height are both 0 — it's invisible. Still block it.
    if (w === 0 && h === 0) {
      container.style.display = "none";
      container.dataset.videoHidden = "true";
      console.warn("❌ Hidden invisible video", container);
      return;
    }

    // 🟨 SKIP Reels-style preview boxes (e.g., 200x360)
    const isPortraitPreview = w > 150 && w < 280 && h >= 300 && h <= 400;
    if (isPortraitPreview) {
      console.log("🟡 Skipped Reels preview", container);
      return;
    }

    // ✅ Otherwise, hide it
    container.style.display = "none";
    container.dataset.videoHidden = "true";
    console.warn("🎬 Hidden a video container", container);
  });
}

function unhideVideoContainers() {
  document.querySelectorAll('[data-video-hidden="true"]').forEach((el) => {
    el.style.display = "";
    el.removeAttribute("data-video-hidden");
    console.log("🎬 Restored video container");
  });
}
function setupVideosObserver() {
  if (videosObserver) return;
  videosObserver = new MutationObserver(() => {
    removeVideoContainers();
    redirectFromFacebookVideos();
  });
  videosObserver.observe(document.body, { childList: true, subtree: true });
  removeVideoContainers();
  redirectFromFacebookVideos();
  console.warn("📌 Video observer running" , videosObserver);
}
function stopVideosObserver() {
  if (videosObserver) {
    videosObserver.disconnect();
    videosObserver = null;
    unhideVideoContainers();
    console.log("🛑 Video observer stopped");
  }
}

// ===== Initial Load from storage =====
chrome.storage.local.get(
  ["block_facebook_feed", "block_facebook_reels", "block_facebook_videos"],
  (settings) => {
    if (settings.block_facebook_reels) {
      redirectFromFacebookReels();
    }
    if (settings.block_facebook_videos) {
      redirectFromFacebookVideos();
    }

    if (settings.block_facebook_feed) {
      setupFeedObserver();
    }
    if (settings.block_facebook_reels) {
      setupReelsObserver();
    }
    if (settings.block_facebook_videos) {
      setupVideosObserver();
    }
  }
);

// ===== Respond to toggle changes =====
chrome.storage.onChanged.addListener((changes) => {
  if (changes.block_facebook_feed) {
    if (changes.block_facebook_feed.newValue) {
      setupFeedObserver();
    } else {
      stopFeedObserver();
    }
  }

  if (changes.block_facebook_reels) {
    if (changes.block_facebook_reels.newValue) {
      redirectFromFacebookReels();
      setupReelsObserver();
    } else {
      stopReelsObserver();
    }
  }

  if (changes.block_facebook_videos) {
    if (changes.block_facebook_videos.newValue) {
      redirectFromFacebookVideos();
      setupVideosObserver();
    } else {
      stopVideosObserver();
    }
  }
});
})();