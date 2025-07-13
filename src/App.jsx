import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [siteTime, setSiteTime] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    chrome.storage.local.get(["site_time"], (result) => {
      setSiteTime(result.site_time || {});
      setIsLoading(false);
    });

    const handleStorageChange = (changes) => {
      if (changes.site_time) {
        setSiteTime(changes.site_time.newValue || {});
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const clearData = () => {
    chrome.storage.local.set({ site_time: {} }, () => {
      setSiteTime({});
    });
  };

  if (isLoading) {
    return <div className="container">Loading...</div>;
  }

  const hasData = Object.keys(siteTime).length > 0;

  return (
    <div className="container">
      <h2>📊 Site Time Tracking</h2>

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
            .sort(([a], [b]) => b.localeCompare(a)) // Newest day first
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
