// db/modelCache.js

import { getDb } from "./database.js";

console.log(" model cache loaded");

export async function saveModelToCache(modelArtifacts) {
  console.log("[DB] saveModelToCache() called");

  let db;
  try {
    db = await getDb();
    console.log("[DB] DB instance from getDb():", db);
  } catch (e) {
    console.error("[DB] Failed to get DB:", e);
    return;
  }

  if (!db || typeof db.transaction !== "function") {
    console.error("[DB] db is invalid or missing .transaction():", db);
    return;
  }

  return new Promise((resolve, reject) => {
    let tx;
    try {
      tx = db.transaction("modelCache", "readwrite");
    } catch (e) {
      console.error("[DB] Failed to start transaction:", e);
      return reject(e);
    }

    const store = tx.objectStore("modelCache");
    const data = {
      id: "cachedModel",
      modelArtifacts,
      savedAt: Date.now(),
    };

    const request = store.put(data);

    request.onsuccess = () => {
      console.log("[DB] Model saved to IndexedDB.");
      resolve();
    };

    request.onerror = (e) => {
      console.error("[DB] Failed to save model:", e.target.error);
      reject(e.target.error);
    };
  });
}

// db/modelCache.js

export async function loadModelFromCache() {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("modelCache", "readonly");
    const store = tx.objectStore("modelCache");
    const request = store.get("cachedModel");

    request.onsuccess = () => {
      const result = request.result;
      if (!result) {
        console.warn("[DB] No model found in IndexedDB.");
        return resolve(null);
      }
      console.log("[DB] Loaded model from IndexedDB.");
      resolve(result.modelArtifacts);
    };

    request.onerror = (e) => {
      console.error("[DB] Failed to load model:", e.target.error);
      reject(e.target.error);
    };
  });
}
