(() => {
  let videoRef = null;
  let lastState = null;
  let hasListeners = false;
  let isContextAlive = true;

  console.warn("🧠 content.js loaded!");

  // ✅ Guard against reinjection
  if (
    typeof chrome === "undefined" ||
    !chrome.runtime?.id ||
    window.__PARENTAL_CONTROL_CONTENT_SCRIPT_INJECTED__
  ) {
    console.warn("🚫 content.js already injected or invalid context");
    return;
  }

  window.__PARENTAL_CONTROL_CONTENT_SCRIPT_INJECTED__ = true;

  // ✅ Listen for background script dying
  try {
    chrome.runtime.connect().onDisconnect.addListener(() => {
      console.warn("🧹 Extension context invalidated");
      isContextAlive = false;
      observer.disconnect();
      if (videoRef && hasListeners) {
        videoRef.removeEventListener("play", onPlay);
        videoRef.removeEventListener("pause", onPause);
      }
    });
  } catch (err) {
    console.warn("❌ connect() failed:", err.message);
    isContextAlive = false;
    return;
  }

  function sendState(newState, force = false) {
    console.warn("[sendState] called", { newState, lastState });

    if (!isContextAlive || !chrome?.runtime?.id) {
      console.warn("❌ Cannot send message — context dead");
      return;
    }

    if (force || newState !== lastState) {
      lastState = newState;
      console.warn("📤 Sending state:", newState);
      chrome.runtime.sendMessage(
        { action: "videoPlaying", isPlaying: lastState },
        () => {
          if (chrome.runtime.lastError) {
            console.warn("❌ Message error:", chrome.runtime.lastError.message);
          }
        }
      );
    } else {
      console.warn("⏭️ Skipped duplicate state:", newState);
    }
  }

  function onPlay() {
    console.warn("🎬 onPlay fired");
    sendState(true);
  }

  function onPause() {
    console.warn("⏸️ onPause fired");
    sendState(false);
  }

  function attachListeners(video) {
    if (!video || hasListeners) return;

    console.warn("🎥 Attaching listeners");

    video.addEventListener("play", onPlay, { capture: true });
    video.addEventListener("pause", onPause, { capture: true });

    // Check autoplay state after a delay
    setTimeout(() => {
      sendState(!video.paused, true); // force report
    }, 500);

    videoRef = video;
    hasListeners = true;
  }

  const observer = new MutationObserver(() => {
    const video = document.querySelector("video");
    console.warn("🔍 MutationObserver triggered");
    if (video) {
      console.warn("✅ Found video:", video);
    } else {
      console.warn("❌ No video found");
    }

    if (video && video !== videoRef) {
      console.warn("👀 New video element detected");
      hasListeners = false;
      attachListeners(video);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // ✅ Respond to reset command
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "resetVideoState") {
      if (!isContextAlive || !chrome?.runtime?.id) {
        sendResponse({ status: "dead context" });
        return true;
      }

      const video = document.querySelector("video");
      if (video) {
        console.warn("🔁 Resetting video state manually");
        hasListeners = false;
        attachListeners(video);
        sendResponse({ status: "video checked" });
      } else {
        console.warn("❓ No video found");
        sendResponse({ status: "no video" });
      }

      return true;
    }

    sendResponse({ status: "ignored" });
    return true;
  });
})();
