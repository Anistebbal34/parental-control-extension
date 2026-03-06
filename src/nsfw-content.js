let isPaused = false;
let tabId;
const CONFIG = {
  MIN_WIDTH: 150,
  MIN_HEIGHT: 150,
  MAX_IMAGES: 30,
  DEBOUNCE_TIME: 800,
  NSFW_THRESHOLD: 0.01,
  MAX_DATAURL_RETRY_PER_SRC: 0,
  ENABLE_HASH_CACHING: true,
};

async function getTabId() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_TAB_ID" }, (response) => {
      resolve(response?.tabId || "unknown");
    });
  });
}

const state = {
  isOffscreenReady: false,
  processedImages: new Map(), // ✅ change from Set → Map
  pendingClassifications: new Set(),
  dataUrlRetried: new Map(),
  observers: [],
  pendingUntilReady: new Set(),
  mutationCount: 0,
  intersect: 0,
  notintersect: 0,
  sentcount: 0,
  lastMutationTime: 0,
};
function scanImages(observer, nodesToScan = null) {
  console.warn("scanImages called");
  console.warn("[SCAN] scanImages called", {
    hasNodesToScan: !!nodesToScan,
    nodeCount: nodesToScan?.length || "N/A",
  });

  // console.warn("scanImages called");
  const startTime = performance.now(); // start timer

  // runWhenIdle(() => {
  const idleStart = performance.now(); // when browser actually runs the callback
  const waitTime = (idleStart - startTime).toFixed(2);

  console.warn(`[SCAN] Idle delay: ${waitTime} ms`);

  console.time("[SCAN] Processing duration"); // start timing the body

  let imgs = [];
  if (nodesToScan && nodesToScan.length > 0) {
    console.warn("[SCAN] Scanning specific nodes");

    // Find images in added nodes
    nodesToScan.forEach((node) => {
      if (node.tagName === "IMG") {
        console.warn(" [SCAN] node tagname", node);
        imgs.push(node);
      } else {
        console.warn(" [SCAN] else get all images");
        imgs.push(...Array.from(node.querySelectorAll("img")));
      }
    });
  } else {
    console.warn("[SCAN] mafihaaache");
    const feed = document.querySelector('[role="main"]') || document;
    // const selector = [
    //   "img.xz74otr.x15mokao.x1ga7v0g.x16uus16.xbiv7yw.x1ey2m1c.x5yr21d.xtijo5x.x1o0tod.x10l6tqk.x13vifvy.xh8yej3",
    //   "img.x15mokao.x1ga7v0g.x16uus16.xbiv7yw.x1ey2m1c.x5yr21d.xtijo5x.x1o0tod.x10l6tqk.x13vifvy.xh8yej3.xl1xv1r",
    //   "img.x1fmog5m.xu25z0z.x140muxe.xo1y3bh.x5yr21d.xl1xv1r.xh8yej3",
    // ].join(", ");
    // imgs = Array.from(feed.querySelectorAll(selector));
    imgs = Array.from(feed.querySelectorAll("img[src]"));
  }
  console.warn("[SCAN] imgs", imgs.length);
  const candidates = [];
  let validCount = 0;
  let alreadyObservedCount = 0;
  let rejectedCount = 0;
  for (const img of imgs) {
    const src = pickImageSrc(img);
    if (!src) {
      console.warn("[SCAN] ❌ Skipping image - no src:", img);
      rejectedCount++;
      continue;
    }

    if (!img.__nsfwSrcKey__) img.__nsfwSrcKey__ = src;

    if (img.__nsfwSrcKey__.startsWith("data:image/gif")) {
      console.error(
        "[__nsfwSrcKey__] REJECTED - GIF data URL detected",
        img.__nsfwSrcKey__,
      );
    }
    // const cached = state.processedImages.get(src);
    // if (cached) {
    //   // Re-apply the cached result to the "new" image element
    //   // console.warn("[SCAN] inside cached image", cached);
    //   if (!img.hasAttribute("data-nsfw-safe")) {
    //     img.setAttribute("data-nsfw-safe", cached.safe ? "true" : "false");
    //     img.style.filter = cached.safe ? "none" : "blur(12px)";
    //     showPredictionsOverlay(img, cached.predictions.predictions);
    //     // reappliedFromCache++;
    //     console.warn(
    //       `[SCAN] 🔄 Re-applied cached result for:`,
    //       src.substring(0, 50)
    //     );
    //   } else {
    //     console.warn(
    //       "[SCAN] inside cached image but has attrbute  wierd",
    //       cached
    //     );
    //   }

    //   validCount++;
    //   alreadyObservedCount++;
    //   continue;
    // }

    const proccesedImages = state.processedImages.has(src);
    console.warn(`[SCAN] proccesedImages`, proccesedImages);
    if (proccesedImages) {
      // validCount++;
      // alreadyObservedCount++;
    } else {
      if (isValidImage(img)) {
        candidates.push(img);
        console.warn(`[SCAN] ✅ New candidate:`, src.substring(0, 10));
      } else {
        rejectedCount++;
        console.warn(`[SCAN] 📋 rejectedCount:`, rejectedCount);
      }
    }
    // if (candidates.length >= CONFIG.MAX_IMAGES) break;
  }
  console.warn(`[SCAN] Summary:`, {
    totalImages: imgs.length,
    validImages: validCount,
    newCandidates: candidates.length,
    alreadyObserved: alreadyObservedCount,
    rejected: rejectedCount,
  });
  for (const img of candidates) {
    if (img.__nsfwObserved) continue;
    img.__nsfwObserved = true;
    img.setAttribute("data-nsfw-scan", "true");
    observer.observe(img);
  }
  console.timeEnd("[SCAN] Processing duration");
  // });
}

