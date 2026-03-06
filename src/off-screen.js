// --- Imports ---
import * as tf from "@tensorflow/tfjs";
import * as wasm from "@tensorflow/tfjs-backend-wasm";

import * as nsfwjs from "./m/index.js";
import { loadModelFromCache, saveModelToCache } from "./db/modelCache.js";
// import * as wasmBackend from "./m/wasm/tf-backend-wasm.fesm.js";
import Human from "./m/human/human.esm.js";

// --- Global Variables ---
// let wasmBase = chrome.runtime.getURL("libs/");
let modelUrl = null;
let wasmBase;
let nsfwModel;
let humanModel;
let isNSFWInitialized = false;
let isHumanInitialized = false;
let warmupTensor224;

//--- TensorFlow.js Backend Init ---
tf.env().set("WASM_HAS_MULTITHREAD_SUPPORT", false);

const tfReadyPromise = (async () => {
  // tf.env().set("WASM_HAS_MULTITHREAD_SUPPORT", false);
  console.warn("[offscreen] Starting TF.js backend init...");
  console.log("[offscreen] tf version:", tf.version);
  console.log("[offscreen] wasm.setThreadsCount:", wasm.setThreadsCount);

  // Set WASM paths just in case
  if (wasm.setWasmPaths) {
    wasm.setWasmPaths(chrome.runtime.getURL("libstwo/"));
  }
  if (wasm.setThreadsCount) {
    wasm.setThreadsCount(1);
  }

  try {
    await tf.setBackend("wasm");
    await tf.ready();
    warmupTensor224 = tf.zeros([1, 224, 224, 3]);

    console.log("[offscreen] ✅ TF.js WASM backend ready");
  } catch (errWebGL) {
    console.warn("[offscreen] ❌ WebGL backend failed, trying WASM:", errWebGL);
    try {
      await tf.setBackend("wasm");
      await tf.ready();
      console.log("[offscreen] ✅ TF.js WASM backend ready");
    } catch (errWasm) {
      console.warn(
        "[offscreen] ❌ WASM backend failed, falling back to CPU:",
        errWasm,
      );
      await tf.setBackend("cpu");
      await tf.ready();
      console.log("[offscreen] ✅ TF.js CPU backend ready");
    }
  }
  const wasmBackend = tf.backend();
  console.log("[DEBUG] WASM backend info:", wasmBackend);
  console.log("[DEBUG] WASM features:", {
    simd: tf.env().getBool("WASM_HAS_SIMD_SUPPORT"),
    multithread: tf.env().getBool("WASM_HAS_MULTITHREAD_SUPPORT"),
  });
  const activeBackend = tf.getBackend();
  console.warn(`[offscreen] 🎯 Active TF.js backend: ${activeBackend}`);
  return tf;
})();

export async function initializeNSFWDetection() {
  if (isNSFWInitialized) {
    console.warn("[offscreen] Skipping NSFW init — already initialized");
    return { ok: true };
  }

  try {
    await tfReadyPromise; // Wait for backend ready
    console.warn("[offscreen] Backend ready, proceeding to NSFW model load...");

    const cached = await loadModelFromCache();
    if (cached) {
      await loadNSFWModelFromMemory(cached);
      console.warn("[offscreen] NSFW model loaded from cache");
      isNSFWInitialized = true;
      return { ok: true, fromCache: true };
    }

    if (!modelUrl) {
      throw new Error("No model URL set for NSFW model");
    }

    nsfwModel = await loadAndCacheNSFWModel(modelUrl);
    console.warn("[offscreen] NSFW model loaded from network and cached");
    isNSFWInitialized = true;

    return { ok: true, fromCache: false };
  } catch (err) {
    console.error("[offscreen][NSFW Init ❌]", err);
    return { ok: false, error: err.message };
  }
}

