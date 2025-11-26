import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TimerBar from "../components/TimerBar";
import TimeUpModal from "../components/TimeUpModal";
import ChatWindow from "../components/ChatWindow";

const API = import.meta.env.VITE_API_ENDPOINT;

function InterviewPage() {
  const navigate = useNavigate();
  const [timeExpired, setTimeExpired] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [apiError, setApiError] = useState(null);

  const getUserId = () =>
    localStorage.getItem("user_id") || "ea9aea430a4a42ab8161ca2870d42071";

  /** ---- Exit API ---- */
  const callExitAPI = async () => {
    const userId = getUserId();

    try {
      const response = await fetch(`${API}/users/${userId}/exit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) {
        if (response.status === 422)
          throw new Error("Validation error: Invalid user ID or request format");
        if (response.status === 500)
          throw new Error("Server error: Please try again later");
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Exit API Error:", error);
      setApiError(error.message);
      throw error;
    }
  };

  /** ---- Global Cleanup (Tab close / Refresh / Route change) ---- */
  useEffect(() => {
    const userId = getUserId();

    const handleUnload = async () => {
      try {
        await fetch(`${API}/users/${userId}/exit`, { method: "POST" });
      } catch (e) {
        // Suppress error — user is leaving anyway
      }

      // Cleanup storage
      localStorage.removeItem("interviewChat");
      localStorage.removeItem("queueNumber");
      localStorage.removeItem("status");
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      handleUnload(); // also runs on react route change
    };
  }, []);

  /** ---- Timer Expired ---- */
  const handleTimeOver = () => {
    setTimeExpired(true);
    setShowModal(true);
  };

  /** ---- Manual Exit Action ---- */
  const handleEarlyExit = async () => {
    try {
      await callExitAPI();
    } catch {}

    localStorage.removeItem("interviewChat");
    localStorage.removeItem("queueNumber");
    localStorage.removeItem("status");
    navigate("/");
  };

  /** ---- View Results ---- */
  const handleViewResults = async () => {
    try {
      await callExitAPI();
    } catch {}

    localStorage.removeItem("interviewChat");
    localStorage.removeItem("queueNumber");
    localStorage.removeItem("status");
    navigate("/result");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Error Notification */}
      {apiError && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg z-50">
          <strong className="font-bold">Error:</strong>
          <span className="ml-2">{apiError}</span>
          <button onClick={() => setApiError(null)} className="ml-3 text-lg">
            ×
          </button>
        </div>
      )}

      {/* Timer Bar */}
      <div className="flex-shrink-0">
        <TimerBar onTimeOver={handleTimeOver} onEarlyExit={handleEarlyExit} />
      </div>

      {/* Chat Component */}
      <div className="flex-1 overflow-hidden">
        <ChatWindow
          timeExpired={timeExpired}
          onFinalResponse={() => setShowModal(true)}
        />
      </div>

      {/* Time's up Modal */}
      {showModal && <TimeUpModal onViewResults={handleViewResults} />}
    </div>
  );
}

export default InterviewPage;