function pickImageSrc(img) {
  const src =
    img.getAttribute("src") ||
    // img.getAttribute("data-src") ||
    // img.getAttribute("data-original") ||
    // img.currentSrc ||
    "";
  return src;
}
function isValidImage(img) {
  // console.warn(
  //   "[isValidImage] Image dimensions Starting validation for image:",
  //   img
  // );
  let srcc = pickImageSrc(img);
  const w = img.naturalWidth || 0;
  const h = img.naturalHeight || 0;
  // console.warn(`[isValidImage] Image dimensions: ${w}x${h}`);
  if (srcc.startsWith("data:image/gif")) {
    // console.error(
    //   "[isValidImage] REJECTED - GIF data URL detected",
    //   src.substring(0, 100)
    // );
    return false;
  }

  if (w < CONFIG.MIN_WIDTH || h < CONFIG.MIN_HEIGHT) {
    // console.warn(
    //   `[isValidImage] ❌ REJECTED - Too small: ${w}x${h} < ${CONFIG.MIN_WIDTH}x${CONFIG.MIN_HEIGHT}`
    // );
    const src = (pickImageSrc(img) || "").toLowerCase();
    // console.warn(`[isValidImage] Image src in: ${src.substring(0, 100)}...`);
    return false;
  }

  const src = srcc.toLowerCase();
  // console.warn(`[isValidImage] Image src: ${src.substring(0, 100)}...`);

  if (!src) {
    // console.warn("[isValidImage] ❌ REJECTED - No src found");
    return false;
  }

  if (src.startsWith("data:image/svg+xml")) {
    // console.warn("[isValidImage] ❌ REJECTED - SVG data URL detected");
    return false;
  }

  if (w <= 24 && h <= 24) {
    // console.warn(
    //   `[isValidImage] ❌ REJECTED - Icon size: ${w}x${h} <= 24x24`
    // );
    return false;
  }

  const skipClasses = ["avatar", "icon", "logo", "emoji", "user-img"];
  const foundClass = skipClasses.find((cls) => img.classList.contains(cls));
  if (foundClass) {
    // console.warn(
    //   `[isValidImage] ❌ REJECTED - Has skip class: ${foundClass}`
    // );
    return false;
  }

  const skipSubstrings = ["sprite", "avatar", "logo", "emoji", "icon", "badge"];
  const foundSubstring = skipSubstrings.find((s) => src.includes(s));
  if (foundSubstring) {
    // console.warn(
    //   `[isValidImage] ❌ REJECTED - Src contains: ${foundSubstring}`
    // );
    return false;
  }

  const reactionBtn = img.closest('div[role="button"]');
  if (reactionBtn) {
    const ariaLabel = reactionBtn.getAttribute("aria-label");
    // console.warn(
    //   `[isValidImage] Found reaction button with aria-label: ${ariaLabel}`
    // );

    if (ariaLabel?.match(/like|love|care|haha|wow|sad|angry/i)) {
      // console.warn(
      //   "[isValidImage] ❌ REJECTED - Inside social media reaction button"
      // );
      return false;
    }
  }

  // Check multiple rejection conditions in final block
  const facebookDiv = img.closest("div.x1rg5ohu.x1n2onr6.x3ajldb.x1ja2u2z");
  const svgParent = img.closest("svg");
  const is36x36 = img.width === 36 || img.height === 36;

  if (facebookDiv) {
    // console.warn("[isValidImage] ❌ REJECTED - Inside Facebook specific div");
    return false;
  }

  if (svgParent) {
    // console.warn("[isValidImage] ❌ REJECTED - Inside SVG element");
    return false;
  }

  if (is36x36) {
    // console.warn(
    //   `[isValidImage] ❌ REJECTED - 36x36 pixel size detected (width: ${img.width}, height: ${img.height})`
    // );
    return false;
  }

  console.warn(
    "[isValidImage] ✅ ACCEPTED - Image passed all validation checks",
    img,
  );
  return true;
}
document.addEventListener("visibilitychange", async () => {
  console.log("▶️ [NSFW-SCAN] visibikity changed fired...");
  tabId = tabId || (await getTabId());

  if (document.hidden) {
    console.log("▶️ [NSFW-SCAN] pause...");
    isPaused = true; // ✅ Just flip flags
    chrome.runtime.sendMessage(
      {
        target: "offscreen",
        type: "PAUSE_TAB", // ✅ Changed from PAUSE_PROCESSING
        tabId,
      },
      (response) => {
        console.warn("📨 Pause response:", response);
      },
    );
  } else {
    isPaused = false; // ✅ Just flip flag
    console.log("▶️ [NSFW-SCAN] resume ...");
    chrome.runtime.sendMessage(
      {
        target: "offscreen",
        type: "RESUME_TAB", // ✅ Changed from RESUME_PROCESSING
        tabId,
      },
      (response) => {
        console.warn("📨 Resume response:", response);
      },
    );

    // if (state.observers[0]) {
    //   console.warn("🔍 Scanning for missed images", state.observers[0]);
    //   scanImages(state.observers[0]);
    // }
  }
});

