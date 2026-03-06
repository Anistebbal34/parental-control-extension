(() => {
  let feedObserver = null;
  let reelsObserver = null;
  let videosObserver = null;

  // curl -X POST http://localhost:3000/settings/update ^
  // -H "Content-Type: application/json" ^
  // -d "{ \"block_facebook_feed\": true }"

  // curl -X POST http://localhost:3000/settings/update ^
  // -H "Content-Type: application/json" ^
  // -d "{ \"block_facebook_feed\": false }"

  function isReelPage() {
    return location.pathname.startsWith("/reel/");
  }

  function isWatchPage() {
    return location.pathname.startsWith("/watch/");
  }

  function isVideosPage() {
    return location.pathname.startsWith("/videos/");
  }

  function redirectFromFacebookReels() {
    if (isReelPage()) {
      console.warn("🚫 Blocked Facebook Reels. Redirecting...");
      location.href = "/";
    }
  }

  function redirectFromFacebookVideos() {
    if (isWatchPage() || isVideosPage()) {
      console.warn("🚫 Blocked Facebook Videos. Redirecting...");
      location.href = "/";
    }
  }

  // Feed functions
  function hideFacebookFeed() {
    const feed = document.querySelector('[role="main"]');
    console.warn("[block feed  hideFacebookFeed] hide Feed selector", feed);
    if (feed) {
      feed.style.display = "none";
      console.warn("✅ [block feed hideFacebookFeed] Facebook Feed hidden");
    }
  }

  function unhideFacebookFeed() {
    const feed = document.querySelector('[role="main"]');
    console.warn("[block feed unhideFacebookFeed ]  unhide Feed selector", feed);
    if (feed) {
      feed.style.display = "";
      console.log("🔓[block feed  unhideFacebookFeed ] Facebook Feed shown again");
    }
  }

  function setupFeedObserver() {
    const feed = document.querySelector('[role="main"]');
    console.warn("[block feed setupFeedObserver ] inside setupfeedobserver   Feed selector", feed);
    console.warn(
      "[block feed setupFeedObserver ] inside setupfeedobserver  feedObserver variable",
      feedObserver
    );

    if (feedObserver) return;
    console.warn("[ block feed setupFeedObserver ] reached here ");

    feedObserver = new MutationObserver(() => {
      hideFacebookFeed();
    });
    console.warn("[block feed setupFeedObserver ] reached here 2 ");
    feedObserver.observe(feed, {
      childList: true,
      subtree: true,
    });
    console.warn("[block feed  setupFeedObserver] reached here 3");

    hideFacebookFeed();
    console.log("📌 [block feed setupFeedObserver ] Facebook feed observer activated");
  }

  function stopFeedObserver() {
    if (feedObserver) {
      feedObserver.disconnect();
      feedObserver = null;
      console.log("🛑 [block feed stopFeedObserver]  Facebook feed observer stopped");
      unhideFacebookFeed();
    }
  }

  // Reels button functions
  function removeReelsButtons() {
    document.querySelectorAll('a[href*="/reels/"]').forEach((a) => {
      a.closest("li")?.remove();
    });
    console.warn("✅ Facebook Reels buttons removed");
  }

  function setupReelsObserver() {
    if (reelsObserver) return;

    reelsObserver = new MutationObserver(() => {
      removeReelsButtons();
      redirectFromFacebookReels();
    });

    reelsObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    removeReelsButtons();
    redirectFromFacebookReels();
    console.log("📌 Facebook reels observer activated");
  }

  function stopReelsObserver() {
    if (reelsObserver) {
      reelsObserver.disconnect();
      reelsObserver = null;
      console.log("🛑 Facebook reels observer stopped");
    }
  }

  // Videos button functions
  function removeVideoButtons() {
    document
      .querySelectorAll('a[href*="/watch"]:not([href^="/watch/party/"])')
      .forEach((a) => {
        a.closest("li")?.remove();
      });

    console.warn("✅ Facebook Video buttons removed");
  }

  function setupVideosObserver() {
    if (videosObserver) return;

    videosObserver = new MutationObserver(() => {
      removeVideoButtons();
      redirectFromFacebookVideos();
    });

    videosObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    removeVideoButtons();
    redirectFromFacebookVideos();
    console.log("📌 Facebook video observer activated");
  }

  function stopVideosObserver() {
    if (videosObserver) {
      videosObserver.disconnect();
      videosObserver = null;
      console.log("🛑 Facebook video observer stopped");
    }
  }

  // 🚀 Initial load
  chrome.storage.local.get(
    ["block_facebook_feed", "block_facebook_reels", "block_facebook_videos"],
    (settings) => {
      console.log("[block feed] settings", settings);
      if (settings.block_facebook_feed) {
        console.log(
          "settings.block_facebook_feed",
          settings.block_facebook_feed
        );
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

  // 🔁 Live toggle listener
  chrome.storage.onChanged.addListener((changes) => {
    console.log("[block feed ] changes", changes);
    if (changes.block_facebook_feed) {
      console.log(
        " [block feed ]  settings.block_facebook_feed",
        changes.block_facebook_feed
      );
      if (changes.block_facebook_feed.newValue) {
        console.log(" [block feed ]  setupFeedObserver()");
        setupFeedObserver();
      } else {
        console.log(" [block feed ]  stopFeedObserver();");
        stopFeedObserver();
      }
    }

    if (changes.block_facebook_reels) {
      if (changes.block_facebook_reels.newValue) {
        setupReelsObserver();
      } else {
        stopReelsObserver();
      }
    }

    if (changes.block_facebook_videos) {
      if (changes.block_facebook_videos.newValue) {
        setupVideosObserver();
      } else {
        stopVideosObserver();
      }
    }
  });
})();
