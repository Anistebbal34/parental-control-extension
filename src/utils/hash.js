// ==============================
// SHARED HASH UTILITY
// ==============================

/**
 * Generate stable, deterministic hash ID for DNR rules
 * @param {string} str - String to hash
 * @param {number} offset - ID offset for namespacing
 * @returns {number} Hashed ID
 */
export function hashStringToId(str, offset = 0) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }

  const RULE_ID_RANGE = 10_000;
  return offset + (Math.abs(hash) % RULE_ID_RANGE);
}