document.addEventListener("DOMContentLoaded", () => {
  console.warn("DOMContentLoaded fired - starting NSFW script hmmm");

  console.warn("Injecting CSS styles");
  injectStyle();

  console.warn("Starting offscreen initialization");
  initOffscreen().then((ok) => {
    console.warn("Offscreen init result:", ok);
    state.isOffscreenReady = ok;
    if (ok) {
      console.warn("Offscreen ready - setting up observers");
      setupObservers();
      // observeFacebookReelVideos();
    } else {
      console.warn("[NSFW] Offscreen init failed; scanning deferred.");
    }
  });

  // ---- init offscreen (replaces sandbox iframe injection) ----
  async function initOffscreen() {
    console.warn("initOffscreen function called");
   const er =  chrome.runtime.getURL("libstwo/")
    console.warn("getURL", er )

    return new Promise((resolve) => {
      const message = {
        target: "offscreen",
        type: "OFFSCREEN_INIT",
        modelUrl: chrome.runtime.getURL("models/mobilenet_v2/model.json"),
        wasmBase: chrome.runtime.getURL("libstwo/"),
      };

      console.warn("Sending message to background:", message);

      chrome.runtime.sendMessage(message, (res) => {
        console.warn("Got response from background:", res);
        console.warn("chrome.runtime.lastError:", chrome.runtime.lastError);

        if (res?.ok) {
          console.warn("[NSFW] Offscreen ready", res);
          resolve(true);
        } else {
          console.warn("[NSFW] Offscreen init error:", res?.error);
          resolve(false);
        }
      });
    });
  }

  function setupObservers() {
    console.warn("Setting up observers");

    const io = new IntersectionObserver(
      (entries) => {
        console.warn(
          "Intersection observer triggered with",
          entries.length,
          "entries",
        );
        console.warn("Intersection obserrver [NSFW-SCAN] ", isPaused);
        if (isPaused || document.hidden) return;
        entries.forEach((entry) => {
          const img = entry.target;
          // const src = img.__nsfwSrcKey__ || pickImageSrc(img);
          const src = pickImageSrc(img);

          if (!src) return;

          if (entry.isIntersecting) {
            // console.warn("src intersection", img);
            console.warn(" intersecting:", state.intersect++);
            processImage(img);
            // io.unobserve(img);
          } else {
            // console.warn("src not intersection", img);
            console.warn(" intersecting:", state.notintersect++);
          }
        });
      },
      { threshold: 0.01 },
    );

    const debouncedFullScan = debounce((mutations) => {
      console.warn("[MO DEBOUNCED] Running full scan");
      // const addedNodes = mutations
      //   .filter((m) => m.type === "childList")
      //   .flatMap((m) => Array.from(m.addedNodes))
      //   .filter((node) => node.nodeType === Node.ELEMENT_NODE);

      if (false) {
        scanImages(io, addedNodes);
      } else {
        console.warn("[MO DEBOUNCED] scanImages(io);");
        scanImages(io);
      }
    }, CONFIG.DEBOUNCE_TIME);

    const mo = new MutationObserver(
      // debounce(
      (mutations) => {
        console.warn(" MutationObserver [NSFW-SCAN] ", isPaused);
        if (isPaused || document.hidden) return;

        state.mutationCount++;

        console.warn(
          `[MO] Mutation observer triggered #${state.mutationCount}`,
        );
        console.warn(`[MO] Processing ${mutations.length} mutations`);

        const addedImages = mutations
          .filter((m) => m.type === "childList")
          .flatMap((m) => Array.from(m.addedNodes))
          .filter((node) => node.nodeType === Node.ELEMENT_NODE)
          .flatMap((node) => {
            // If the node itself is an image
            if (node.tagName === "IMG") {
              console.warn("[s]", node);
              return [node];
            }
            // If the node contains images
            return Array.from(node.querySelectorAll("img"));
          });

        if (addedImages.length > 0) {
          // if (false) {
          // console.warn("[MO] Scanning newly added nodes");
          // // scanImages(io, addedNodes);
          // scanImages(io);

          let instantBlurCount = 0;

          addedImages.forEach((img) => {
            const src = pickImageSrc(img);
            if (!src) return;
            const cached = state.processedImages.get(src);
            if (cached) {
              // Apply blur IMMEDIATELY (no waiting)
              requestAnimationFrame(() => {
                img.setAttribute(
                  "data-nsfw-safe",
                  cached.safe ? "true" : "false",
                );
                img.style.filter = cached.safe ? "none" : "blur(12px)";
                showPredictionsOverlay(img, cached.predictions.predictions);
              });
              instantBlurCount++;
            }
          });

          if (instantBlurCount > 0) {
            console.error(
              `[MO IMMEDIATE] ⚡ Instantly blurred ${instantBlurCount} cached images`,
            );
          }
        }

        debouncedFullScan(mutations);
      },
    );
    // const feed = document.querySelector('[role="main"]') || document.body;
    const feed = document.body;
    console.warn("Observing feed element:", feed);

    mo.observe(feed, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"],
    });

    state.observers.push(io, mo);
    console.warn("Initial scan starting");
    scanImages(io);
  }
  // ---- classify through offscreen (replaces iframe.postMessage) ----

  async function classifyViaOffscreen(src) {
    console.warn("classifyViaOffscreen called for:", src.substring(0, 100));
    tabId = tabId || (await getTabId());
    console.log("My tab ID is:", tabId);
    return new Promise((resolve) => {
      const message = {
        target: "offscreen",
        type: "CLASSIFY_IMAGE",
        src,
        tabId,
      };
      console.warn("Sending classification message:", message);

      chrome.runtime.sendMessage(message, (resp) => {
        console.warn("Got classification response:", resp);
        console.warn("chrome.runtime.lastError:", chrome.runtime.lastError);
        resolve(resp);
      });
    });
  }

  // ---- DOM observers (your originals, slightly trimmed for brevity) ----

  async function processImage(image) {
    if (!state.isOffscreenReady) {
      state.pendingUntilReady.add(image);
      return;
    }

    // const src = image.__nsfwSrcKey__ || pickImageSrc(image);
    const src = pickImageSrc(image);
    console.warn("[processImage] process src", src.substring(0, 20));
    if (!src) return;

    // const cached = memoryCache.get(src);
    // console.warn("cached", cached);
    // if (cached) {
    //   image.setAttribute("data-nsfw-safe", cached.safe ? "true" : "false");
    //   image.style.filter = cached.safe ? "none" : "blur(12px)";
    //   showPredictionsOverlay(image, cached.predictions);
    //   return;
    // }

    const has = state.processedImages.has(src);
    const cached = state.processedImages.get(src);
    console.log("[processImage] has cached", cached);
    console.log("[processImage] has", has);
    if (
      cached && // ✅ ensure exists
      state.processedImages.has(src)
    ) {
      if (src.startsWith("data:image/gif")) {
        console.error("[processImage] GIF data URL detected inside ");
      }
      image.setAttribute("data-nsfw-safe", cached.safe ? "true" : "false");
      image.style.filter = cached.safe ? "none" : "blur(12px)";
      showPredictionsOverlay(image, cached.predictions.predictions);
      // console.log("already here", src.substring(0, 10));
      return;
    }

    // state.processedImages.add(src);
    // state.pendingClassifications.add(src);

    try {
      if (src.startsWith("data:image/gif")) {
        console.warn("[processImage] GIF data URL detected");
      }

      console.warn(" [processImage] count]", state.sentcount++);
      const resp = await classifyViaOffscreen(src);
      if (resp?.ok) handleClassificationResult(resp.result);
      else
        handleClassificationError({
          src,
          error: resp?.error || "Unknown error",
        });
    } catch (err) {
      console.error(err);
      handleClassificationError({ src, error: err.message });
    } finally {
      // state.pendingClassifications.delete(src);
    }
  }

  function observeFacebookReelVideos() {
    console.warn("Setting up Facebook reel video observer");

    const observer = new MutationObserver(() => {
      console.warn("Video mutation observer triggered");
      const videos = document.querySelectorAll("video");
      console.warn("Found", videos.length, "videos");

      videos.forEach((video) => {
        if (video.__nsfwHooked) return;
        video.__nsfwHooked = true;
        console.warn("Hooking video for NSFW detection");

        video.addEventListener(
          "loadeddata",
          async () => {
            console.warn("Video loadeddata event fired");
            try {
              const canvas = document.createElement("canvas");
              canvas.width = video.videoWidth || 224;
              canvas.height = video.videoHeight || 224;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL();
              console.warn(
                "Extracted video frame, dataUrl length:",
                dataUrl.length,
              );

              video.classList.add("nsfw-video-blur");
              video.pause();

              const resp = await classifyViaOffscreen(dataUrl);
              console.warn("Video classification response:", resp);
              if (resp?.ok) {
                handleClassificationResult(resp.result);
              }
            } catch (e) {
              console.warn("[NSFW] Could not extract first frame:", e);
            }
          },
          { once: true },
        );
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    state.observers.push(observer);
    console.warn("Video observer set up");
  }

  function handleClassificationResult({
    src,
    gender,
    firstFace,
    nsfw,
    predictions,
  }) {
    // console.log("Gender result:", gender);
    // console.log("NSFW result:", nsfw);
    // console.log("Predictions:", predictions);
    // console.log("firstFace:", firstFace);

    console.log("src:", src.substring(0, 10));

    console.log();
    // ✅ Use the existing predictions object directly

    const predictionsArray = predictions.predictions;
    if (predictionsArray.length === 0) {
      predictionsArray.push(
        { className: "Neutral", probability: 0.1 },
        { className: "Drawing", probability: 0.1 },
        { className: "Sexy", probability: 0.1 },
        { className: "Hentai", probability: 0.1 },
        { className: "Porn", probability: 0.1 },
      );
    }
    // ✅ Inject gender prediction at the TOP of the array if available
    if (firstFace && firstFace.gender) {
      predictionsArray.unshift({
        className: `Gender: ${firstFace.gender.toUpperCase()}`,
        probability: firstFace.genderScore,
      });
    } else {
      return;
    }
    console.warn(predictionsArray);

    // ✅ Build the merged predictions object
    const mergedPredictions = {
      ...predictions, // keep src + timestamp untouched
      predictions: predictionsArray, // updated array
    };

    console.warn("mergedPredictionsObject", mergedPredictions);

    // ✅ Check NSFW status
    const safe = !isNSFW(predictionsArray);

    // ✅ Cache the result
    const cacheEntry = { safe, predictions: mergedPredictions };
    // memoryCache.set(src, cacheEntry);
    state.processedImages.set(src, cacheEntry); // ✅ store inside state

    const img = findImgBySrc(src);
    console.warn("img", img);
    if (img) {
      img.setAttribute("data-nsfw-safe", safe ? "true" : "false");
      img.style.filter = safe ? "none" : "blur(12px)";
      showPredictionsOverlay(img, mergedPredictions.predictions);
      return;
    }

    // For videos / data/blob URLs
    if (!img && (src.startsWith("data:") || src.startsWith("blob:"))) {
      const videos = document.querySelectorAll("video");
      videos.forEach((video) => {
        if (isNSFW(predictions)) {
          video.classList.add("nsfw-video-blur");
          video.setAttribute("data-nsfw-safe", "false");
          video.pause();
          ensureOverlay(video, mergedPredictions);
        } else {
          video.classList.remove("nsfw-video-blur");
          video.setAttribute("data-nsfw-safe", "true");
          video.style.filter = "none";
        }
      });
    }
  }

  function handleClassificationError(payload) {
    console.error("handleClassificationError called:", payload);

    const src = payload.src;
    const img = findImgBySrc(src);
    if (!img) {
      console.warn("No image found for error handling");
      return;
    }

    const errMsg = (payload.error || "").toLowerCase();
    const retryCount = state.dataUrlRetried.get(src) || 0;
    const looksLikeCors =
      errMsg.includes("taint") ||
      errMsg.includes("cors") ||
      errMsg.includes("cross-origin") ||
      errMsg.includes("securityerror");

    console.warn(
      "Error analysis - CORS-like:",
      looksLikeCors,
      "retryCount:",
      retryCount,
    );

    if (looksLikeCors && retryCount < CONFIG.MAX_DATAURL_RETRY_PER_SRC) {
      console.warn("Retrying with dataURL");
      state.dataUrlRetried.set(src, retryCount + 1);
      retryClassifyAsDataURL(img, src);
    }
  }

  async function retryClassifyAsDataURL(img, src) {
    console.warn("retryClassifyAsDataURL called for:", src.substring(0, 50));

    try {
      const dataUrl = await fetchToDataURL(src);
      if (!dataUrl) {
        console.warn("Failed to fetch dataURL");
        return;
      }
      console.warn("Got dataURL, length:", dataUrl.length);

      const resp = await classifyViaOffscreen(dataUrl);
      if (resp?.ok) {
        console.warn("Retry classification successful");
        handleClassificationResult(resp.result);
      } else {
        console.warn("Retry classification failed:", resp?.error);
      }
    } catch (e) {
      console.warn("Exception in retry:", e);
    }
  }

  // ----- UI helpers (kept) -----
  function injectStyle() {
    console.warn("Injecting CSS styles");
    const style = document.createElement("style");
    style.textContent = `
      img[data-nsfw-scan]{filter:blur(12px)!important;transition:filter .2s ease}
      img[data-nsfw-safe="true"]{filter:none!important}
      .nsfw-overlay{
        position:absolute;bottom:4px;left:4px;background:rgba(0,0,0,.7);
        color:#fff;font-size:10px;padding:2px 4px;border-radius:3px;max-width:120px;white-space:pre-wrap;z-index:9999;pointer-events:none
      }
      .nsfw-wrapper{position:relative;display:inline-block}
      video.nsfw-video-blur{filter:blur(12px)}
    `;
    document.head.appendChild(style);
    console.warn("CSS styles injected");
  }

  function ensureOverlay(video, predictions) {
    console.warn("ensureOverlay called for video");
    const container = video.parentElement;
    if (!container) return;
    if (getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }
    if (!container.querySelector(".nsfw-overlay")) {
      const overlay = document.createElement("div");
      overlay.className = "nsfw-overlay";
      overlay.textContent = predictions
        .slice()
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 2)
        .map((p) => `${p.className}: ${(p.probability * 100).toFixed(1)}%`)
        .join("\n");
      container.appendChild(overlay);
      console.warn("Video overlay added");
    }
  }

  function showPredictionsOverlay(img, predictions) {
    console.warn("showPredictionsOverlay called");

    const existing = img.parentElement?.querySelector(".nsfw-overlay");
    console.warn("existing", existing);
    if (existing) {
      return;
      console.warn("Removing existing overlay");
      existing.remove();
    }

    const overlay = document.createElement("div");
    overlay.className = "nsfw-overlay";

    const top5 = predictions
      .slice()
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 7)
      .map((p) => `${p.className}: ${(p.probability * 100).toFixed(1)}%`)
      .join("\n");

    overlay.textContent = top5;
    console.warn("Overlay content:", top5);

    const parent = img.parentElement;
    if (parent && getComputedStyle(parent).position === "static") {
      parent.style.position = "relative";
    }
    parent?.appendChild(overlay);
    console.warn("Overlay added to image");
  }

  function removePredictionsOverlay(img) {
    console.warn("removePredictionsOverlay called");
    const parent = img.parentElement;
    if (!parent) return;
    const existing = parent.querySelector(".nsfw-overlay");
    if (existing) {
      existing.remove();
      console.warn("Overlay removed");
    }
  }

  // ----- misc helpers (kept) -----
  function runWhenIdle(fn) {
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(fn);
    } else {
      setTimeout(fn, 200);
    }
  }

  const NSFW_CLASSES = ["Porn", "Hentai", "Sexy"];
  const SFW_CLASSES = ["Neutral", "Drawing"];

  function isNSFW(predictions) {
    // Sum probabilities for NSFW and SFW groups separately
    const nsfwScore = predictions
      .filter((p) => NSFW_CLASSES.includes(p.className))
      .reduce((sum, p) => sum + p.probability, 0);

    const sfwScore = predictions
      .filter((p) => SFW_CLASSES.includes(p.className))
      .reduce((sum, p) => sum + p.probability, 0);

    // If NSFW dominates strongly, flag it
    const isUnsafe = nsfwScore > sfwScore && nsfwScore > 0.3;

    console.warn("isNSFW:", isUnsafe, "| NSFW:", nsfwScore, "| SFW:", sfwScore);
    return isUnsafe;
  }

  function markSafe(img) {
    console.warn("markSafe called");
    img.setAttribute("data-nsfw-safe", "true");
    img.style.filter = "none";
    removePredictionsOverlay(img);
  }

  function findImgBySrc(src) {
    try {
      return document.querySelector(`img[src="${CSS.escape(src)}"]`);
    } catch {
      const imgs = Array.from(document.querySelectorAll("img"));
      return imgs.find((i) => pickImageSrc(i) === src);
    }
  }

  async function fetchToDataURL(url) {
    console.warn("fetchToDataURL called for:", url.substring(0, 50));
    try {
      const res = await fetch(url, { mode: "no-cors" });
      const blob = await res.blob();
      const dataUrl = await blobToDataUrl(blob);
      console.warn("fetchToDataURL success, length:", dataUrl.length);
      return dataUrl;
    } catch (e) {
      console.warn("fetchToDataURL failed:", e);
      return null;
    }
  }

  function blobToDataUrl(blob) {
    console.warn("blobToDataUrl called");
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = (e) => {
        console.warn("FileReader error:", e);
        reject(e);
      };
      reader.onload = () => {
        console.warn("FileReader success");
        resolve(reader.result);
      };
      reader.readAsDataURL(blob);
    });
  }

  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }
});

