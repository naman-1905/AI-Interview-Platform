import React, { useState, useEffect } from "react";
import { Mic, Keyboard } from "lucide-react";

export default function TimerBar({ duration = 300, onTimeOver }) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Timer logic
useEffect(() => {
  if (timeLeft <= 0) {
    if (onTimeOver) onTimeOver();
    return;
  }

  const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
  return () => clearInterval(timer);
}, [timeLeft]);


  const formatTime = (t) => {
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const getTimeColor = () => {
    const pct = (timeLeft / duration) * 100;
    if (pct > 60) return "text-green-600";
    if (pct > 30) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <div className="w-full bg-white border-b border-gray-200 shadow-sm py-4 px-6 flex items-center justify-between rounded-lg">

      {/* Title */}
      <h1 className="text-xl font-semibold text-gray-800 tracking-tight">
        Interview Page
      </h1>

      {/* Right controls */}
      <div className="flex items-center gap-8">

        {/* Label + Toggle + Dynamic Icon */}
        <div className="flex items-center gap-4">
        

          {/* Toggle */}
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={voiceEnabled}
              onChange={() => setVoiceEnabled(!voiceEnabled)}
              className="sr-only peer"
            />

            {/* Track */}
            <div className="w-14 h-8 bg-gray-300 rounded-full transition peer-checked:bg-blue-600"></div>

            {/* Knob */}
            <span className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-6"></span>
          </label>

          {/* Mode Icon */}
          {voiceEnabled ? (
            <Mic className="w-6 h-6 text-blue-600 transition" />
          ) : (
            <Mic className="w-6 h-6 text-gray-400 transition" />
          )}
        </div>

        {/* Timer */}
        <span className={`font-bold text-xl tracking-wide transition-colors ${getTimeColor()}`}>
          {formatTime(timeLeft)}
        </span>
      </div>
    </div>
  );
}
