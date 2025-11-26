import React, { useState } from "react";
import TimerBar from "../components/TimerBar";
import TimeUpModal from "../components/TimeUpModal";
import ChatWindow from "../components/ChatWindow";

function InterviewPage() {
  const [timeExpired, setTimeExpired] = useState(false);
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="z-20 relative">
        <TimerBar onTimeOver={() => setTimeExpired(true)} />
      </div>

      <ChatWindow className ="mt-5"
        timeExpired={timeExpired}
        onFinalResponse={() => setShowModal(true)}
      />

      {showModal && <TimeUpModal />}
    </div>
  );
}

export default InterviewPage;