// async function processImage(image) {
//   console.warn("processImage called");

//   if (!state.isOffscreenReady) {
//     console.warn("Offscreen not ready - adding to pending queue");
//     state.pendingUntilReady.add(image);
//     return;
//   }

//   const src = image.__nsfwSrcKey__ || pickImageSrc(image);
//   if (!src) {
//     console.warn("No src found for image");
//     return;
//   }

//   console.warn("Processing image with src:", src.substring(0, 100));

//   let cached = memoryCache.get(src);
//   if (!cached) cached = localStorage.getItem("nsfw:" + src);
//   if (cached) memoryCache.set(src, cached);
//   if (cached === "unsafe") {
//     console.warn("Found cached unsafe result");
//     image.setAttribute("data-nsfw-safe", "false");
//     image.style.filter = "blur(12px)";
//     showPredictionsOverlay(image, [{ className: "Unsafe", probability: 1 }]);
//     return;
//   }
//   if (cached === "safe") {
//     console.warn("Found cached safe result");
//     markSafe(image);
//     return;
//   }

//   if (state.processedImages.has(src)) {
//     console.warn("Image already processed");
//     return;
//   }
//   if (state.pendingClassifications.has(src)) {
//     console.warn("Image classification already pending");
//     return;
//   }

//   console.warn("Starting classification for:", src.substring(0, 50));
//   state.processedImages.add(src);
//   state.pendingClassifications.add(src);

