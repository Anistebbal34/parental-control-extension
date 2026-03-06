export function setupIncognitoBlocker() {
  chrome.webNavigation.onCompleted.addListener((details) => {
    // Only handle main frame
    if (details.frameId !== 0) return;

    chrome.tabs.get(details.tabId, (tab) => {
      if (chrome.runtime.lastError) {
        console.warn("❌ Cannot get tab:", chrome.runtime.lastError.message);
        return;
      }

      if (!tab.incognito) return;

      console.warn("✅ Incognito tab found:", tab);

      chrome.tabs.remove(details.tabId, () => {
        if (chrome.runtime.lastError) {
          console.warn(
            "❌ Failed to remove tab:",
            chrome.runtime.lastError.message
          );
        } else {
          console.warn("🚫 Tab closed:", tab.url);
        }
      });
    });
  });
}
