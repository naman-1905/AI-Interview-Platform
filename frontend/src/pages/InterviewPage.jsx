import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TimerBar from "../components/TimerBar";
import TimeUpModal from "../components/TimeUpModal";
import ChatWindow from "../components/ChatWindow";

const API = import.meta.env.VITE_API_ENDPOINT;

export default function InterviewPage() {
  const navigate = useNavigate();
  const [timeExpired, setTimeExpired] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const handleTimeOver = () => {
    setTimeExpired(true);
    setShowModal(true);
  };

  const handleExit = () => {
    localStorage.clear();
    navigate("/");
  };

  const viewResults = () => {
    navigate("/result");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Chat Area */}
      <div className="flex-1 overflow-hidden">
        <ChatWindow
          timeExpired={timeExpired}
          voiceEnabled={voiceEnabled}
          onFinalResponse={() => setShowModal(true)}
        />
      </div>

      {/* Timer + Voice Toggle */}
      <TimerBar 
        onTimeOver={handleTimeOver} 
        onEarlyExit={handleExit}
        onVoiceToggle={setVoiceEnabled}
      />

      {showModal && <TimeUpModal onViewResults={viewResults} />}
    </div>
  );
}