//   try {
//     const resp = await classifyViaOffscreen(src);
//     console.warn("Classification response:", resp);

//     if (resp?.ok) {
//       console.warn("Classification successful");
//       handleClassificationResult(resp.result);
//     } else {
//       console.warn("Classification failed:", resp?.error);
//       handleClassificationError({
//         src,
//         error: resp?.error || "Unknown error",
//       });
//     }
//   } catch (err) {
//     console.warn("Classification exception:", err);
//     handleClassificationError({ src, error: err.message });
//   } finally {
//     state.pendingClassifications.delete(src);
//     console.warn("Removed from pending classifications");
//   }
// }

// ----- Video first-frame → classify (kept from your code) -----
//===============================================

// async function processImage(image) {
//   if (!state.isOffscreenReady) {
//     state.pendingUntilReady.add(image);
//     return;
//   }

//   const src = image.__nsfwSrcKey__ || pickImageSrc(image);
//   if (!src) return;
//   let cached = memoryCache.get(src);
//   if (!cached) {
//     const raw = localStorage.getItem("nsfw:" + src);
//     if (raw) cached = JSON.parse(raw);
//     if (cached) memoryCache.set(src, cached);
//   }

//   if (cached) {
//     image.setAttribute("data-nsfw-safe", cached.safe ? "true" : "false");
//     image.style.filter = cached.safe ? "none" : "blur(12px)";
//     showPredictionsOverlay(image, cached.predictions);
//     return;
//   }