async function loadAndCacheNSFWModel(urlToModelJson) {
  if (!urlToModelJson) throw new Error("modelUrl not provided");

  try {
    modelUrl = chrome.runtime.getURL("models/mobilenet_v2_mid/model.json");
    console.warn("[offscreen] Loading NSFWJS model from URL:", modelUrl);
    nsfwModel = await nsfwjs.load(modelUrl, { size: 224, type: "graph" });
  } catch (err) {
    console.error("[offscreen][NSFW Init ❌] Model loading error:", err);
    throw err;
  }

  // Cache NSFW model into IndexedDB
  await nsfwModel.model.save(
    tf.io.withSaveHandler(async (artifacts) => {
      await saveModelToCache(artifacts);
      return {
        modelArtifactsInfo: {
          dateSaved: new Date(),
          modelTopologyType: "JSON",
          modelTopologyBytes: artifacts.modelTopology
            ? new TextEncoder().encode(JSON.stringify(artifacts.modelTopology))
                .length
            : 0,
          weightDataBytes: artifacts.weightData?.byteLength || 0,
        },
      };
    }),
  );

  console.warn("[offscreen][Cache ✅] NSFW model saved to IndexedDB");
  return nsfwModel;
}

async function loadNSFWModelFromMemory(artifacts) {
  const { modelTopology, weightSpecs, weightData } = artifacts || {};
  if (!modelTopology || !weightSpecs || !weightData) {
    throw new Error("Invalid NSFW modelArtifacts: missing fields");
  }

  const handler = {
    async load() {
      return {
        modelTopology,
        weightSpecs,
        weightData:
          weightData instanceof ArrayBuffer
            ? weightData
            : new Uint8Array(weightData).buffer,
      };
    },
  };

  nsfwModel = await nsfwjs.load(handler, { size: 224 });
  console.warn("[offscreen][NSFW Init ✅] Model loaded from IndexedDB");
}

// ------------------------------------------------
// HUMAN INITIALIZATION (for gender detection)
// ------------------------------------------------
export async function initializeHumanDetection() {
  if (isHumanInitialized) {
    console.warn("[offscreen] Skipping Human init — already initialized");
    return { ok: true };
  }

  try {
    const tfInstance = await tfReadyPromise;
    const activeBackend = tfInstance.getBackend();

    console.warn("activebackend ", activeBackend);

    humanModel = humanModel = new Human({
      modelBasePath: chrome.runtime.getURL("human-models/"),
      wasmPath: chrome.runtime.getURL("libstwo/"),
      wasmPlatformFetch: true, // Use platform fetch instead of CDN
      face: {
        enabled: true,
        detector: {
          modelPath: "blazeface.json",
          maxDetected: 2,
          minConfidence: 0.25,
          return: true, // Make sure face data is returned
          rotation: true, // Detect rotated faces
        },
        description: {
          // ← This is what you're missing!
          enabled: true,
          modelPath: "faceres.json",
        },
        iris: { enabled: false },
        mesh: { enabled: false },
        emotion: { enabled: false },
      },
      faceres: { enabled: false },
      emotion: { enabled: false },
      body: { enabled: false },
      hand: { enabled: false },
      segmentation: { enabled: false },
      gesture: { enabled: false },
      object: { enabled: false },
      cacheSensitivity: 0.8,
      backend: "wasm",
      deallocate: true,
      scoped: true, // 🔥 ENABLE - works fine with WASM
      filter: { enabled: false },
      // scoped: true,
      // debug: false,
      // filter: { enabled: false },
      async: true,
      // skipAllowed: false,
      // modelStats: true,
      warmup: "none",
    });

    await humanModel.load();
    console.log("[offscreen] Warming up Human model...");
    const tensor = humanModel.tf.zeros([1, 224, 224, 3]);
    await humanModel.detect(tensor);
    humanModel.tf.dispose(tensor);
    console.log("[offscreen] Human model warmed up ✅");
    isHumanInitialized = true;
    console.warn("[offscreen] Human model config:", humanModel.config);
    console.warn("[offscreen] Loaded models:", Object.keys(humanModel.models));

    console.warn("[offscreen][Human ✅] Gender detection models loaded");
    return { ok: true };
  } catch (err) {
    console.error("[offscreen][Human Init ❌]", err);
    return { ok: false, error: err.message };
  }
}

const imageCache = new Map();
let imageLoadCount = 0;
let cacheHitCount = 0;

// Main pipeline tracking (one per CLASSIFY_IMAGE message)
let pipelineCounter = 0;
const activePipelines = new Map();

// Queue system to prevent resource exhaustion
const MAX_CONCURRENT_PIPELINES = 1; // Only 3 pipelines at once
let activePipelineCount = 0;
const pipelineQueue = [];

