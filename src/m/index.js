// import * as tf from "./tf.es2017.js";

// // import { Buffer } from "buffer/";
// import { NSFW_CLASSES } from "./nsfw_classes.js";

// const availableModels = {
//   MobileNetV2: { numOfWeightBundles: 1 },
//   MobileNetV2Mid: {
//     numOfWeightBundles: 2,
//     options: { type: "graph" },
//   },
//   InceptionV3: {
//     numOfWeightBundles: 6,
//     options: { size: 299 },
//   },
// };
// const DEFAULT_MODEL_NAME = "MobileNetV2";
// const IMAGE_SIZE = 224;
// const getGlobal = () => {
//   if (typeof globalThis !== "undefined") return globalThis;
//   if (typeof global !== "undefined") return global;
//   if (typeof window !== "undefined") return window;
//   if (typeof self !== "undefined") return self;
//   throw new Error("Unable to locate global object");
// };
// function isModelName(name) {
//   return !!name && name in availableModels;
// }
// // const getModelJson = async (modelName) => {
// //   const globalModel = getGlobal().model;
// //   if (globalModel) {
// //     return globalModel;
// //   }
// //   let modelJson;
// //   if (modelName === "MobileNetV2")
// //     ({ modelJson } = await import("./model_imports/mobilenet_v2.js"));
// //   else if (modelName === "MobileNetV2Mid")
// //     ({ modelJson } = await import("./model_imports/mobilenet_v2_mid.js"));
// //   else if (modelName === "InceptionV3")
// //     ({ modelJson } = await import("./model_imports/inception_v3.js"));
// //   return (await modelJson()).default;
// // };
// // const getWeightData = async (modelName) => {
// //   const { numOfWeightBundles } = availableModels[modelName];
// //   const bundles = [];
// //   for (let i = 0; i < numOfWeightBundles; i++) {
// //     const bundleName = `group1-shard${i + 1}of${numOfWeightBundles}`;
// //     const identifier = bundleName.replace(/-/g, "_");
// //     const globalWeight = getGlobal()[identifier];
// //     if (globalWeight) {
// //       bundles.push({ [bundleName]: globalWeight });
// //     } else {
// //       let weightBundles;
// //       if (modelName === "MobileNetV2")
// //         ({ weightBundles } = await import("./model_imports/mobilenet_v2.js"));
// //       else if (modelName === "MobileNetV2Mid")
// //         ({ weightBundles } = await import(
// //           "./model_imports/mobilenet_v2_mid.js"
// //         ));
// //       else if (modelName === "InceptionV3")
// //         ({ weightBundles } = await import("./model_imports/inception_v3.js"));
// //       const weight = (await weightBundles[i]()).default;
// //       bundles.push({ [bundleName]: weight });
// //     }
// //   }
// //   return Object.assign({}, ...bundles);
// // };
// async function loadWeights(modelName) {
//   try {
//     const weightDataBundles = await getWeightData(modelName);
//     return weightDataBundles;
//   } catch (_a) {
//     throw new Error(
//       `Could not load the weight data. Make sure you are importing the correct shard files from the models directory. Ref: https://github.com/infinitered/nsfwjs?tab=readme-ov-file#browserify`
//     );
//   }
// }
// // async function loadModel(modelName) {
// //   if (!isModelName(modelName)) return modelName;
// //   try {
// //     const modelJson = await getModelJson(modelName);
// //     const weightData = await loadWeights(modelName);
// //     const handler = new JSONHandler(modelJson, weightData);
// //     return handler;
// //   } catch (_a) {
// //     throw new Error(
// //       `Could not load the model. Make sure you are importing the model.min.js bundle. Ref: https://github.com/infinitered/nsfwjs?tab=readme-ov-file#browserify`
// //     );
// //   }
// // }
// // export async function load(modelOrUrl, options = { size: IMAGE_SIZE }) {
// //   var _a;
// //   if (tf == null) {
// //     throw new Error(
// //       `Cannot find TensorFlow.js. If you are using a <script> tag, please ` +
// //         `also include @tensorflow/tfjs on the page before using this model.`
// //     );
// //   }
// //   if (modelOrUrl === undefined) {
// //     modelOrUrl = DEFAULT_MODEL_NAME;
// //     console.info(
// //       `%cBy not specifying 'modelOrUrl' parameter, you're using the default model: '${modelOrUrl}'. See NSFWJS docs for instructions on hosting your own model (https://github.com/infinitered/nsfwjs?tab=readme-ov-file#host-your-own-model).`,
// //       "color: lightblue"
// //     );
// //   } else if (isModelName(modelOrUrl)) {
// //     console.info(
// //       `%cYou're using the model: '${modelOrUrl}'. See NSFWJS docs for instructions on hosting your own model (https://github.com/infinitered/nsfwjs?tab=readme-ov-file#host-your-own-model).`,
// //       "color: lightblue"
// //     );
// //     options =
// //       (_a = availableModels[modelOrUrl].options) !== null && _a !== void 0
// //         ? _a
// //         : options;
// //   }
// //   options.size =
// //     (options === null || options === void 0 ? void 0 : options.size) ||
// //     IMAGE_SIZE;
// //   const modelUrlOrHandler = await loadModel(modelOrUrl);
// //   const nsfwnet = new NSFWJS(modelUrlOrHandler, options);
// //   await nsfwnet.load();
// //   return nsfwnet;
// // }

