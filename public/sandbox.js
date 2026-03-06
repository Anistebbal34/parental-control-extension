// // ✅ sandbox.js (verbose with console.warn)
// console.warn("✅ [sandbox] sandbox.js is running!");
// console.warn("✅ [sandbox] Testing localStorage…");
// // try {
// //   localStorage.setItem("sandbox_test_key", "hello from sandbox");
// //   const value = localStorage.getItem("sandbox_test_key");

// //   if (value === "hello from sandbox") {
// //     console.warn("✅ [sandbox] localStorage is working:", value);
// //   } else {
// //     console.warn(
// //       "❌ [sandbox] localStorage test failed, unexpected value:",
// //       value
// //     );
// //   }
// // } catch (e) {
// //   console.error("❌ [sandbox] localStorage error:", e);
// // }

// let model;
// let isInitialized = false;
// let modelUrl = null;
// let wasm = null;
// let modelReady = false; // passed from the content script
// const MODEL_IDB_KEY = "indexeddb://nsfw-model-v1";

// async function initializeNSFWDetection() {
//   if (isInitialized) {
//     console.warn(
//       "[sandbox][Init] Model already initialized — skipping re-init"
//     );
//     return;
//   }

//   try {
//     console.warn("[sandbox][Init] NSFW detection initialization...");

//     if (!tf || !tf.setBackend) {
//       throw new Error("[sandbox][Init] TensorFlow.js not loaded");
//     }

//     console.warn("[sandbox][Init] Setting WASM path:", wasm);
//     if (tf.wasm && typeof tf.wasm.setWasmPaths === "function") {
//       tf.wasm.setWasmPaths(wasm);
//     } else {
//       console.warn(
//         "[sandbox][Init] tf.wasm.setWasmPaths not available on this tf build"
//       );
//     }

//     tf.env().set("WASM_HAS_MULTITHREAD_SUPPORT", true);
//     tf.env().set("WASM_HAS_SIMD_SUPPORT", true);

//     await tf.setBackend("wasm");
//     await tf.ready();
//     console.warn("[sandbox][Init] tf backend ready (wasm)");

//     console.warn("[sandbox][Init] First-time model load (modelReady = false)");
//     model = await loadAndCacheModel(); // Also sends modelArtifacts to content script

//     isInitialized = true;
//     console.warn("[sandbox][Init] Model ready ✅");
//     window.parent.postMessage({ type: "SANDBOX_READY" }, "*");
//   } catch (err) {
//     console.error("[sandbox][Init ❌] Initialization failed:", err);
//     window.parent.postMessage(
//       { type: "SANDBOX_INIT_ERROR", error: err.message },
//       "*"
//     );
//   }
// }

// // async function tryLoadFromIndexedDB() {
// //   try {
// //     console.warn("[sandbox][IDB] Checking IndexedDB for cached model…");
// //     const models = await tf.io.listModels();
// //     if (!models[MODEL_IDB_KEY]) {
// //       console.warn("[sandbox][IDB] No model at key:", MODEL_IDB_KEY);
// //       return null;
// //     }

// //     console.warn(
// //       "[sandbox][IDB] Found cached model meta:",
// //       models[MODEL_IDB_KEY]
// //     );
// //     const tfModel = await tf.loadLayersModel(MODEL_IDB_KEY);
// //     console.warn("[sandbox][IDB] tf.loadLayersModel() loaded successfully");

// //     if (
// //       typeof nsfwjs !== "undefined" &&
// //       (typeof nsfwjs.loadFromTFModel === "function" ||
// //         typeof nsfwjs.loadFromTfModel === "function")
// //     ) {
// //       const loadFn = nsfwjs.loadFromTFModel || nsfwjs.loadFromTfModel;
// //       console.warn(
// //         "[sandbox][IDB] Wrapping tfModel with nsfwjs.loadFromTFModel()"
// //       );
// //       return await loadFn(tfModel, { size: 224 });
// //     }

// //     console.warn(
// //       "[sandbox][IDB] nsfwjs.loadFromTFModel not available; cannot wrap tf model. Returning null."
// //     );
// //     return null;
// //   } catch (e) {
// //     console.warn("[sandbox][IDB] Failed to load model from IndexedDB:", e);
// //     return null;
// //   }
// // }

