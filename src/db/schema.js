// db/schema.js
export function defineSchema(db) {
  if (!db.objectStoreNames.contains("modelCache")) {
    const store = db.createObjectStore("modelCache", { keyPath: "id" });
    // Optional: Add indexes if needed in the future
    console.log("[DB] Object store 'modelCache' created.");
  }
}