//   if (state.processedImages.has(src) || state.pendingClassifications.has(src))
//     return;

//   state.processedImages.add(src);
//   state.pendingClassifications.add(src);

//   try {
//     const resp = await classifyViaOffscreen(src);
//     if (resp?.ok) handleClassificationResult(resp.result);
//     else
//       handleClassificationError({
//         src,
//         error: resp?.error || "Unknown error",
//       });
//   } catch (err) {
//     handleClassificationError({ src, error: err.message });
//   } finally {
//     state.pendingClassifications.delete(src);
//   }
// }

//==================

// ----- Results & errors (kept from your code with tiny tweaks) -----
// function handleClassificationResult({ src, predictions }) {
//   console.warn(
//     "handleClassificationResult called for:",
//     src.substring(0, 50)
//   );
//   console.warn("Predictions:", predictions);

//   // Case 1: image in DOM
//   const img = findImgBySrc(src);
//   if (img) {
//     console.warn("Found image in DOM");
//     if (isNSFW(predictions)) {
//       console.warn("Image is NSFW - blurring");
//       img.removeAttribute("data-nsfw-safe");
//       img.setAttribute("data-nsfw-safe", "false");
//       img.style.filter = "blur(12px)";
//       localStorage.setItem("nsfw:" + src, "unsafe");
//     } else {
//       console.warn("Image is safe");
//       markSafe(img);
//       localStorage.setItem("nsfw:" + src, "safe");
//     }
//     showPredictionsOverlay(img, predictions);
//     return;
//   }

//   // Case 2: data/blob URL → map to videos (your original behavior)
//   if (!img && (src.startsWith("data:") || src.startsWith("blob:"))) {
//     console.warn("Processing data/blob URL for videos");
//     const videos = document.querySelectorAll("video");
//     videos.forEach((video) => {
//       if (isNSFW(predictions)) {
//         console.warn("Video is NSFW - blurring");
//         video.classList.add("nsfw-video-blur");
//         video.setAttribute("data-nsfw-safe", "false");
//         video.pause();
//         ensureOverlay(video, predictions);
//       } else {
//         console.warn("Video is safe");
//         video.classList.remove("nsfw-video-blur");
//         video.setAttribute("data-nsfw-safe", "true");
//         video.style.filter = "none";
//       }
//     });
//   }
// }
//=================================
// function handleClassificationResult({ src, predictions }) {
//   const safe = !isNSFW(predictions);
//   const cacheEntry = { safe, predictions };
//   localStorage.setItem("nsfw:" + src, JSON.stringify(cacheEntry));
//   memoryCache.set(src, cacheEntry);

//   const img = findImgBySrc(src);
//   if (img) {
//     img.setAttribute("data-nsfw-safe", safe ? "true" : "false");
//     img.style.filter = safe ? "none" : "blur(12px)";
//     showPredictionsOverlay(img, predictions);
//     return;
//   }

//   // Case 2: data/blob URL → map to videos (your original behavior)
//   if (!img && (src.startsWith("data:") || src.startsWith("blob:"))) {
//     console.warn("Processing data/blob URL for videos");
//     const videos = document.querySelectorAll("video");
//     videos.forEach((video) => {
//       if (isNSFW(predictions)) {
//         console.warn("Video is NSFW - blurring");
//         video.classList.add("nsfw-video-blur");
//         video.setAttribute("data-nsfw-safe", "false");
//         video.pause();
//         ensureOverlay(video, predictions);
//       } else {
//         console.warn("Video is safe");
//         video.classList.remove("nsfw-video-blur");
//         video.setAttribute("data-nsfw-safe", "true");
//         video.style.filter = "none";
//       }
//     });
//   }
// }
//=====================
// function isValidImage(img) {
//   const w = img.naturalWidth || 0;
//   const h = img.naturalHeight || 0;
//   if (w < CONFIG.MIN_WIDTH || h < CONFIG.MIN_HEIGHT) return false;

//   const src = (pickImageSrc(img) || "").toLowerCase();
//   if (!src) return false;
//   if (src.startsWith("data:image/gif")) return false;
//   if (src.startsWith("data:image/svg+xml")) return false;
//   if (w <= 24 && h <= 24) return false;