// // async function loadAndCacheModel() {
// //   console.warn("[sandbox][Load] Loading model from bundle and caching…");

// //   const basePath = modelUrl.replace(/model\.json$/, "");
// //   console.warn("[sandbox][Load] Base path:", basePath);

// //   const tfModel = await tf.loadLayersModel(modelUrl);
// //   const m = await nsfwjs.loadFromTFModel(tfModel, { size: 224 });
// //   console.warn("[sandbox][Load] nsfwjs.load() finished");

// //   try {
// //     // if (navigator.storage && navigator.storage.persist) {
// //     //   const granted = await navigator.storage.persist();
// //     //   console.warn(
// //     //     granted
// //     //       ? "[Persist] Persistent storage granted"
// //     //       : "[Persist] Storage may not persist"
// //     //   );
// //     // }
// //     await m.model.save(MODEL_IDB_KEY);
// //     console.warn("[sandbox][Load] Saved model to IndexedDB:", MODEL_IDB_KEY);
// //   } catch (e) {
// //     console.error("[sandbox][Load] Could not save model to IndexedDB:", e);
// //   }
// //   return m;
// // }

// // async function loadAndCacheModel() {
// //   console.warn("[sandbox][Load] Loading model from URL...");

// //   const basePath = modelUrl.replace(/model\.json$/, "");
// //   console.warn("modelUrl", modelUrl, "basePath", basePath);

// //   try {
// //     const tfModel = await tf.loadLayersModel(modelUrl);
// //     console.warn("[sandbox][Load ✅] Model loaded from URL.");

// //     // ✅ Send model artifacts to parent (content script)
// //     try {
// //       const saveHandler = {
// //         save: async (artifacts) => {
// //           window.parent.postMessage(
// //             {
// //               type: "MODEL_SAVED",
// //               modelArtifacts: {
// //                 modelTopology: artifacts.modelTopology,
// //                 weightSpecs: artifacts.weightSpecs,
// //                 weightData: artifacts.weightData,
// //               },
// //             },
// //             "*"
// //           );

// //           return {
// //             modelArtifactsInfo: {
// //               dateSaved: new Date(),
// //               modelTopologyType: "JSON",
// //               modelTopologyBytes: artifacts.modelTopology
// //                 ? new TextEncoder().encode(
// //                     JSON.stringify(artifacts.modelTopology)
// //                   ).length
// //                 : 0,
// //               weightDataBytes: artifacts.weightData?.byteLength || 0,
// //             },
// //           };
// //         },
// //       };

// //       await tfModel.save(tf.io.withSaveHandler(saveHandler));

// //       console.warn("[sandbox][Save ✅] Model artifacts sent to parent.");
// //     } catch (e) {
// //       console.warn("[sandbox][Save ❌] Could not send model to parent:", e);
// //     }

// //     // ✅ Wrap the tf.Model in NSFWJS
// //     const nsfwModel = await (nsfwjs.loadFromTFModel || nsfwjs.load)(tfModel, {
// //       size: 224,
// //     });
// //     return nsfwModel;
// //   } catch (e) {
// //     console.error("[sandbox][Load ❌] Failed to load or cache model:", e);
// //     throw e;
// //   }
// // }
// async function loadAndCacheModel({ modelURL, wasmPath, modelArtifacts }) {
//   console.log("[sandbox][Load 🚀] Starting model load...");

//   await tf.setBackend("wasm");
//   await tf.ready();

//   if (wasmPath) {
//     console.log("[sandbox][WASM] Setting path:", wasmPath);
//     tf.env().set("WASM_PATH", wasmPath);
//   }

//   try {
//     let nsfwModel;
//     if (modelArtifacts) {
//       console.log(
//         "[sandbox][Load 📦] Loading model from memory (localStorage)"
//       );

//       const memoryHandler = {
//         load: async () => modelArtifacts,
//       };

//       // Ensure it's passed correctly
//       const handler = tf.io.fromMemory(memoryHandler);

//       nsfwModel = await nsfwjs.load(handler, { size: 224 });
//       console.log("[sandbox][Load ✅] Model loaded from memory.");
//     } else {
//       console.log("[sandbox][Load 🌐] Loading model from URL:", modelURL);
//       nsfwModel = await nsfwjs.load(modelURL, { size: 224 });
//       console.log("[sandbox][Load ✅] Model loaded from URL.");

