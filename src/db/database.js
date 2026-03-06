// db/database.js

import { defineSchema } from "./schema.js";

let dbInstance = null; // cache

const DB_NAME = "nsfwGuardianDB"; // or anything meaningful to your extension
const DB_VERSION = 2; // bump this when you update schema

/**
 * Open (or upgrade) the IndexedDB database
 */
export function initializeDatabase() {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance); // return cached

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      console.log(
        "[DB] Upgrading database to version",
        event.oldVersion,
        "→",
        DB_VERSION
      );
      defineSchema(db); // define all stores
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      console.log("[DB] Database opened:", DB_NAME);
      resolve(dbInstance);
    };

    request.onerror = (e) => {
      console.error("[DB] Failed to open database:", e.target.error);
      reject(e.target.error);
    };
  });
}

/**
 * Always use this to get the DB instance
 */
export function getDb() {
  return dbInstance ? Promise.resolve(dbInstance) : initializeDatabase();
}