//   const skipClasses = ["avatar", "icon", "logo", "emoji", "user-img"];
//   if (skipClasses.some((cls) => img.classList.contains(cls))) return false;

//   const skipSubstrings = [
//     "sprite",
//     "avatar",
//     "logo",
//     "emoji",
//     "icon",
//     "badge",
//   ];
//   if (skipSubstrings.some((s) => src.includes(s))) return false;

//   const reactionBtn = img.closest('div[role="button"]');
//   if (
//     reactionBtn &&
//     reactionBtn
//       .getAttribute("aria-label")
//       ?.match(/like|love|care|haha|wow|sad|angry/i)
//   )
//     return false;

//   if (
//     img.closest("div.x1rg5ohu.x1n2onr6.x3ajldb.x1ja2u2z") ||
//     img.closest("svg") ||
//     img.width === 36 ||
//     img.height === 36
//   )
//     return false;

//   return true;
// }
// const mo = new MutationObserver(
//   debounce((mutations) => {
//     state.mutationCount++;

//     console.warn(
//       `[MO] Mutation observer triggered #${state.mutationCount}`
//     );
//     console.warn(`[MO] Processing ${mutations.length} mutations`);

//     //  // Log what types of mutations we're seeing
//     // mutations.forEach((mutation, index) => {
//     //   if (mutation.type === "childList") {
//     //     console.warn(
//     //       `[MO] Mutation ${index}: ${mutation.addedNodes.length} nodes added, ${mutation.removedNodes.length} removed`
//     //     );
//     //   } else if (mutation.type === "attributes") {
//     //     console.warn(
//     //       `[MO] Mutation ${index}: attribute '${mutation.attributeName}' changed on`,
//     //       mutation.target
//     //     );
//     //   }
//     // });

//     // ✅ Extract all added images
//     const addedImages = mutations
//       .filter((m) => m.type === "childList")
//       .flatMap((m) => Array.from(m.addedNodes))
//       .filter((node) => node.nodeType === Node.ELEMENT_NODE)
//       .flatMap((node) => {
//         // If the node itself is an image
//         if (node.tagName === "IMG") {
//           console.warn("[s]", node);
//           return [node];
//         }
//         // If the node contains images
//         return Array.from(node.querySelectorAll("img"));
//       });

//     // ✅ Print all added images
//     if (addedImages.length > 0) {
//       console.error(`[MO] 🖼️ Found ${addedImages.length} new images:`);

//       addedImages.forEach((img, index) => {
//         if (isValidImage(img)) {
//           console.error(`[MO] Image ${index + 1}:`, {
//             element: img,
//             src: img.getAttribute("src"),
//             srcset: img.getAttribute("srcset"),
//             alt: img.getAttribute("alt"),
//             class: img.className,
//             width: img.width,
//             height: img.height,
//             naturalWidth: img.naturalWidth,
//             naturalHeight: img.naturalHeight,
//             complete: img.complete,
//             currentSrc: img.currentSrc,
//           });
//         }
//       });
//     } else {
//       console.error("[MO] No images found in this mutation batch");
//     }
//     // Get newly added nodes for focused scanning
//     // const addedNodes = mutations
//     //   .filter((m) => m.type === "childList")
//     //   .flatMap((m) => Array.from(m.addedNodes))
//     //   .filter((node) => node.nodeType === Node.ELEMENT_NODE);

//     // console.warn(`[MO] Found ${addedNodes.length} new element nodes`);

//     if (addedImages.length > 0) {
//       // if (false) {
//       // console.warn("[MO] Scanning newly added nodes");
//       // // scanImages(io, addedNodes);
//       // scanImages(io);

//       let instantBlurCount = 0;

//       addedImages.forEach((img) => {
//         const src = pickImageSrc(img);
//         if (!src) return;

//         const cached = state.processedImages.get(src);
//         if (cached) {
//           // Apply blur IMMEDIATELY (no waiting)
//           requestAnimationFrame(() => {
//             img.setAttribute(
//               "data-nsfw-safe",
//               cached.safe ? "true" : "false"
//             );
//             img.style.filter = cached.safe ? "none" : "blur(12px)";
//             showPredictionsOverlay(img, cached.predictions.predictions);
//           });
//           instantBlurCount++;
//         }
//       });

//       if (instantBlurCount > 0) {
//         console.warn(
//           `[MO IMMEDIATE] ⚡ Instantly blurred ${instantBlurCount} cached images`
//         );
//       }
//     } else {
//       console.warn("[MO] Scanning entire document (fallback)");
//       scanImages(io);
//     }
//   }, CONFIG.DEBOUNCE_TIME)
// );
// function scanImages(observer, nodesToScan = null) {
//   console.warn("scanImages called");

//   runWhenIdle(() => {
//     console.warn("scanImages running in idle callback");

//     let imgs = [];
//     if (nodesToScan) {
//       console.warn("Scanning specific nodes");
//       imgs = Array.from(nodesToScan).filter((el) => el.tagName === "IMG");
//     } else {
//       const feed = document.querySelector('[role="main"]') || document;
//       const selector = [
//         // keep your FB selectors here
//         "img.xz74otr.x15mokao.x1ga7v0g.x16uus16.xbiv7yw.x1ey2m1c.x5yr21d.xtijo5x.x1o0tod.x10l6tqk.x13vifvy.xh8yej3",
//         "img.x15mokao.x1ga7v0g.x16uus16.xbiv7yw.x1ey2m1c.x5yr21d.xtijo5x.x1o0tod.x10l6tqk.x13vifvy.xh8yej3.xl1xv1r",
//         "img.x1fmog5m.xu25z0z.x140muxe.xo1y3bh.x5yr21d.xl1xv1r.xh8yej3",
//       ].join(", ");

//       console.warn("Using selector:", selector);
//       imgs = Array.from(feed.querySelectorAll(selector));
//     }

//     console.warn("Found", imgs.length, "images");