//       // Try to cache it by extracting artifacts and sending to parent
//       try {
//         const model = await tf.loadLayersModel(modelURL);
//         const saveResult = await model.save({
//           async save() {
//             const artifacts = {
//               modelTopology: model.toJSON(null, false),
//               weightData: await model
//                 .getWeights()[0]
//                 .tensor.data()
//                 .then(() =>
//                   model.getWeights().length === 1
//                     ? model
//                         .getWeights()[0]
//                         .tensor.buffer()
//                         .then((b) => b.values.buffer)
//                     : null
//                 ),
//               weightSpecs: model
//                 .getWeights()
//                 .map((w) => w.getWeightsManifestEntry()),
//             };

//             // Send it to the content script
//             window.parent.postMessage(
//               { type: "CACHED_MODEL_ARTIFACTS", payload: artifacts },
//               "*"
//             );
//             return { modelArtifacts: artifacts };
//           },
//         });
//         console.log("[sandbox][Save ✅] Model sent to parent for caching.");
//       } catch (e) {
//         console.warn("[sandbox][Save ❌] Could not send model to parent:", e);
//       }
//     }

//     return nsfwModel;
//   } catch (error) {
//     console.error("[sandbox][Load ❌] Failed to load or cache model:", error);
//     throw error;
//   }
// }

// window.addEventListener("message", async (event) => {
//   const type = event.data?.type;
//   if (!type) return;

//   switch (type) {
//     // case "INIT_SANDBOX":
//     //   modelUrl = event.data.modelUrl;
//     //   wasm = event.data.wasm;
//     //   modelReady = !!event.data.modelReady;
//     //   console.warn("[sandbox][Message] INIT_SANDBOX", {
//     //     modelUrl,
//     //     wasm,
//     //     modelReady,
//     //   });
//     //   initializeNSFWDetection();
//     //   break;

//     // case "CLASSIFY_IMAGE":
//     //   // console.warn("[sandbox][Message] CLASSIFY_IMAGE received");
//     //   handleClassificationRequest(event);
//     //   break;

//     // default:
//     //   console.warn("[sandbox][Message] Unknown event type:", type);
//     case "INIT_SANDBOX":
//       modelUrl = event.data.modelUrl;
//       wasm = event.data.wasm;
//       modelReady = !!event.data.modelReady;

//       if (event.data.modelArtifacts) {
//         console.warn("[sandbox] Received model artifacts from content script");
//         await loadModelFromMemory(event.data.modelArtifacts);
//       } else {
//         await initializeNSFWDetection();
//       }
//       break;

//     case "CLASSIFY_IMAGE":
//       handleClassificationRequest(event);
//       break;

//     default:
//       console.warn("[sandbox][Message] Unknown event type:", type);
//   }
// });
// async function loadModelFromMemory(modelArtifacts) {
//   try {
//     // ✅ Ensure WASM backend is used and ready
//     await tf.setBackend("wasm");
//     await tf.ready();

//     // ✅ Validate model artifacts
//     const { modelTopology, weightSpecs, weightData } = modelArtifacts;
//     if (!modelTopology || !weightSpecs || !weightData) {
//       throw new Error("Invalid modelArtifacts: missing required fields");
//     }

//     // ✅ Log what we received
//     console.warn("[sandbox] Artifacts received:", {
//       topology: !!modelTopology,
//       specs: weightSpecs?.length,
//       dataType: Object.prototype.toString.call(weightData),
//     });

//     // ✅ Normalize weightData
//     const normalizedWeightData =
//       weightData instanceof ArrayBuffer
//         ? weightData
//         : weightData?.buffer instanceof ArrayBuffer
//         ? weightData.buffer
//         : new Uint8Array(weightData).buffer;

//     // ✅ Create fromMemory IOHandler
//     const handler = tf.io.fromMemory({
//       modelTopology,
//       weightSpecs,
//       weightData: normalizedWeightData,
//     });

//     // ✅ Load tf.Model
//     const tfModel = await tf.loadLayersModel(handler);
//     console.log("[sandbox][Load ✅] Model loaded from memory.");

