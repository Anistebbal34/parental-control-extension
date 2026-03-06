// videoTracker.js

export const trackYouTubeWatch = (url) => {
  if (!url.hostname.includes("youtube.com")) return;

  let videoId = null;
  let isShort = false;

  if (url.pathname === "/watch") {
    videoId = url.searchParams.get("v");
  } else if (url.pathname.startsWith("/shorts/")) {
    videoId = url.pathname.split("/")[2];
    isShort = true;
  }

  if (videoId) {
    const storageKey = isShort ? "shorts" : "watchedVideos";
    chrome.storage.local.get({ [storageKey]: [] }, (result) => {
      const list = result[storageKey];
      if (!list.includes(videoId)) {
        list.push(videoId);
        chrome.storage.local.set({ [storageKey]: list });
        console.log(`📼 Tracked ${isShort ? "short" : "video"}:`, videoId);
      } else {
        console.log(
          `✅ Already tracked ${isShort ? "short" : "video"}:`,
          videoId
        );
      }
    });
  }
};

export const trackFacebookWatch = (url) => {
  if (!url.hostname.includes("facebook.com")) return;

  if (url.pathname === "/watch") {
    const videoId = url.searchParams.get("v");
    if (videoId) {
      chrome.storage.local.get({ facebookVideos: [] }, (result) => {
        const list = result.facebookVideos;
        if (!list.includes(videoId)) {
          list.push(videoId);
          chrome.storage.local.set({ facebookVideos: list });
          console.log("🎥 Tracked Facebook Watch video:", videoId);
        } else {
          console.log("✅ Already tracked Facebook Watch video:", videoId);
        }
      });
    }
  }
};

export const trackFacebookReel = (url) => {
  if (!url.hostname.includes("facebook.com")) return;

  if (url.pathname.startsWith("/reel/")) {
    const reelId = url.pathname.split("/")[2];
    if (reelId) {
      chrome.storage.local.get({ facebookReels: [] }, (result) => {
        const list = result.facebookReels;
        if (!list.includes(reelId)) {
          list.push(reelId);
          chrome.storage.local.set({ facebookReels: list });
          console.log("🎬 Tracked Facebook Reel:", reelId);
        } else {
          console.log("✅ Already tracked Facebook Reel:", reelId);
        }
      });
    }
  }
};

export const handleNavigation = (details) => {
  try {
    const url = new URL(details.url);
    console.log("🎯 Checking URL:", url.href);
    trackYouTubeWatch(url);
    trackFacebookReel(url);
    trackFacebookWatch(url);
  } catch (err) {
    console.error("💥 Error parsing URL:", err);
  }
};