function startPipeline(src) {
  pipelineCounter++;
  const pipelineId = `PIPE-${pipelineCounter.toString().padStart(3, "0")}`;
  const pipeline = {
    id: pipelineId,
    src: src.substring(0, 25),
    startTime: performance.now(),
    stages: [],
    isComplete: false,
  };

  activePipelines.set(pipelineId, pipeline);

  console.log(`🎬 [${pipelineId}] ========== NEW IMAGE PROCESSING ==========`);
  console.log(`🎬 [${pipelineId}] Source: ${pipeline.src}`);
  console.log(
    `📊 [STATS] Pipeline #${pipelineCounter}, Active: ${activePipelineCount}, Queue: ${pipelineQueue.length}`,
  );

  return pipelineId;
}

function logPipelineStage(pipelineId, stage, details = {}) {
  const pipeline = activePipelines.get(pipelineId);
  if (!pipeline) return;

  const elapsed = Math.round(performance.now() - pipeline.startTime);
  const stageInfo = { stage, elapsed, details, timestamp: performance.now() };

  pipeline.stages.push(stageInfo);
  console.log(`📍 [${pipelineId}] ${stage} (${elapsed}ms)`, details);
}

function completePipeline(pipelineId, result = {}) {
  const pipeline = activePipelines.get(pipelineId);
  if (!pipeline) return;

  const totalTime = Math.round(performance.now() - pipeline.startTime);
  pipeline.isComplete = true;

  // 🔍 CHECK FOR MEMORY LEAKS
  const memInfo = tf.memory();
  console.log(`🏁 [${pipelineId}] COMPLETE (${totalTime}ms)`);
  console.log(
    `📊 [MEMORY] Tensors: ${memInfo.numTensors}, Bytes: ${memInfo.numBytes}`,
  );

  // 🚨 ALERT if tensors are building up
  if (memInfo.numTensors > 10) {
    console.warn(
      `⚠️ [LEAK?] ${memInfo.numTensors} tensors in memory! Should be ~0-5`,
    );
  }

  activePipelineCount--;
  processNextInQueue();

  setTimeout(() => activePipelines.delete(pipelineId), 10000);
}
// ==============================================
// SIMPLIFIED IMAGE LOADING (NO REQUEST TRACKING)
// ==============================================

async function loadImageCached(src, callerType = "UNKNOWN", pipelineId = null) {
  // Check cache first
  if (imageCache.has(src)) {
    cacheHitCount++;
    if (pipelineId) {
      logPipelineStage(pipelineId, `${callerType}_CACHE_HIT`, {
        hitCount: cacheHitCount,
        cacheSize: imageCache.size,
      });
    }
    return imageCache.get(src);
  }

  // Cache miss - load image
  imageLoadCount++;
  if (pipelineId) {
    logPipelineStage(pipelineId, `${callerType}_CACHE_MISS`, {
      loadCount: imageLoadCount,
      cacheSize: imageCache.size,
    });
  }

  const img = await loadImageSimple(src, pipelineId, callerType);

  // Cache the result
  imageCache.set(src, img);
  if (pipelineId) {
    logPipelineStage(pipelineId, `${callerType}_CACHED`, {
      newCacheSize: imageCache.size,
      totalLoads: imageLoadCount,
      totalHits: cacheHitCount,
    });
  }

  // Cache cleanup
  if (imageCache.size > 50) {
    const firstKey = imageCache.keys().next().value;
    imageCache.delete(firstKey);
    if (pipelineId) {
      logPipelineStage(pipelineId, `CACHE_CLEANUP`, {
        newSize: imageCache.size,
      });
    }
  }

  return img;
}