//     // ✅ Load NSFWJS using either method
//     const loadFn = nsfwjs.loadFromTFModel || nsfwjs.load;
//     model = await loadFn(tfModel, { size: 224 });

//     console.log("[sandbox][NSFWJS ✅] NSFW model initialized from memory.");
//     isInitialized = true;

//     // ✅ Notify parent
//     window.parent.postMessage({ type: "SANDBOX_READY" }, "*");
//   } catch (err) {
//     console.error("[sandbox][Init ❌] Model load from memory failed:", err);
//     window.parent.postMessage({
//       type: "SANDBOX_INIT_ERROR",
//       error: err.message,
//     });
//   }
// }

// async function handleClassificationRequest(event) {
//   if (!isInitialized || event.data?.type !== "CLASSIFY_IMAGE") {
//     // console.warn(
//     //   "[sandbox][Classify] Ignoring classification (initialized? ->",
//     //   isInitialized,
//     //   ", type ->",
//     //   event.data?.type,
//     //   ")"
//     // );
//     return;
//   }

//   try {
//     const { src: imageSrc } = event.data;
//     // console.warn("[sandbox][Classify] Received image:", imageSrc);

//     const img = new Image();
//     img.decoding = "async";
//     img.crossOrigin = "anonymous";
//     img.src = imageSrc;

//     await new Promise((resolve, reject) => {
//       img.onload = () => {
//         // console.warn("[sandbox][Classify] Image loaded ✅");
//         resolve();
//       };
//       img.onerror = () => {
//         console.warn("[sandbox][Classify] Image load failed");
//         reject(new Error("Image load failed"));
//       };
//     });

//     // console.warn("[sandbox][Classify] Running model.classify()…");
//     const predictions = await model.classify(img);
//     console.warn("[sandbox][Classify] Predictions:", predictions);

//     window.parent.postMessage(
//       {
//         type: "RESULT",
//         predictions,
//         src: imageSrc,
//         timestamp: Date.now(),
//       },
//       "*"
//     );
//   } catch (err) {
//     console.error("[sandbox][Classify ❌] Classification error:", err);
//     window.parent.postMessage(
//       {
//         type: "CLASSIFICATION_ERROR",
//         error: err.message,
//         src: event.data?.src,
//       },
//       "*"
//     );
//   }
// }console.warn("✅ [sandbox] sandbox.js is running!");

// let model;
// let isInitialized = false;
// let modelUrl = null;
// let wasm = null;
// let modelReady = false;

// async function initializeNSFWDetection() {
//   if (isInitialized) {
//     console.warn(
//       "[sandbox][Init] Model already initialized — skipping re-init"
//     );
//     return;
//   }

//   try {
//     console.warn("[sandbox][Init] NSFW detection initialization...");

//     if (!tf || !tf.setBackend) {
//       throw new Error("[sandbox][Init] TensorFlow.js not loaded");
//     }

//     if (tf.wasm && typeof tf.wasm.setWasmPaths === "function") {
//       tf.wasm.setWasmPaths(wasm);
//     }

//     tf.env().set("WASM_HAS_MULTITHREAD_SUPPORT", true);
//     tf.env().set("WASM_HAS_SIMD_SUPPORT", true);

//     await tf.setBackend("wasm");
//     await tf.ready();
//     console.warn("[sandbox][Init] tf backend ready (wasm)");

//     model = await loadAndCacheModel({ modelURL: modelUrl });
//     isInitialized = true;

//     window.parent.postMessage({ type: "SANDBOX_READY" }, "*");
//   } catch (err) {
//     console.error("[sandbox][Init ❌] Initialization failed:", err);
//     window.parent.postMessage(
//       {
//         type: "SANDBOX_INIT_ERROR",
//         error: err.message,
//       },
//       "*"
//     );
//   }
// }

// async function loadAndCacheModel({ modelURL, modelArtifacts = null }) {
//   try {
//     if (modelArtifacts) {
//       console.warn("[sandbox][Load] Loading from memory artifacts…");

//       const handler = tf.io.fromMemory({
//         modelTopology: modelArtifacts.modelTopology,
//         weightSpecs: modelArtifacts.weightSpecs,
//         weightData:
//           modelArtifacts.weightData instanceof ArrayBuffer
//             ? modelArtifacts.weightData
//             : new Uint8Array(modelArtifacts.weightData).buffer,
//       });