// async function loadModel(modelNameOrUrl) {
//   if (typeof modelNameOrUrl === "string" && modelNameOrUrl.endsWith(".json")) {
//     // If it's a URL, just return it
//     return modelNameOrUrl;
//   }
//   throw new Error(
//     `You must pass a model URL. Default model names are no longer supported.`
//   );
// }
// export async function load(modelOrUrl, options = { size: IMAGE_SIZE }) {
//   const isUrl = typeof modelOrUrl === "string" && modelOrUrl.endsWith(".json");

//   if (tf == null) {
//     throw new Error(`Cannot find TensorFlow.js.`);
//   }

//   if (modelOrUrl === undefined) {
//     modelOrUrl = DEFAULT_MODEL_NAME;
//   }

//   let modelUrlOrHandler;
//   if (isUrl) {
//     // ✅ If we pass a URL, just use it directly
//     modelUrlOrHandler = modelOrUrl;
//   } else if (isModelName(modelOrUrl)) {
//     // ✅ If it is a known model, use existing logic
//     options = availableModels[modelOrUrl]?.options ?? options;
//     modelUrlOrHandler = await loadModel(modelOrUrl);
//   } else {
//     throw new Error(`Unknown model name or invalid URL: ${modelOrUrl}`);
//   }

//   const nsfwnet = new NSFWJS(modelUrlOrHandler, options);
//   await nsfwnet.load();
//   return nsfwnet;
// }