async function loadImageSimple(src, pipelineId, callerType) {
  return new Promise(async (resolve, reject) => {
    const img = new Image();
    let isResolved = false;
    const startTime = performance.now();

    // ✅ Fast path for data URLs
    if (src.startsWith("data:")) {
      const sizeKB = Math.round(src.length / 1024);
      if (pipelineId) {
        logPipelineStage(pipelineId, `${callerType}_DATA_URL_START`, {
          sizeKB,
        });
      }

      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          if (pipelineId) {
            logPipelineStage(pipelineId, `${callerType}_TIMEOUT`, {
              timeoutMs: 1000,
            });
          }
          reject(new Error("Data URL timeout"));
        }
      }, 1000);

      img.onload = () => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          const loadTime = Math.round(performance.now() - startTime);
          if (pipelineId) {
            logPipelineStage(pipelineId, `${callerType}_DATA_URL_SUCCESS`, {
              loadTime,
              dimensions: `${img.naturalWidth}x${img.naturalHeight}`,
              sizeKB,
            });
          }
          resolve(img);
        }
      };

      img.onerror = (e) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          if (pipelineId) {
            logPipelineStage(pipelineId, `${callerType}_ERROR`, {
              error: e.message,
            });
          }
          reject(new Error(`Data URL failed: ${e.message}`));
        }
      };

      img.src = src;
      return;
    }

    // ✅ Network URL path with fetch + timeout
    if (pipelineId) {
      logPipelineStage(pipelineId, `${callerType}_NETWORK_START`, {
        url: src.substring(0, 50),
      });
    }

    const timeoutMs = 2000;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      if (!isResolved) {
        isResolved = true;
        if (pipelineId) {
          logPipelineStage(pipelineId, `${callerType}_NETWORK_TIMEOUT`, {
            timeoutMs,
          });
        }
        reject(new Error("Image fetch timeout"));
      }
    }, timeoutMs);

    try {
      const fetchStart = performance.now();
      const response = await fetch(src, { signal: controller.signal });
      const fetchTime = Math.round(performance.now() - fetchStart);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      if (pipelineId) {
        logPipelineStage(pipelineId, `${callerType}_FETCH_SUCCESS`, {
          fetchTime,
          contentLength: response.headers.get("content-length"),
        });
      }

      const blobStart = performance.now();
      const blob = await response.blob();
      const blobTime = Math.round(performance.now() - blobStart);

      const blobUrl = URL.createObjectURL(blob);
      img.decoding = "async";
      img.crossOrigin = "anonymous";

      img.onload = () => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          const totalTime = Math.round(performance.now() - startTime);
          if (pipelineId) {
            logPipelineStage(pipelineId, `${callerType}_NETWORK_SUCCESS`, {
              totalTime,
              fetchTime,
              blobTime,
              dimensions: `${img.naturalWidth}x${img.naturalHeight}`,
            });
          }
          URL.revokeObjectURL(blobUrl);
          resolve(img);
        }
      };

      img.onerror = (e) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          if (pipelineId) {
            logPipelineStage(pipelineId, `${callerType}_NETWORK_IMG_ERROR`, {
              error: e.message,
            });
          }
          reject(new Error(`Image load failed: ${e.message}`));
        }
      };

      img.src = blobUrl;
    } catch (err) {
      clearTimeout(timeout);
      if (!isResolved) {
        isResolved = true;
        if (pipelineId) {
          logPipelineStage(pipelineId, `${callerType}_FETCH_ERROR`, {
            error: err.message,
          });
        }
        // fallback: direct assignment if fetch fails
        img.crossOrigin = "anonymous";
        img.decoding = "async";
        img.onload = () => resolve(img);
        img.onerror = (e) =>
          reject(new Error(`Fallback image load failed: ${e.message}`));
        img.src = src;
      }
    }
  });
}

// ==============================================
// CLASSIFICATION FUNCTIONS (NO REQUEST CREATION)
// ==============================================

//=====================

const pausedTabs = new Set(); // Set of tab IDs that are paused
const activeTabRequests = new Map(); // Map<tabId, count of active requests>

async function classifyNSFW(src, pipelineId = null) {
  if (!isNSFWInitialized || !nsfwModel) {
    throw new Error("NSFW model not initialized");
  }

  if (pipelineId) logPipelineStage(pipelineId, "NSFW_START");

  const img = await loadImageCached(src, "NSFW", pipelineId);
  if (pipelineId) logPipelineStage(pipelineId, "NSFW_IMAGE_READY");

  const input = await toInput224(img);
  if (pipelineId) logPipelineStage(pipelineId, "NSFW_INPUT_PROCESSED");
  if (pipelineId) {
    const memBefore = tf.memory();
    logPipelineStage(pipelineId, "NSFW_INPUT_PROCESSED", {
      tensorsBefore: memBefore.numTensors,
    });
  }

  const start = performance.now();
  const predictions = await nsfwModel.classify(input);
  const inferenceTime = Math.round(performance.now() - start);

  if (pipelineId) {
    logPipelineStage(pipelineId, "NSFW_INFERENCE_COMPLETE", {
      inferenceTime,
      predictionCount: predictions.length,
      topPrediction: predictions[0]?.className || "none",
    });
  }
  if (pipelineId) {
    const memAfter = tf.memory();
    logPipelineStage(pipelineId, "NSFW_INFERENCE_COMPLETE", {
      inferenceTime,
      predictionCount: predictions.length,
      topPrediction: predictions[0]?.className || "none",
      tensorsAfter: memAfter.numTensors,
    });
  }

  return { src, predictions, timestamp: Date.now() };
}

