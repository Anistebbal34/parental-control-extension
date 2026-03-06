function getTodayKey() {
  const today = new Date().toISOString().slice(0, 10); // e.g., "2025-07-31"
  return `visited_${today}`;
}

function extractDomain(url) {
  try {
    const { hostname } = new URL(url);
    const parts = hostname.split(".");
    if (parts.length > 2) {
      // e.g., accounts.google.com => google.com
      return parts.slice(-2).join(".");
    }
    return hostname;
  } catch {
    return null;
  }
}
export function trackVisitedSite(url) {
  const domain = extractDomain(url);
  if (!domain) return;

  const key = getTodayKey();
  chrome.storage.local.get([key], (res) => {
    const visited = res[key] || [];

    console.warn(`🗂 Current visited list for today (${key}):`, visited); // ✅ See full list

    if (!visited.includes(domain)) {
      visited.push(domain);
      chrome.storage.local.set({ [key]: visited }, () => {
        console.log(`✅ Added new site: ${domain}`);
      });
    } else {
      console.log(`⏩ Site already tracked today: ${domain}`);
    }
  });
}