// class JSONHandler {
//   constructor(modelJson, weightDataBase64) {
//     this.modelJson = modelJson;
//     this.weightDataBase64 = weightDataBase64;
//   }
//   arrayBufferFromBase64(base64) {
//     const binaryString = Buffer.from(base64, "base64").toString("binary");
//     const len = binaryString.length;
//     const bytes = new Uint8Array(len);
//     for (let i = 0; i < len; i++) {
//       bytes[i] = binaryString.charCodeAt(i);
//     }
//     return bytes.buffer;
//   }
//   async load() {
//     const modelArtifacts = {
//       modelTopology: this.modelJson.modelTopology,
//       format: this.modelJson.format,
//       generatedBy: this.modelJson.generatedBy,
//       convertedBy: this.modelJson.convertedBy,
//     };
//     if (this.modelJson.weightsManifest != null) {
//       const weightSpecs = [];
//       const weightData = [];
//       for (const group of this.modelJson.weightsManifest) {
//         for (const path of group.paths) {
//           const base64 = this.weightDataBase64[path];
//           if (!base64) {
//             throw new Error(
//               `Could not find the weight data. Make sure you are importing the correct weight bundle for the model: ${path}.min.js.`
//             );
//           }
//           const buffer = this.arrayBufferFromBase64(base64);
//           weightData.push(new Uint8Array(buffer));
//         }
//         weightSpecs.push(...group.weights);
//       }
//       modelArtifacts.weightSpecs = weightSpecs;
//       const weightDataConcat = new Uint8Array(
//         weightData.reduce((a, b) => a + b.length, 0)
//       );
//       let offset = 0;
//       for (let i = 0; i < weightData.length; i++) {
//         weightDataConcat.set(weightData[i], offset);
//         offset += weightData[i].byteLength;
//       }
//       modelArtifacts.weightData = weightDataConcat.buffer;
//     }
//     if (this.modelJson.trainingConfig != null) {
//       modelArtifacts.trainingConfig = this.modelJson.trainingConfig;
//     }
//     if (this.modelJson.userDefinedMetadata != null) {
//       modelArtifacts.userDefinedMetadata = this.modelJson.userDefinedMetadata;
//     }
//     return modelArtifacts;
//   }
// }
// export class NSFWJS {
//   constructor(modelUrlOrIOHandler, options) {
//     this.intermediateModels = {};
//     this.options = options;
//     this.normalizationOffset = tf.scalar(255);
//     this.urlOrIOHandler = modelUrlOrIOHandler;
//     // if (
//     //   typeof modelUrlOrIOHandler === "string" &&
//     //   !modelUrlOrIOHandler.startsWith("indexeddb://") &&
//     //   !modelUrlOrIOHandler.startsWith("localstorage://") &&
//     //   !modelUrlOrIOHandler.endsWith("model.json")
//     // ) {
//     //   this.urlOrIOHandler = `${modelUrlOrIOHandler}model.json`;
//     // } else {
//     //   this.urlOrIOHandler = modelUrlOrIOHandler;
//     // }
//   }
//   async load() {
//     const { size, type } = this.options;
//     if (type === "graph") {
//       this.model = await tf.loadGraphModel(this.urlOrIOHandler);
//     } else {
//       this.model = await tf.loadLayersModel(this.urlOrIOHandler);
//       this.endpoints = this.model.layers.map((l) => l.name);
//     }
//     const result = tf.tidy(() =>
//       this.model.predict(tf.zeros([1, size, size, 3]))
//     );
//     await result.data();
//     result.dispose();
//   }
//   infer(img, endpoint) {
//     if (endpoint != null && this.endpoints.indexOf(endpoint) === -1) {
//       throw new Error(
//         `Unknown endpoint ${endpoint}. Available endpoints: ${this.endpoints}.`
//       );
//     }
//     return tf.tidy(() => {
//       if (!(img instanceof tf.Tensor)) {
//         img = tf.browser.fromPixels(img);
//       }
//       const normalized = img.toFloat().div(this.normalizationOffset);
//       let resized = normalized;
//       const { size } = this.options;
//       if (img.shape[0] !== size || img.shape[1] !== size) {
//         const alignCorners = true;
//         resized = tf.image.resizeBilinear(
//           normalized,
//           [size, size],
//           alignCorners
//         );
//       }
//       const batched = resized.reshape([1, size, size, 3]);
//       let model;
//       if (endpoint == null) {
//         model = this.model;
//       } else {
//         if (
//           this.model.hasOwnProperty("layers") &&
//           this.intermediateModels[endpoint] == null
//         ) {
//           const layer = this.model.layers.find((l) => l.name === endpoint);
//           this.intermediateModels[endpoint] = tf.model({
//             inputs: this.model.inputs,
//             outputs: layer.output,
//           });
//         }
//         model = this.intermediateModels[endpoint];
//       }
//       return model.predict(batched);
//     });
//   }
//   async classify(img, topk = 5) {
//     const logits = this.infer(img);
//     const classes = await getTopKClasses(logits, topk);
//     logits.dispose();
//     return classes;
//   }
// }
// async function getTopKClasses(logits, topK) {
//   const values = await logits.data();
//   const valuesAndIndices = [];
//   for (let i = 0; i < values.length; i++) {
//     valuesAndIndices.push({ value: values[i], index: i });
//   }
//   valuesAndIndices.sort((a, b) => {
//     return b.value - a.value;
//   });
//   const topkValues = new Float32Array(topK);
//   const topkIndices = new Int32Array(topK);
//   for (let i = 0; i < topK; i++) {
//     topkValues[i] = valuesAndIndices[i].value;
//     topkIndices[i] = valuesAndIndices[i].index;
//   }
//   const topClassesAndProbs = [];
//   for (let i = 0; i < topkIndices.length; i++) {
//     topClassesAndProbs.push({
//       className: NSFW_CLASSES[topkIndices[i]],
//       probability: topkValues[i],
//     });
//   }
//   return topClassesAndProbs;
// // }
// // //# sourceMappingURL=index.js.map
// import * as tf from "@tensorflow/tfjs";
// // import { Buffer } from "buffer/";
// import { NSFW_CLASSES } from "./nsfw_classes.js";
// const availableModels = {
//   MobileNetV2: { numOfWeightBundles: 1 },
//   MobileNetV2Mid: {
//     numOfWeightBundles: 2,
//     options: { type: "graph" },
//   },
//   InceptionV3: {
//     numOfWeightBundles: 6,
//     options: { size: 299 },
//   },
// };
// const DEFAULT_MODEL_NAME = "MobileNetV2";
// const IMAGE_SIZE = 224;
// const getGlobal = () => {
//   if (typeof globalThis !== "undefined") return globalThis;
//   if (typeof global !== "undefined") return global;
//   if (typeof window !== "undefined") return window;
//   if (typeof self !== "undefined") return self;
//   throw new Error("Unable to locate global object");
// };
// function isModelName(name) {
//   return !!name && name in availableModels;
// }
// const getModelJson = async (modelName) => {
//   const globalModel = getGlobal().model;
//   if (globalModel) {
//     return globalModel;
//   }
//   let modelJson;
//   if (modelName === "MobileNetV2")
//     ({ modelJson } = await import("./model_imports/mobilenet_v2.js"));
//   else if (modelName === "MobileNetV2Mid")
//     ({ modelJson } = await import("./model_imports/mobilenet_v2_mid.js"));
//   else if (modelName === "InceptionV3")
//     ({ modelJson } = await import("./model_imports/inception_v3.js"));
//   return (await modelJson()).default;
// };
// const getWeightData = async (modelName) => {
//   const { numOfWeightBundles } = availableModels[modelName];
//   const bundles = [];
//   for (let i = 0; i < numOfWeightBundles; i++) {
//     const bundleName = `group1-shard${i + 1}of${numOfWeightBundles}`;
//     const identifier = bundleName.replace(/-/g, "_");
//     const globalWeight = getGlobal()[identifier];
//     if (globalWeight) {
//       bundles.push({ [bundleName]: globalWeight });
//     } else {
//       let weightBundles;
//       if (modelName === "MobileNetV2")
//         ({ weightBundles } = await import("./model_imports/mobilenet_v2.js"));
//       else if (modelName === "MobileNetV2Mid")
//         ({ weightBundles } = await import(
//           "./model_imports/mobilenet_v2_mid.js"
//         ));
//       else if (modelName === "InceptionV3")
//         ({ weightBundles } = await import("./model_imports/inception_v3.js"));
//       const weight = (await weightBundles[i]()).default;
//       bundles.push({ [bundleName]: weight });
//     }
//   }
//   return Object.assign({}, ...bundles);
// };
// async function loadWeights(modelName) {
//   try {
//     const weightDataBundles = await getWeightData(modelName);
//     return weightDataBundles;
//   } catch (_a) {
//     throw new Error(
//       `Could not load the weight data. Make sure you are importing the correct shard files from the models directory. Ref: https://github.com/infinitered/nsfwjs?tab=readme-ov-file#browserify`
//     );
//   }
// }
// async function loadModel(modelName) {
//   if (!isModelName(modelName)) return modelName;
//   try {
//     const modelJson = await getModelJson(modelName);
//     const weightData = await loadWeights(modelName);
//     const handler = new JSONHandler(modelJson, weightData);
//     return handler;
//   } catch (_a) {
//     throw new Error(
//       `Could not load the model. Make sure you are importing the model.min.js bundle. Ref: https://github.com/infinitered/nsfwjs?tab=readme-ov-file#browserify`
//     );
//   }
// }
// export async function load(modelOrUrl, options = { size: IMAGE_SIZE }) {
//   var _a;
//   if (tf == null) {
//     throw new Error(
//       `Cannot find TensorFlow.js. If you are using a <script> tag, please ` +
//         `also include @tensorflow/tfjs on the page before using this model.`
//     );
//   }
//   if (modelOrUrl === undefined) {
//     modelOrUrl = DEFAULT_MODEL_NAME;
//     console.info(
//       `%cBy not specifying 'modelOrUrl' parameter, you're using the default model: '${modelOrUrl}'. See NSFWJS docs for instructions on hosting your own model (https://github.com/infinitered/nsfwjs?tab=readme-ov-file#host-your-own-model).`,
//       "color: lightblue"
//     );
//   } else if (isModelName(modelOrUrl)) {
//     console.info(
//       `%cYou're using the model: '${modelOrUrl}'. See NSFWJS docs for instructions on hosting your own model (https://github.com/infinitered/nsfwjs?tab=readme-ov-file#host-your-own-model).`,
//       "color: lightblue"
//     );
//     options =
//       (_a = availableModels[modelOrUrl].options) !== null && _a !== void 0
//         ? _a
//         : options;
//   }
//   options.size =
//     (options === null || options === void 0 ? void 0 : options.size) ||
//     IMAGE_SIZE;
//   const modelUrlOrHandler = await loadModel(modelOrUrl);
//   const nsfwnet = new NSFWJS(modelUrlOrHandler, options);
//   await nsfwnet.load();
//   return nsfwnet;
// }
// class JSONHandler {
//   constructor(modelJson, weightDataBase64) {
//     this.modelJson = modelJson;
//     this.weightDataBase64 = weightDataBase64;
//   }
//   arrayBufferFromBase64(base64) {
//     const binaryString = Buffer.from(base64, "base64").toString("binary");
//     const len = binaryString.length;
//     const bytes = new Uint8Array(len);
//     for (let i = 0; i < len; i++) {
//       bytes[i] = binaryString.charCodeAt(i);
//     }
//     return bytes.buffer;
//   }
//   async load() {
//     const modelArtifacts = {
//       modelTopology: this.modelJson.modelTopology,
//       format: this.modelJson.format,
//       generatedBy: this.modelJson.generatedBy,
//       convertedBy: this.modelJson.convertedBy,
//     };
//     if (this.modelJson.weightsManifest != null) {
//       const weightSpecs = [];
//       const weightData = [];
//       for (const group of this.modelJson.weightsManifest) {
//         for (const path of group.paths) {
//           const base64 = this.weightDataBase64[path];
//           if (!base64) {
//             throw new Error(
//               `Could not find the weight data. Make sure you are importing the correct weight bundle for the model: ${path}.min.js.`
//             );
//           }
//           const buffer = this.arrayBufferFromBase64(base64);
//           weightData.push(new Uint8Array(buffer));
//         }
//         weightSpecs.push(...group.weights);
//       }
//       modelArtifacts.weightSpecs = weightSpecs;
//       const weightDataConcat = new Uint8Array(
//         weightData.reduce((a, b) => a + b.length, 0)
//       );
//       let offset = 0;
//       for (let i = 0; i < weightData.length; i++) {
//         weightDataConcat.set(weightData[i], offset);
//         offset += weightData[i].byteLength;
//       }
//       modelArtifacts.weightData = weightDataConcat.buffer;
//     }
//     if (this.modelJson.trainingConfig != null) {
//       modelArtifacts.trainingConfig = this.modelJson.trainingConfig;
//     }
//     if (this.modelJson.userDefinedMetadata != null) {
//       modelArtifacts.userDefinedMetadata = this.modelJson.userDefinedMetadata;
//     }
//     return modelArtifacts;
//   }
// }
// export class NSFWJS {
//   constructor(modelUrlOrIOHandler, options) {
//     this.intermediateModels = {};
//     this.options = options;
//     this.normalizationOffset = tf.scalar(255);
//     this.urlOrIOHandler = modelUrlOrIOHandler;
//     if (
//       typeof modelUrlOrIOHandler === "string" &&
//       !modelUrlOrIOHandler.startsWith("indexeddb://") &&
//       !modelUrlOrIOHandler.startsWith("localstorage://") &&
//       !modelUrlOrIOHandler.endsWith("model.json")
//     ) {
//       this.urlOrIOHandler = `${modelUrlOrIOHandler}model.json`;
//     } else {
//       this.urlOrIOHandler = modelUrlOrIOHandler;
//     }
//   }
//   async load() {
//     const { size, type } = this.options;
//     if (type === "graph") {
//       this.model = await tf.loadGraphModel(this.urlOrIOHandler);
//     } else {
//       this.model = await tf.loadLayersModel(this.urlOrIOHandler);
//       this.endpoints = this.model.layers.map((l) => l.name);
//     }
//     const result = tf.tidy(() =>
//       this.model.predict(tf.zeros([1, size, size, 3]))
//     );
//     await result.data();
//     result.dispose();
//   }
//   infer(img, endpoint) {
//     if (endpoint != null && this.endpoints.indexOf(endpoint) === -1) {
//       throw new Error(
//         `Unknown endpoint ${endpoint}. Available endpoints: ${this.endpoints}.`
//       );
//     }
//     return tf.tidy(() => {
//       if (!(img instanceof tf.Tensor)) {
//         img = tf.browser.fromPixels(img);
//       }
//       const normalized = img.toFloat().div(this.normalizationOffset);
//       let resized = normalized;
//       const { size } = this.options;
//       if (img.shape[0] !== size || img.shape[1] !== size) {
//         const alignCorners = true;
//         resized = tf.image.resizeBilinear(
//           normalized,
//           [size, size],
//           alignCorners
//         );
//       }
//       const batched = resized.reshape([1, size, size, 3]);
//       let model;
//       if (endpoint == null) {
//         model = this.model;
//       } else {
//         if (
//           this.model.hasOwnProperty("layers") &&
//           this.intermediateModels[endpoint] == null
//         ) {
//           const layer = this.model.layers.find((l) => l.name === endpoint);
//           this.intermediateModels[endpoint] = tf.model({
//             inputs: this.model.inputs,
//             outputs: layer.output,
//           });
//         }
//         model = this.intermediateModels[endpoint];
//       }
//       return model.predict(batched);
//     });
//   }
//   async classify(img, topk = 5) {
//     const logits = this.infer(img);
//     const classes = await getTopKClasses(logits, topk);
//     logits.dispose();
//     return classes;
//   }
// }
// async function getTopKClasses(logits, topK) {
//   const values = await logits.data();
//   const valuesAndIndices = [];
//   for (let i = 0; i < values.length; i++) {
//     valuesAndIndices.push({ value: values[i], index: i });
//   }
//   valuesAndIndices.sort((a, b) => {
//     return b.value - a.value;
//   });
//   const topkValues = new Float32Array(topK);
//   const topkIndices = new Int32Array(topK);
//   for (let i = 0; i < topK; i++) {
//     topkValues[i] = valuesAndIndices[i].value;
//     topkIndices[i] = valuesAndIndices[i].index;
//   }
//   const topClassesAndProbs = [];
//   for (let i = 0; i < topkIndices.length; i++) {
//     topClassesAndProbs.push({
//       className: NSFW_CLASSES[topkIndices[i]],
//       probability: topkValues[i],
//     });
//   }
//   return topClassesAndProbs;
// }
// //# sourceMappingURL=index.js.map
import * as tf from "@tensorflow/tfjs";
// import * as tf from "./tf.es2017.js";
import { NSFW_CLASSES } from "./nsfw_classes.js";