async function classifyGender(src, pipelineId = null) {
  try {
    if (!isHumanInitialized || !humanModel) {
      throw new Error("Human model not initialized");
    }

    if (src.startsWith("data:image/gif")) {
      if (pipelineId) logPipelineStage(pipelineId, "GENDER_GIF_SKIP");
      return { ok: false, src, error: "GIF not supported" };
    }

    if (pipelineId) logPipelineStage(pipelineId, "GENDER_START");

    const img = await loadImageCached(src, "GENDER", pipelineId);
    if (pipelineId) {
      logPipelineStage(pipelineId, "GENDER_IMAGE_READY", {
        dimensions: `${img.width}x${img.height}`,
      });
    }

    if (pipelineId) {
      const memBefore = tf.memory();
      logPipelineStage(pipelineId, "GENDER_IMAGE_READY", {
        dimensions: `${img.width}x${img.height}`,
        tensorsBefore: memBefore.numTensors,
      });
    }

    const start = performance.now();
    const result = await humanModel.detect(img);
    const detectTime = Math.round(performance.now() - start);

    if (pipelineId) {
      logPipelineStage(pipelineId, "GENDER_DETECTION_COMPLETE", {
        detectTime,
        faceCount: result.face?.length || 0,
      });
    }

    const faces =
      result.face?.map((face) => ({
        gender: face.gender?.[0] || "unknown",
        genderScore: face.genderScore ?? 0,
        emotion: face.emotion?.[0] || undefined,
        emotionScore: face.emotionScore ?? undefined,
      })) || [];

    if (pipelineId) {
      logPipelineStage(pipelineId, "GENDER_PROCESSING_COMPLETE", {
        validFaces: faces.length,
        topGender: faces[0]?.gender || "none",
        topScore: faces[0]?.genderScore || 0,
      });
    }

    if (pipelineId) {
      const memAfter = tf.memory();
      logPipelineStage(pipelineId, "GENDER_DETECTION_COMPLETE", {
        detectTime,
        faceCount: result.face?.length || 0,
        tensorsAfter: memAfter.numTensors,
        bytesDelta: memAfter.numBytes,
      });
    }

    return { src, faces, timestamp: Date.now(), ok: true };
  } catch (error) {
    if (pipelineId) {
      logPipelineStage(pipelineId, "GENDER_ERROR", { error: error.message });
    }

    return {
      ok: false,
      src,
      error: error.message || "Unknown error in classifyGender",
    };
  }
}

