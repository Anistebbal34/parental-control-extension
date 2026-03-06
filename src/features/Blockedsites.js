// ==========================================
// BLOCKED SITES FEATURE
// ==========================================
// Simple site blocking using declarativeNetRequest

import { hashStringToId } from "../utils/hash.js";

const FEATURE_BLOCKED_SITES = "blocked_sites";
const BLOCKED_SITES_OFFSET = 1_000;

/**
 * Build DNR rules for blocked sites
 */
function buildBlockedSitesRules(domains) {
  return domains.map((domain) => ({
    id: hashStringToId(
      `${FEATURE_BLOCKED_SITES}:${domain}`,
      BLOCKED_SITES_OFFSET,
    ),
    priority: 1,
    action: { type: "block" },
    condition: {
      urlFilter: `||${domain}^`,
      resourceTypes: ["main_frame"],
    },
  }));
}

/**
 * Apply blocked sites rules to DNR
 */
async function applyBlockedSites(domains) {
  const rules = buildBlockedSitesRules(domains);

  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();

  // Remove ONLY blocked-sites rules
  const blockedSiteRuleIds = existingRules
    .filter(
      (r) =>
        r.id >= BLOCKED_SITES_OFFSET && r.id < BLOCKED_SITES_OFFSET + 10_000,
    )
    .map((r) => r.id);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: blockedSiteRuleIds,
    addRules: rules,
  });

  console.log("🚫 [blocked_sites] rules updated");
}

/**
 * Setup blocked sites feature
 */
export function setupBlockedSites() {
  // Listen for changes to blocked_sites in storage
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.blocked_sites) {
      applyBlockedSites(changes.blocked_sites.newValue);
    }
  });

  console.log("✅ Blocked sites feature initialized");
}