// --------------------- Model Configuration ---------------------
const availableModels = {
  MobileNetV2: { numOfWeightBundles: 1, options: { size: 224 } },
  MobileNetV2Mid: {
    numOfWeightBundles: 2,
    options: { size: 224, type: "graph" },
  },
  InceptionV3: { numOfWeightBundles: 6, options: { size: 299 } },
};

const DEFAULT_MODEL_NAME = "MobileNetV2";
const IMAGE_SIZE = 224;

// --------------------- Utility ---------------------
const getGlobal = () => {
  if (typeof globalThis !== "undefined") return globalThis;
  if (typeof global !== "undefined") return global;
  if (typeof window !== "undefined") return window;
  if (typeof self !== "undefined") return self;
  throw new Error("Unable to locate global object");
};

function isModelName(name) {
  return !!name && name in availableModels;
}

// --------------------- Load model JSON from public/models ---------------------
async function getModelJson(modelName) {
  const globalModel = getGlobal().model;
  if (globalModel) return globalModel;

  const modelJsonUrl = chrome.runtime.getURL(`models/${modelName}/model.json`);
  console.warn("[NSFWJS] Fetching model JSON from:", modelJsonUrl);

  try {
    const res = await fetch(modelJsonUrl);
    if (!res.ok)
      throw new Error(`Failed to fetch model JSON: ${res.statusText}`);
    const json = await res.json();
    console.warn("[NSFWJS] Successfully loaded model JSON:", modelName);
    return json;
  } catch (err) {
    console.error("[NSFWJS] Error fetching model JSON for", modelName, err);
    throw err;
  }
}