async function processPipelineImmediate(
  message,
  sendResponse,
  tabId = "unknown",
) {
  if (pausedTabs.has(tabId)) {
    console.warn(
      `⏸️ [PIPELINE] Tab ${tabId} paused during processing - requeueing`,
    );
    pipelineQueue.unshift({ message, sendResponse, tabId });
    return;
  }
  activePipelineCount++;

  // Track this request for this tab
  const currentCount = activeTabRequests.get(tabId) || 0;
  activeTabRequests.set(tabId, currentCount + 1);

  console.log(`🔄 [PIPELINE] Tab ${tabId} - Active: ${activePipelineCount}`);

  try {
    const pipelineId = startPipeline(message.src);

    if (message.src.startsWith("data:image/gif")) {
      logPipelineStage(pipelineId, "GIF_ABORT");
      completePipeline(pipelineId, { aborted: true });
      sendResponse({ ok: false, error: "GIF not supported" });
      return;
    }

    // Phase 1: Gender Detection
    logPipelineStage(pipelineId, "PHASE_1_GENDER_START");
    const genderResult = await classifyGender(message.src, pipelineId);

    let nsfwResult = null;
    let firstFace = genderResult.faces?.[0];

    logPipelineStage(pipelineId, "PHASE_1_GENDER_COMPLETE", {
      success: genderResult.ok,
      faceCount: genderResult.faces?.length || 0,
      topGender: firstFace?.gender || "none",
      topScore: firstFace?.genderScore || 0,
    });

    // Phase 2: NSFW Classification (if face found)
    if (firstFace) {
      logPipelineStage(pipelineId, "PHASE_2_NSFW_START");
      nsfwResult = await classifyNSFW(message.src, pipelineId);
      logPipelineStage(pipelineId, "PHASE_2_NSFW_COMPLETE", {
        predictionCount: nsfwResult.predictions?.length || 0,
        topPrediction: nsfwResult.predictions?.[0]?.className || "none",
      });
    } else {
      firstFace = { gender: "empty", genderScore: 0.1 };
      logPipelineStage(pipelineId, "PHASE_2_NSFW_SKIP", {
        reason: "no_face",
      });
    }

    completePipeline(pipelineId, {
      phases: firstFace ? 2 : 1,
      faceCount: genderResult.faces?.length || 0,
    });

    if (!pausedTabs.has(tabId)) {
      sendResponse({
        ok: true,
        result: {
          src: message.src,
          gender: genderResult,
          firstFace: firstFace,
          nsfw: nsfwResult,
          predictions: nsfwResult ? nsfwResult : { predictions: [] },
        },
      });
    } else {
      console.warn(
        `⏸️ [PIPELINE] Tab ${tabId} paused before response - discarding result`,
      );
    }
  } catch (error) {
    console.error(`❌ [PIPELINE] Tab ${tabId} error:`, error);
    sendResponse({ ok: false, error: error.message, src: message.src });
  } finally {
    activePipelineCount--;

    // Update tab request count
    const count = activeTabRequests.get(tabId) || 1;
    if (count <= 1) {
      activeTabRequests.delete(tabId);
    } else {
      activeTabRequests.set(tabId, count - 1);
    }

    console.log(
      `✅ [PIPELINE] Tab ${tabId} completed - Active: ${activePipelineCount}`,
    );

    // Process queue (will check which tabs are active)
    processQueue();
  }
}
function processNextInQueue() {
  processQueue();
}
function processQueue() {
  while (
    pipelineQueue.length > 0 &&
    activePipelineCount < MAX_CONCURRENT_PIPELINES
  ) {
    // Find next request from an ACTIVE tab
    const activeIndex = pipelineQueue.findIndex(
      (item) => !pausedTabs.has(item.tabId),
    );

    if (activeIndex === -1) {
      // All queued items are from paused tabs
      console.log(
        `⏸️ [QUEUE] All ${pipelineQueue.length} queued items are from paused tabs - waiting`,
      );
      break;
    }

    // Remove and process the active item
    const [item] = pipelineQueue.splice(activeIndex, 1);
    const { message, sendResponse, tabId } = item;

    console.log(
      `⚡ [QUEUE] Processing item from tab ${tabId} - Queue: ${pipelineQueue.length}, Active: ${activePipelineCount}`,
    );
    processPipelineImmediate(message, sendResponse, tabId);
  }

  if (pipelineQueue.length > 0) {
    const pausedCount = pipelineQueue.filter((item) =>
      pausedTabs.has(item.tabId),
    ).length;
    const activeCount = pipelineQueue.length - pausedCount;
    console.log(
      `⏳ [QUEUE] ${pipelineQueue.length} items remaining (${activeCount} active, ${pausedCount} paused)`,
    );
  }
}