//     const candidates = [];
//     for (const img of imgs) {
//       const src = pickImageSrc(img);
//       if (!src) continue;
//       if (!img.__nsfwSrcKey__) img.__nsfwSrcKey__ = src;

//       const cached = localStorage.getItem("nsfw:" + src);
//       if (cached === "unsafe") {
//         console.warn("Found cached unsafe image:", src.substring(0, 50));
//         img.setAttribute("data-nsfw-safe", "false");
//         img.setAttribute("data-nsfw-scan", "true");
//         img.style.filter = "blur(12px)";
//         showPredictionsOverlay(img, [
//           { className: "Unsafe", probability: 1 },
//         ]);
//         continue;
//       }
//       if (cached === "safe") {
//         console.warn("Found cached safe image:", src.substring(0, 50));
//         markSafe(img);
//         continue;
//       }

//       if (isValidImage(img) && !state.processedImages.has(src)) {
//         console.warn("Adding candidate image:", src.substring(0, 50));
//         candidates.push(img);
//       }
//       if (candidates.length >= CONFIG.MAX_IMAGES) {
//         console.warn("candidates length", candidates.length);
//         break;
//       }
//     }

//     console.warn("Processing", candidates.length, "candidate images");

//     for (const img of candidates) {
//       if (img.__nsfwObserved) continue;
//       img.__nsfwObserved = true;
//       img.setAttribute("data-nsfw-scan", "true");
//       console.warn("Observing image:", pickImageSrc(img).substring(0, 50));
//       observer.observe(img);
//     }
//   });
// }

// const memoryCache = new Map();

// function scanImages(observer, nodesToScan = null) {
//   runWhenIdle(() => {
//     let imgs = [];

//     if (nodesToScan) {
//       imgs = Array.from(nodesToScan).filter((el) => el.tagName === "IMG");
//     } else {
//       const feed = document.querySelector('[role="main"]') || document;
//       imgs = Array.from(feed.querySelectorAll("img[src], img[srcset]"));
//     }

//     const candidates = [];

//     for (const img of imgs) {
//       try {
//         const src = pickImageSrc(img);
//         if (!src) continue;

//         if (!img.__nsfwSrcKey__) img.__nsfwSrcKey__ = src;

//         // Memory cache first
//         let cached = memoryCache.get(src);
//         if (!cached) {
//           cached = localStorage.getItem("nsfw:" + src);
//           if (cached) memoryCache.set(src, cached);
//         }

//         if (cached === "unsafe") {
//           img.setAttribute("data-nsfw-safe", "false");
//           img.setAttribute("data-nsfw-scan", "true");
//           img.style.filter = "blur(12px)";
//           showPredictionsOverlay(img, [
//             { className: "Unsafe", probability: 1 },
//           ]);
//           continue;
//         }

//         if (cached === "safe") {
//           markSafe(img);
//           continue;
//         }

//         if (isValidImage(img) && !state.processedImages.has(src)) {
//           candidates.push(img);
//         }

//         if (candidates.length >= CONFIG.MAX_IMAGES) break;
//       } catch (err) {
//         console.error("Error processing image:", err);
//       }
//     }

//     // Observe candidates in chunks
//     for (const img of candidates) {
//       if (img.__nsfwObserved) continue;
//       img.__nsfwObserved = true;
//       img.setAttribute("data-nsfw-scan", "true");
//       observer.observe(img);
//     }
//   });
// }
//========================================================================
// const memoryCache = new Map();
// function scanImages(observer, nodesToScan = null) {
//   console.warn("scanImages called");

//   runWhenIdle(() => {
//     console.warn("scanImages running in idle callback");

//     let imgs = [];
//     if (nodesToScan) {
//       console.warn("Scanning specific nodes");
//       imgs = Array.from(nodesToScan).filter((el) => el.tagName === "IMG");
//     } else {
//       const feed = document.querySelector('[role="main"]') || document;
//       const selector = [
//         // keep your FB selectors here
//         "img.xz74otr.x15mokao.x1ga7v0g.x16uus16.xbiv7yw.x1ey2m1c.x5yr21d.xtijo5x.x1o0tod.x10l6tqk.x13vifvy.xh8yej3",
//         "img.x15mokao.x1ga7v0g.x16uus16.xbiv7yw.x1ey2m1c.x5yr21d.xtijo5x.x1o0tod.x10l6tqk.x13vifvy.xh8yej3.xl1xv1r",
//         "img.x1fmog5m.xu25z0z.x140muxe.xo1y3bh.x5yr21d.xl1xv1r.xh8yej3",
//       ].join(", ");

//       console.warn("Using selector:", selector);
//       imgs = Array.from(feed.querySelectorAll(selector));
//     }

//     console.warn("Found", imgs.length, "images");

//     const candidates = [];
//     for (const img of imgs) {
//       const src = pickImageSrc(img);
//       if (!src) continue;
//       if (!img.__nsfwSrcKey__) img.__nsfwSrcKey__ = src;

//       let cached = memoryCache.get(src);
//       console.warn("cached", cached);
//       if (!cached) {
//         const raw = localStorage.getItem("nsfw:" + src);
//         if (raw) cached = JSON.parse(raw);
//         if (cached) memoryCache.set(src, cached);
//       }

//       if (cached) {
//         img.setAttribute("data-nsfw-safe", cached.safe ? "true" : "false");
//         img.style.filter = cached.safe ? "none" : "blur(12px)";
//         showPredictionsOverlay(img, cached.predictions);
//         continue;
//       }

//       if (isValidImage(img) && !state.processedImages.has(src))
//         candidates.push(img);
//       if (candidates.length >= CONFIG.MAX_IMAGES) break;
//     }
//     console.warn("candidates length", candidates.length);
//     for (const img of candidates) {
//       if (img.__nsfwObserved) continue;
//       img.__nsfwObserved = true;
//       img.setAttribute("data-nsfw-scan", "true");
//       observer.observe(img);
//     }
//   });
// }
//===================================================

// const memoryCache = new Map();