// --------------------- Load weight data ---------------------
async function getWeightData(modelName) {
  const { numOfWeightBundles } = availableModels[modelName];
  const bundles = {};

  for (let i = 0; i < numOfWeightBundles; i++) {
    const bundleName = `group1-shard${i + 1}of${numOfWeightBundles}`;
    const identifier = bundleName.replace(/-/g, "_");

    try {
      const globalWeight = getGlobal()[identifier];
      if (globalWeight) {
        bundles[bundleName] = globalWeight;
        continue;
      }

      const url = chrome.runtime.getURL(
        `models/${modelName}/${bundleName}.bin`
      );
      console.warn("[NSFWJS] Fetching weight shard:", url);

      const res = await fetch(url);
      if (!res.ok)
        throw new Error(`Failed to fetch weight shard: ${bundleName}`);
      const arrayBuffer = await res.arrayBuffer();
      bundles[bundleName] = arrayBufferToBase64(arrayBuffer);

      console.warn("[NSFWJS] Loaded weight shard:", bundleName);
    } catch (err) {
      console.error("[NSFWJS] Error loading weight shard:", bundleName, err);
      throw err;
    }
  }

  return bundles;
}

// Convert ArrayBuffer to Base64 string
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// --------------------- Load weights ---------------------
async function loadWeights(modelName) {
  try {
    return await getWeightData(modelName);
  } catch (e) {
    throw new Error(`Could not load weight data. ${e.message}`);
  }
}