function processQueueForTab(tabId) {
  console.log(`🔄 [QUEUE] Processing queued items for resumed tab ${tabId}`);

  let processed = 0;
  while (activePipelineCount < MAX_CONCURRENT_PIPELINES) {
    // Find next item from this specific tab
    const index = pipelineQueue.findIndex((item) => item.tabId === tabId);

    if (index === -1) break; // No more items from this tab

    const [item] = pipelineQueue.splice(index, 1);
    const { message, sendResponse } = item;

    processPipelineImmediate(message, sendResponse, tabId);
    processed++;
  }

  if (processed > 0) {
    console.log(`⚡ [QUEUE] Processed ${processed} items for tab ${tabId}`);
  } else {
    console.log(`ℹ️ [QUEUE] No queued items or at capacity for tab ${tabId}`);
  }
}
// ==============================================
// MESSAGE ROUTER WITH QUEUE MANAGEMENT
// ==============================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.target !== "offscreen") return;

  (async () => {
    try {
      switch (message.type) {
        case "OFFSCREEN_INIT":
          console.log("🔧 [SYSTEM] Initializing offscreen models...");

          console.warn("message.wasmBase", message.wasmBase )
          modelUrl = message.modelUrl;
          wasmBase = message.wasmBase;

          

          const nsfwInit = await initializeNSFWDetection();
          const humanInit = await initializeHumanDetection();

          console.log(
            `🔧 [SYSTEM] Init complete - NSFW: ${nsfwInit.ok}, Human: ${humanInit.ok}`,
          );
          sendResponse({ ok: nsfwInit.ok && humanInit.ok });
          break;

        case "PAUSE_TAB": {
          const tabId = message.tabId;
          console.warn(`⏸️ [SYSTEM] Tab ${tabId} PAUSED`);
          console.warn(`⏸️ [SYSTEM] Total paused tabs: ${pausedTabs.size}`);
          console.warn(`⏸️ [SYSTEM] Active pipelines: ${activePipelineCount}`);
          console.warn(`⏸️ [SYSTEM] Queue length: ${pipelineQueue.length}`);
          sendResponse({
            ok: true,
            tabId,
            pausedTabs: Array.from(pausedTabs),
            queueLength: pipelineQueue.length,
            activePipelines: activePipelineCount,
          });
          break;
        }
        case "RESUME_TAB": {
          const tabId = message.tabId;
          pausedTabs.delete(tabId);

          console.warn(`▶️ [SYSTEM] Tab ${tabId} RESUMED`);
          console.warn(`▶️ [SYSTEM] Total paused tabs: ${pausedTabs.size}`);
          console.warn(
            `▶️ [SYSTEM] Processing queued items for tab ${tabId}...`,
          );
          processQueueForTab(tabId);

          sendResponse({
            ok: true,
            tabId,
            pausedTabs: Array.from(pausedTabs),
            queueLength: pipelineQueue.length,
            activePipelines: activePipelineCount,
          });
          break;
        }
        case "CLASSIFY_IMAGE": {
          const tabId = message.tabId || "unknown";

          // ✅ CHECK IF THIS TAB IS PAUSED
          if (pausedTabs.has(tabId)) {
            console.warn(
              `⏸️ [SYSTEM] Tab ${tabId} is paused - queueing request`,
            );
            pipelineQueue.push({ message, sendResponse, tabId });
            console.warn(
              `⏳ [SYSTEM] Request queued (TAB PAUSED) - Queue: ${pipelineQueue.length}`,
            );
            console.warn(
              `⏳ [SYSTEM]  Queue: ${pipelineQueue} hmm  ${message} hmmm ${sendResponse} hmm ${tabId} `,
            );
            return;
          }
          // CHECK QUEUE CAPACITY
          if (activePipelineCount >= MAX_CONCURRENT_PIPELINES) {
            // Add to queue
            pipelineQueue.push({ message, sendResponse, tabId });
            console.log(
              `⏳ [SYSTEM] Request queued - Active: ${activePipelineCount}/${MAX_CONCURRENT_PIPELINES}, Queue: ${pipelineQueue.length}`,
            );
            console.warn(
              `⏳ [SYSTEM]  Queue: ${pipelineQueue} hmm  ${message} hmmm ${sendResponse} hmm ${tabId} `,
            );
            return; // Don't call sendResponse yet - it will be called when processed
          }

          // Process immediately if under capacity

          console.log(
            `⚡ [SYSTEM] Processing immediately for tab ${tabId} - Active: ${activePipelineCount}/${MAX_CONCURRENT_PIPELINES}`,
          );
          processPipelineImmediate(message, sendResponse, tabId);
          break;
        }

        default:
          console.error(`❌ [SYSTEM] Unknown message type: ${message.type}`);
          sendResponse({ ok: false, error: `Unknown type: ${message.type}` });
      }
    } catch (e) {
      console.error(`💥 [SYSTEM] Message handler error:`, e);
      sendResponse({ ok: false, error: e.message, src: message?.src });
    }
  })();

  return true;
});

// ==============================================
// PIPELINE PROCESSING FUNCTIONS
// ==============================================