//       const tfModel = await tf.loadLayersModel(handler);
//       console.warn("[sandbox][Load ✅] Model loaded from memory");

//       return await (nsfwjs.loadFromTFModel || nsfwjs.load)(tfModel, {
//         size: 224,
//       });
//     }

//     console.warn("[sandbox][Load] Loading from URL:", modelURL);
//     const tfModel = await tf.loadLayersModel(modelURL);

//     // Create a proper IOHandler with both save and load methods
//     const customHandler = {
//       async save(artifacts) {
//         try {
//           // Send model artifacts to parent
//           window.parent.postMessage(
//             {
//               type: "MODEL_SAVED",
//               modelArtifacts: {
//                 modelTopology: artifacts.modelTopology,
//                 weightSpecs: artifacts.weightSpecs,
//                 weightData: artifacts.weightData,
//               },
//             },
//             "*"
//           );

//           console.warn("[sandbox][Save ✅] Model artifacts sent to parent");

//           return {
//             modelArtifactsInfo: {
//               dateSaved: new Date(),
//               modelTopologyType: "JSON",
//               modelTopologyBytes: artifacts.modelTopology
//                 ? new TextEncoder().encode(
//                     JSON.stringify(artifacts.modelTopology)
//                   ).length
//                 : 0,
//               weightDataBytes: artifacts.weightData?.byteLength || 0,
//             },
//           };
//         } catch (error) {
//           console.error("[sandbox][Save ❌] Failed to save artifacts:", error);
//           throw error;
//         }
//       },

//       // Add the missing load method (required by TensorFlow.js IOHandler interface)
//       async load() {
//         throw new Error("Load method not implemented for this handler");
//       },
//     };

//     // Try to save model artifacts (but don't let it block the main flow)
//     try {
//       await tfModel.save(customHandler);
//     } catch (saveError) {
//       console.warn("[sandbox][Save ❌] Failed to send artifacts:", saveError);
//       // Continue without saving - this is not critical for model usage
//     }

//     return await (nsfwjs.loadFromTFModel || nsfwjs.load)(tfModel, {
//       size: 224,
//     });
//   } catch (e) {
//     console.error("[sandbox][Load ❌] Model load failed:", e);
//     throw e;
//   }
// }

// async function loadModelFromMemory(modelArtifacts) {
//   try {
//     await tf.setBackend("wasm");
//     await tf.ready();

//     const { modelTopology, weightSpecs, weightData } = modelArtifacts;
//     if (!modelTopology || !weightSpecs || !weightData) {
//       throw new Error("Invalid modelArtifacts: missing fields");
//     }

//     const handler = tf.io.fromMemory({
//       modelTopology,
//       weightSpecs,
//       weightData:
//         weightData instanceof ArrayBuffer
//           ? weightData
//           : new Uint8Array(weightData).buffer,
//     });

//     const tfModel = await tf.loadLayersModel(handler);
//     model = await (nsfwjs.loadFromTFModel || nsfwjs.load)(tfModel, {
//       size: 224,
//     });

//     isInitialized = true;
//     console.warn("[sandbox][Init ✅] Model loaded from memory artifacts");
//     window.parent.postMessage({ type: "SANDBOX_READY" }, "*");
//   } catch (err) {
//     console.error("[sandbox][Init ❌] loadModelFromMemory failed:", err);
//     window.parent.postMessage(
//       {
//         type: "SANDBOX_INIT_ERROR",
//         error: err.message,
//       },
//       "*"
//     );
//   }
// }

// async function handleClassificationRequest(event) {
//   if (!isInitialized || event.data?.type !== "CLASSIFY_IMAGE") return;

//   try {
//     const { src: imageSrc } = event.data;

//     const img = new Image();
//     img.decoding = "async";
//     img.crossOrigin = "anonymous";
//     img.src = imageSrc;

//     await new Promise((resolve, reject) => {
//       const timeout = setTimeout(() => {
//         reject(new Error("Image load timeout"));
//       }, 10000); // 10 second timeout

//       img.onload = () => {
//         clearTimeout(timeout);
//         resolve();
//       };

//       img.onerror = (error) => {
//         clearTimeout(timeout);
//         reject(
//           new Error(`Image load failed: ${error.message || "Unknown error"}`)
//         );
//       };
//     });

