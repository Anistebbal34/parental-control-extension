import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [siteTime, setSiteTime] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const [blockFeed, setBlockFeed] = useState(false);
  const [blockShorts, setBlockShorts] = useState(false);
  const [blockFacebookFeed, setBlockFacebookFeed] = useState(false);
  const [blockFacebookReels, setBlockFacebookReels] = useState(false);
  const [blockFacebookVideos, setBlockFacebookVideos] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(
      [
        "site_time",
        "block_feed",
        "block_shorts",
        "block_facebook_feed",
        "block_facebook_reels",
        "block_facebook_videos",
      ],
      (result) => {
        setSiteTime(result.site_time || {});
        setBlockFeed(result.block_feed || false);
        setBlockShorts(result.block_shorts || false);
        setBlockFacebookFeed(result.block_facebook_feed || false);
        setBlockFacebookReels(result.block_facebook_reels || false);
        setBlockFacebookVideos(result.block_facebook_videos || false);
        setIsLoading(false);
      }
    );

    const handleStorageChange = (changes) => {
      if (changes.site_time) setSiteTime(changes.site_time.newValue || {});
      if (changes.block_feed) setBlockFeed(changes.block_feed.newValue);
      if (changes.block_shorts) setBlockShorts(changes.block_shorts.newValue);
      if (changes.block_facebook_feed)
        setBlockFacebookFeed(changes.block_facebook_feed.newValue);
      if (changes.block_facebook_reels)
        setBlockFacebookReels(changes.block_facebook_reels.newValue);
      if (changes.block_facebook_videos)
        setBlockFacebookVideos(changes.block_facebook_videos.newValue);
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const handleToggle = (type) => {
    const toggleMap = {
      feed: ["block_feed", blockFeed, setBlockFeed],
      shorts: ["block_shorts", blockShorts, setBlockShorts],
      facebook_feed: [
        "block_facebook_feed",
        blockFacebookFeed,
        setBlockFacebookFeed,
      ],
      facebook_reels: [
        "block_facebook_reels",
        blockFacebookReels,
        setBlockFacebookReels,
      ],
      facebook_videos: [
        "block_facebook_videos",
        blockFacebookVideos,
        setBlockFacebookVideos,
      ],
    };

    const [key, currentValue, setter] = toggleMap[type];
    const newValue = !currentValue;

    chrome.storage.local.set({ [key]: newValue }, () => {
      setter(newValue);
    });
  };

  const clearData = () => {
    chrome.storage.local.set({ site_time: {} }, () => {
      setSiteTime({});
    });
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (isLoading) return <div className="container">Loading...</div>;

  const hasData = Object.keys(siteTime).length > 0;

  return (
    <div className="container">
      <h2>📊 Site Time Tracking</h2>

      <div className="toggles">
        <label>
          <input
            type="checkbox"
            checked={blockFeed}
            onChange={() => handleToggle("feed")}
          />
          Hide YouTube Feed
        </label>
        <label>
          <input
            type="checkbox"
            checked={blockShorts}
            onChange={() => handleToggle("shorts")}
          />
          Block YouTube Shorts
        </label>
        <label>
          <input
            type="checkbox"
            checked={blockFacebookFeed}
            onChange={() => handleToggle("facebook_feed")}
          />
          Hide Facebook Feed
        </label>
        <label>
          <input
            type="checkbox"
            checked={blockFacebookReels}
            onChange={() => handleToggle("facebook_reels")}
          />
          Block Facebook Reels
        </label>
        <label>
          <input
            type="checkbox"
            checked={blockFacebookVideos}
            onChange={() => handleToggle("facebook_videos")}
          />
          Block Facebook Videos
        </label>
      </div>

      <div className="summary">
        <p>
          Tracked Days: <strong>{Object.keys(siteTime).length}</strong>
        </p>
        <button onClick={clearData} className="clear-btn">
          Clear All Data
        </button>
      </div>

      <div className="sessions-list">
        {!hasData ? (
          <p className="empty">No tracking data yet</p>
        ) : (
          Object.entries(siteTime)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, domains]) => (
              <div key={date} className="session-card">
                <h4>{date}</h4>
                {Object.entries(domains)
                  .sort(([, t1], [, t2]) => t2 - t1)
                  .map(([domain, duration]) => (
                    <p key={domain}>
                      <strong>{domain}</strong>: {formatDuration(duration)}
                    </p>
                  ))}
              </div>
            ))
        )}
      </div>
    </div>
  );
}

export default App;