// Analyze URL to predict loading issues
function analyzeImageUrl(src) {
  const analysis = {
    domain: "",
    isGoogle: false,
    isDataUrl: false,
    isBlobUrl: false,
    isHttps: false,
    hasParams: false,
    suspiciousPatterns: [],
    suggestedTimeout: 10000,
  };

  try {
    if (src.startsWith("data:")) {
      analysis.isDataUrl = true;
      analysis.suggestedTimeout = 1000; // Very short for data URLs
      return analysis;
    }

    if (src.startsWith("blob:")) {
      analysis.isBlobUrl = true;
      analysis.suggestedTimeout = 2000; // Short for blob URLs
      return analysis;
    }

    const url = new URL(src);
    analysis.domain = url.hostname;
    analysis.isHttps = url.protocol === "https:";
    analysis.hasParams = url.search.length > 0;

    // Check for Google domains
    if (
      url.hostname.includes("gstatic.com") ||
      url.hostname.includes("googleusercontent.com") ||
      url.hostname.includes("googleapis.com")
    ) {
      analysis.isGoogle = true;
      analysis.suggestedTimeout = 20000; // Google images often slower
      analysis.suspiciousPatterns.push(
        "Google domain - may have anti-scraping",
      );
    }

    // Check for encrypted thumbnails
    if (src.includes("encrypted-tbn")) {
      analysis.suspiciousPatterns.push(
        "Encrypted thumbnail - likely restricted",
      );
      analysis.suggestedTimeout = 25000;
    }

    // Check for CDN patterns
    if (url.hostname.includes("cdn") || url.hostname.includes("cloudfront")) {
      analysis.suspiciousPatterns.push(
        "CDN - usually fast but may have geographic restrictions",
      );
    }

    // Check for suspicious parameters
    if (
      src.includes("token=") ||
      src.includes("auth=") ||
      src.includes("sig=")
    ) {
      analysis.suspiciousPatterns.push(
        "Authentication parameters - may expire or be restricted",
      );
    }
  } catch (e) {
    analysis.suspiciousPatterns.push(`Invalid URL: ${e.message}`);
  }

  return analysis;
}

// Try to get additional info about the image via fetch
async function tryGetImageInfo(src) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(src, {
      method: "HEAD", // Just get headers, not content
      mode: "no-cors",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    return {
      status: response.status,
      headers: {
        "content-length": response.headers.get("content-length"),
        "content-type": response.headers.get("content-type"),
        "cache-control": response.headers.get("cache-control"),
        "last-modified": response.headers.get("last-modified"),
      },
      fetchSuccess: true,
    };
  } catch (error) {
    return {
      fetchSuccess: false,
      fetchError: error.message,
      isAbortError: error.name === "AbortError",
      isCorsError:
        error.message.includes("CORS") || error.message.includes("cors"),
    };
  }
}

// Estimate image file size based on dimensions
function estimateImageSize(img) {
  const pixels = img.naturalWidth * img.naturalHeight;
  const estimatedBytes = pixels * 3; // Rough estimate for RGB

  if (estimatedBytes < 100000)
    return `~${Math.round(estimatedBytes / 1000)}KB (small)`;
  if (estimatedBytes < 1000000)
    return `~${Math.round(estimatedBytes / 1000)}KB (medium)`;
  return `~${Math.round(estimatedBytes / 1000000)}MB (large)`;
}

// Get current network information if available
function getNetworkState() {
  if ("connection" in navigator) {
    const conn = navigator.connection;
    return {
      effectiveType: conn.effectiveType,
      downlink: conn.downlink,
      rtt: conn.rtt,
      saveData: conn.saveData,
    };
  }
  return { available: false };
}
async function toInput224(img) {
  const TARGET = 224;
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(TARGET, TARGET);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, TARGET, TARGET);
    return canvas.transferToImageBitmap
      ? canvas.transferToImageBitmap()
      : canvas;
  } else {
    const canvas = document.createElement("canvas");
    canvas.width = TARGET;
    canvas.height = TARGET;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, TARGET, TARGET);
    return canvas;
  }

  // const tensor = tf.browser
  //   .fromPixels(canvas)
  //   .toFloat()
  //   .div(255.0)
  //   .expandDims(0); // Shape: [1, 224, 224, 3]

  // return tensor;
}