//     const predictions = await model.classify(img);
//     window.parent.postMessage(
//       {
//         type: "RESULT",
//         predictions,
//         src: imageSrc,
//         timestamp: Date.now(),
//       },
//       "*"
//     );
//   } catch (err) {
//     console.error("[sandbox][Classify ❌]", err);
//     window.parent.postMessage(
//       {
//         type: "CLASSIFICATION_ERROR",
//         error: err.message,
//         src: event.data?.src,
//       },
//       "*"
//     );
//   }
// }

// // Enhanced message handler with better error handling
// window.addEventListener("message", async (event) => {
//   try {
//     const { type } = event.data || {};
//     if (!type) return;

//     switch (type) {
//       case "INIT_SANDBOX":
//         modelUrl = event.data.modelUrl;
//         wasm = event.data.wasm;
//         modelReady = !!event.data.modelReady;

//         console.warn("[sandbox][Init] Received init message:", {
//           modelUrl,
//           wasm,
//           modelReady,
//           hasArtifacts: !!event.data.modelArtifacts,
//         });

//         if (event.data.modelArtifacts) {
//           await loadModelFromMemory(event.data.modelArtifacts);
//         } else {
//           await initializeNSFWDetection();
//         }
//         break;

//       case "CLASSIFY_IMAGE":
//         await handleClassificationRequest(event);
//         break;

//       default:
//         console.warn("[sandbox][Message] Unknown type:", type);
//     }
//   } catch (error) {
//     console.error("[sandbox][Message] Error handling message:", error);
//     window.parent.postMessage(
//       {
//         type: "SANDBOX_ERROR",
//         error: error.message,
//       },
//       "*"
//     );
//   }
// });

// // Add some debugging info
// console.warn("[sandbox] Sandbox script loaded. Waiting for init message...");
// console.warn("[sandbox] Available globals:", {
//   tf: typeof tf,
//   nsfwjs: typeof nsfwjs,
// });

let model;
let isInitialized = false;
let modelUrl = null;
let wasm = null;
let modelReady = false;

async function initializeNSFWDetection() {
  if (isInitialized) {
    console.warn(
      "[sandbox][Init] Model already initialized — skipping re-init",
    );
    return;
  }

  try {
    console.warn("[sandbox][Init] NSFW detection initialization...");

    if (!tf || !tf.setBackend) {
      throw new Error("[sandbox][Init] TensorFlow.js not loaded");
    }

    if (tf.wasm && typeof tf.wasm.setWasmPaths === "function") {
      tf.wasm.setWasmPaths(wasm);
    }

    tf.env().set("WASM_HAS_MULTITHREAD_SUPPORT", true);
    tf.env().set("WASM_HAS_SIMD_SUPPORT", true);

    await tf.setBackend("wasm");
    await tf.ready();
    console.warn("[sandbox][Init] tf backend ready (wasm)");

    model = await loadAndCacheModel(modelUrl);
    isInitialized = true;

    window.parent.postMessage({ type: "SANDBOX_READY" }, "*");
  } catch (err) {
    console.error("[sandbox][Init ❌] Initialization failed:", err);
    window.parent.postMessage(
      {
        type: "SANDBOX_INIT_ERROR",
        error: err.message,
      },
      "*",
    );
  }
}

async function loadAndCacheModel(modelURL) {
  try {
    console.warn("[sandbox][Load] Loading from URL:", modelURL);
    const basePath = modelUrl.replace(/model\.json$/, "");

    const nsfwModel = await nsfwjs.load(basePath, { size: 224 });

    console.log("nsfwmodel", nsfwModel);

    // model is already loaded; now extract and send artifacts
    const artifacts = await nsfwModel.model.save(
      tf.io.withSaveHandler(async (modelArtifacts) => {
        window.parent.postMessage(
          {
            type: "MODEL_SAVED",
            modelArtifacts: {
              modelTopology: modelArtifacts.modelTopology,
              weightSpecs: modelArtifacts.weightSpecs,
              weightData: modelArtifacts.weightData,
            },
          },
          "*",
        );

        return {
          modelArtifactsInfo: {
            dateSaved: new Date(),
            modelTopologyType: "JSON",
            modelTopologyBytes: modelArtifacts.modelTopology
              ? new TextEncoder().encode(
                  JSON.stringify(modelArtifacts.modelTopology),
                ).length
              : 0,
            weightDataBytes: modelArtifacts.weightData?.byteLength || 0,
          },
        };
      }),
    );

    console.warn("[sandbox][Save ✅] Model artifacts sent to parent");
    return nsfwModel;
  } catch (e) {
    console.error("[sandbox][Load ❌] Model load failed:", e);
    throw e;
  }
}