// --------------------- Load model ---------------------
async function loadModel(modelName) {
  if (!isModelName(modelName)) return modelName;

  try {
    console.warn("[NSFWJS] Loading model:", modelName);
    const modelJson = await getModelJson(modelName);
    const weightData = await loadWeights(modelName);
    console.warn("[NSFWJS] Model loaded successfully:", modelName);
    return new JSONHandler(modelJson, weightData);
  } catch (err) {
    console.error("[NSFWJS] Failed to load model:", modelName, err);
    throw err;
  }
}

// --------------------- Public load function ---------------------
export async function load(modelOrUrl, options = { size: IMAGE_SIZE }) {
  if (!tf) throw new Error("Cannot find TensorFlow.js.");

  if (!modelOrUrl) modelOrUrl = DEFAULT_MODEL_NAME;

  if (isModelName(modelOrUrl)) {
    const modelOpts = availableModels[modelOrUrl].options;
    if (modelOpts) options = { ...options, ...modelOpts };
  }

  options.size = options.size || IMAGE_SIZE;

  const modelHandler = await loadModel(modelOrUrl);
  const nsfwnet = new NSFWJS(modelHandler, options);
  await nsfwnet.load();
  return nsfwnet;
}

// --------------------- JSONHandler ---------------------
// class JSONHandler {
//   constructor(modelJson, weightDataBase64) {
//     this.modelJson = modelJson;
//     this.weightDataBase64 = weightDataBase64;
//   }

