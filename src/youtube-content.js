let videoElement = null;
let currentVideoId = null;
let isTracking = false;
let startTime = null;

function getVideoIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("v");
}

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}_${String(now.getDate()).padStart(2, "0")}`;
}

function saveSession(videoId, start, end) {
  const duration = (end - start) / 1000;
  const session = { videoId, start, end, duration };

  const todayKey = `${getTodayKey()}_youtube`;

  const existing = JSON.parse(localStorage.getItem(todayKey) || "[]");
  existing.push(session);
  localStorage.setItem(todayKey, JSON.stringify(existing));

  console.log("⏸️ Session saved:", session);
}

function handlePlay() {
  if (!isTracking) {
    isTracking = true;
    startTime = Date.now();
    currentVideoId = getVideoIdFromUrl();
    console.log("▶️ Playing video:", currentVideoId);
  }
}

function handlePause() {
  if (isTracking) {
    isTracking = false;
    const endTime = Date.now();
    saveSession(currentVideoId, startTime, endTime);
  }
}

const observer = new MutationObserver(() => {
  const newVideo = document.querySelector("video");
  const newVideoId = getVideoIdFromUrl();

  if (newVideo && newVideo !== videoElement) {
    if (videoElement) {
      videoElement.removeEventListener("play", handlePlay);
      videoElement.removeEventListener("pause", handlePause);
    }

    videoElement = newVideo;
    currentVideoId = newVideoId;

    videoElement.addEventListener("play", handlePlay);
    videoElement.addEventListener("pause", handlePause);

    console.log("🎬 New video detected:", currentVideoId);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});