async function loadModelFromMemory(modelArtifacts) {
  try {
    await tf.setBackend("wasm");
    await tf.ready();
    console.log(modelArtifacts);
    const { modelTopology, weightSpecs, weightData } = modelArtifacts;
    if (!modelTopology || !weightSpecs || !weightData) {
      throw new Error("Invalid modelArtifacts: missing fields");
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

    // const tfModel = await tf.loadLayersModel(handler);
    // model = await nsfwjs.load(tfModel, { size: 224 });
    // model = await nsfwjs.loadFromMemory(tfModel, { size: 224 });

    model = await nsfwjs.load(handler, { size: 224 });
    isInitialized = true;
    console.warn("[sandbox][Init ✅] Model loaded from memory artifacts");
    window.parent.postMessage({ type: "SANDBOX_READY" }, "*");
  } catch (err) {
    console.error("[sandbox][Init ❌] loadModelFromMemory failed:", err);
    window.parent.postMessage(
      {
        type: "SANDBOX_INIT_ERROR",
        error: err.message,
      },
      "*",
    );
  }
}

// async function handleClassificationRequest(event) {
//   if (!isInitialized || event.data?.type !== "CLASSIFY_IMAGE") return;

//   try {
//     const { src: imageSrc } = event.data;

//     const img = new Image();
//     img.decoding = "async";
//     img.crossOrigin = "anonymous";
//     img.src = imageSrc;

//     await new Promise((resolve, reject) => {
//       const timeout = setTimeout(() => {
//         reject(new Error("Image load timeout"));
//       }, 10000);

//       img.onload = () => {
//         clearTimeout(timeout);
//         resolve();
//       };

//       img.onerror = (error) => {
//         clearTimeout(timeout);
//         reject(
//           new Error(`Image load failed: ${error.message || "Unknown error"}`)
//         );
//       };
//     });

//     const predictions = await model.classify(img);
//     window.parent.postMessage(
//       {
//         type: "RESULT",
//         predictions,
//         src: imageSrc,
//         timestamp: Date.now(),
//       },
//       "*"
//     );
//   } catch (err) {
//     console.error("[sandbox][Classify ❌]", err);
//     window.parent.postMessage(
//       {
//         type: "CLASSIFICATION_ERROR",
//         error: err.message,
//         src: event.data?.src,
//       },
//       "*"
//     );
//   }
// }

async function handleClassificationRequest(event) {
  if (!isInitialized || event.data?.type !== "CLASSIFY_IMAGE") return;

  try {
    const { src: imageSrc } = event.data;
    console.warn("[sandbox] Classification requested for:", imageSrc);

    // Load image (same approach)
    const img = new Image();
    img.decoding = "async";
    img.crossOrigin = "anonymous";
    img.src = imageSrc;

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Image load timeout"));
      }, 10000);

      img.onload = () => {
        clearTimeout(timeout);
        console.warn("[sandbox] Image loaded successfully:", imageSrc);
        resolve();
      };

      img.onerror = (error) => {
        clearTimeout(timeout);
        console.warn(
          "[sandbox] Image failed to load:",
          imageSrc,
          error.message || "Unknown error",
        );
        reject(
          new Error(`Image load failed: ${error.message || "Unknown error"}`),
        );
      };
    });

    // Resize onto an offscreen canvas (224x224) BEFORE classifying
    // This reduces memory and speeds up model inference
    const TARGET = 224;
    let canvas;
    if (typeof OffscreenCanvas !== "undefined") {
      console.warn("[sandbox] OffscreenCanvas supported, using it.");
      canvas = new OffscreenCanvas(TARGET, TARGET);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, TARGET, TARGET);

      let input = canvas;
      if (typeof canvas.transferToImageBitmap === "function") {
        console.warn(
          "[sandbox] OffscreenCanvas.transferToImageBitmap() supported, converting.",
        );
        input = canvas.transferToImageBitmap();
      } else {
        console.warn(
          "[sandbox] OffscreenCanvas.transferToImageBitmap() NOT supported, using canvas directly.",
        );
      }

      const predictions = await model.classify(input);
      console.warn(
        "[sandbox] Classification done, sending results.",
        predictions,
      );
      window.parent.postMessage(
        {
          type: "RESULT",
          predictions,
          src: imageSrc,
          timestamp: Date.now(),
        },
        "*",
      );
    } else {
      console.warn(
        "[sandbox] OffscreenCanvas NOT supported, using fallback canvas.",
      );
      canvas = document.createElement("canvas");
      canvas.width = TARGET;
      canvas.height = TARGET;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, TARGET, TARGET);

      const predictions = await model.classify(canvas);
      console.warn(
        "[sandbox] Classification done (fallback), sending results.",
        predictions,
      );
      window.parent.postMessage(
        {
          type: "RESULT",
          predictions,
          src: imageSrc,
          timestamp: Date.now(),
        },
        "*",
      );
    }
  } catch (err) {
    console.error("[sandbox][Classify ❌]", err);
    window.parent.postMessage(
      {
        type: "CLASSIFICATION_ERROR",
        error: err.message,
        src: event.data?.src,
      },
      "*",
    );
  }
}