//   arrayBufferFromBase64(base64) {
//     const binaryString = atob(base64);
//     const bytes = new Uint8Array(binaryString.length);
//     for (let i = 0; i < binaryString.length; i++) {
//       bytes[i] = binaryString.charCodeAt(i);
//     }
//     return bytes.buffer;
//   }

//   async load() {
//     const modelArtifacts = {
//       modelTopology: this.modelJson.modelTopology,
//       format: this.modelJson.format,
//       generatedBy: this.modelJson.generatedBy,
//       convertedBy: this.modelJson.convertedBy,
//     };

//     if (this.modelJson.weightsManifest) {
//       const weightSpecs = [];
//       const weightData = [];

//       for (const group of this.modelJson.weightsManifest) {
//         for (const path of group.paths) {
//           const base64 = this.weightDataBase64[path];
//           if (!base64) throw new Error(`Missing weight bundle: ${path}`);
//           weightData.push(new Uint8Array(this.arrayBufferFromBase64(base64)));
//         }
//         weightSpecs.push(...group.weights);
//       }

//       modelArtifacts.weightSpecs = weightSpecs;

//       const totalLength = weightData.reduce((sum, arr) => sum + arr.length, 0);
//       const concat = new Uint8Array(totalLength);
//       let offset = 0;
//       for (const arr of weightData) {
//         concat.set(arr, offset);
//         offset += arr.length;
//       }
//       modelArtifacts.weightData = concat.buffer;
//     }

//     if (this.modelJson.trainingConfig)
//       modelArtifacts.trainingConfig = this.modelJson.trainingConfig;
//     if (this.modelJson.userDefinedMetadata)
//       modelArtifacts.userDefinedMetadata = this.modelJson.userDefinedMetadata;

