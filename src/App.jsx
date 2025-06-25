import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load initial data
    chrome.storage.local.get(["activityLog"], (result) => {
      setSessions(result.activityLog || []);
      setIsLoading(false);
    });

    // Listen for updates
    const handleStorageChange = (changes) => {
      if (changes.activityLog) {
        setSessions(changes.activityLog.newValue || []);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const clearData = () => {
    chrome.storage.local.set({ activityLog: [] }, () => {
      setSessions([]);
    });
  };

  if (isLoading) {
    return <div className="container">Loading tracking data...</div>;
  }

  return (
    <div className="container">
      <h2>🕒 Time Tracking Debug</h2>

      <div className="summary">
        <p>
          Total sessions tracked: <strong>{sessions.length}</strong>
        </p>
        <button onClick={clearData} className="clear-btn">
          Clear All Data
        </button>
      </div>

      <div className="sessions-list">
        {sessions.length === 0 ? (
          <p className="empty">No time tracking data yet</p>
        ) : (
          [...sessions].reverse().map((session, index) => (
            <div key={index} className="session-card">
              <div className="session-header">
                <span className="domain">{session.domain}</span>
                <span className="duration">
                  {formatDuration(session.duration)}
                </span>
              </div>
              <div className="session-details">
                <p>Started: {formatTime(session.timestamp)}</p>
                <p>
                  Ended:{" "}
                  {formatTime(session.timestamp + session.duration * 1000)}
                </p>
                <p className="reason">Reason: {session.reason || "unknown"}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;