window.addEventListener("message", async (event) => {
  try {
    const { type } = event.data || {};
    if (!type) return;

    switch (type) {
      case "INIT_SANDBOX":
        modelUrl = event.data.modelUrl;
        wasm = event.data.wasm;
        modelReady = !!event.data.modelReady;

        console.warn("[sandbox][Init] Received init message:", {
          modelUrl,
          wasm,
          modelReady,
          hasArtifacts: !!event.data.modelArtifacts,
        });
        console.log(event.data.modelArtifacts);

        if (event.data.modelArtifacts) {
          await loadModelFromMemory(event.data.modelArtifacts);
        } else {
          await initializeNSFWDetection();
        }
        break;

      case "CLASSIFY_IMAGE":
        await handleClassificationRequest(event);
        break;

      default:
        console.warn("[sandbox][Message] Unknown type:", type);
    }
  } catch (error) {
    console.error("[sandbox][Message] Error handling message:", error);
    window.parent.postMessage(
      {
        type: "SANDBOX_ERROR",
        error: error.message,
      },
      "*",
    );
  }
});

console.warn("[sandbox] Sandbox script loaded. Waiting for init message...");
console.warn("[sandbox] Available globals:", {
  tf: typeof tf,
  nsfwjs: typeof nsfwjs,
});
// async function loadAndCacheModel(modelURL) {
//   try {
//     console.warn("[sandbox][Load] Loading from URL:", modelURL);
//     const basePath = modelUrl.replace(/model\.json$/, "");
//     const tfModel = await tf.loadLayersModel(modelURL);

//     // Extract and send model artifacts to parent
//     try {
//       const artifacts = await tfModel.save(
//         tf.io.withSaveHandler(async (modelArtifacts) => {
//           window.parent.postMessage(
//             {
//               type: "MODEL_SAVED",
//               modelArtifacts: {
//                 modelTopology: modelArtifacts.modelTopology,
//                 weightSpecs: modelArtifacts.weightSpecs,
//                 weightData: modelArtifacts.weightData,
//               },
//             },
//             "*"
//           );

//           return {
//             modelArtifactsInfo: {
//               dateSaved: new Date(),
//               modelTopologyType: "JSON",
//               modelTopologyBytes: modelArtifacts.modelTopology
//                 ? new TextEncoder().encode(
//                     JSON.stringify(modelArtifacts.modelTopology)
//                   ).length
//                 : 0,
//               weightDataBytes: modelArtifacts.weightData?.byteLength || 0,
//             },
//           };
//         })
//       );

//       console.warn("[sandbox][Save ✅] Model artifacts sent to parent");
//     } catch (e) {
//       console.warn("[sandbox][Save ❌] Failed to send artifacts:", e);
//     }

//     return await nsfwjs.load(basePath, { size: 224 });
//   } catch (e) {
//     console.error("[sandbox][Load ❌] Model load failed:", e);
//     throw e;
//   }
// }