//     return modelArtifacts;
//   }
// }

class JSONHandler {
  constructor(modelJson, weightDataBase64) {
    this.modelJson = modelJson;
    this.weightDataBase64 = weightDataBase64;
  }

  async load() {
    const modelArtifacts = {
      modelTopology: this.modelJson.modelTopology,
      format: this.modelJson.format,
      generatedBy: this.modelJson.generatedBy,
      convertedBy: this.modelJson.convertedBy,
    };

    if (this.modelJson.weightsManifest) {
      const weightSpecs = [];
      const weightData = [];

      for (const group of this.modelJson.weightsManifest) {
        for (const path of group.paths) {
          const base64 = this.weightDataBase64[path];
          if (!base64) throw new Error(`Missing weight bundle: ${path}`);
          weightData.push(new Uint8Array(this.arrayBufferFromBase64(base64)));
        }
        weightSpecs.push(...group.weights);
      }

      modelArtifacts.weightSpecs = weightSpecs;

      const totalLength = weightData.reduce((sum, arr) => sum + arr.length, 0);
      const concat = new Uint8Array(totalLength);
      let offset = 0;
      for (const arr of weightData) {
        concat.set(arr, offset);
        offset += arr.length;
      }
      modelArtifacts.weightData = concat.buffer;
    }

    if (this.modelJson.trainingConfig)
      modelArtifacts.trainingConfig = this.modelJson.trainingConfig;
    if (this.modelJson.userDefinedMetadata)
      modelArtifacts.userDefinedMetadata = this.modelJson.userDefinedMetadata;

    return modelArtifacts; // ✅ This is exactly what TF expects
  }

  arrayBufferFromBase64(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// --------------------- NSFWJS class ---------------------
export class NSFWJS {
  constructor(modelHandler, options) {
    this.intermediateModels = {};
    this.options = options;
    this.normalizationOffset = tf.scalar(255);
    this.urlOrIOHandler = modelHandler;
  }

  async load() {
    const { size, type } = this.options;
    console.warn("[NSFWJS] Initializing model with size:", size, "type:", type);

    try {
      if (type === "graph") {
        this.model = await tf.loadGraphModel(this.urlOrIOHandler);
      } else {
        this.model = await tf.loadLayersModel(this.urlOrIOHandler);
        this.endpoints = this.model.layers.map((l) => l.name);
      }

      const result = tf.tidy(() =>
        this.model.predict(tf.zeros([1, size, size, 3]))
      );
      await result.data();
      result.dispose();
      console.warn("[NSFWJS] Model warmup complete");
    } catch (err) {
      console.error("[NSFWJS] Error during model load:", err);
      throw err;
    }
  }

  infer(img, endpoint) {
    if (endpoint != null && !this.endpoints.includes(endpoint))
      throw new Error(`Unknown endpoint ${endpoint}`);

    return tf.tidy(() => {
      if (!(img instanceof tf.Tensor)) img = tf.browser.fromPixels(img);

      let normalized = img.toFloat().div(this.normalizationOffset);
      const { size } = this.options;
      if (img.shape[0] !== size || img.shape[1] !== size)
        normalized = tf.image.resizeBilinear(normalized, [size, size], true);

      const batched = normalized.reshape([1, size, size, 3]);

      let model = this.model;
      if (endpoint) {
        if (!this.intermediateModels[endpoint]) {
          const layer = this.model.layers.find((l) => l.name === endpoint);
          this.intermediateModels[endpoint] = tf.model({
            inputs: this.model.inputs,
            outputs: layer.output,
          });
        }
        model = this.intermediateModels[endpoint];
      }

      return model.predict(batched);
    });
  }

  async classify(img, topk = 5) {
    const logits = this.infer(img);
    const classes = await getTopKClasses(logits, topk);
    logits.dispose();
    return classes;
  }
}

// --------------------- Helper: get top K ---------------------
async function getTopKClasses(logits, topK) {
  const values = await logits.data();
  const valuesAndIndices = Array.from(values).map((v, i) => ({
    value: v,
    index: i,
  }));
  valuesAndIndices.sort((a, b) => b.value - a.value);

  return valuesAndIndices.slice(0, topK).map(({ value, index }) => ({
    className: NSFW_CLASSES[index],
    probability: value,
  }));
}
