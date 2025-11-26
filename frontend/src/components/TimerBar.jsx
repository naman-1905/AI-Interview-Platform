import { useState, useEffect } from "react";
import { Mic, LogOut } from "lucide-react";

export default function TimerBar({ duration = 300, onTimeOver, onEarlyExit, onVoiceToggle }) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeOver?.();
      return;
    }

    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, onTimeOver]);

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

  const toggleVoice = () => {
    const newState = !voiceEnabled;
    setVoiceEnabled(newState);
    onVoiceToggle?.(newState);
  };

  return (
    <div className="w-full bg-white border-b border-gray-200 shadow-sm py-4 px-6 flex items-center justify-center rounded-lg">
      <div className="flex items-center gap-8">
        
        {/* Voice Toggle
        <div className="flex items-center gap-4">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={voiceEnabled}
              onChange={toggleVoice}
              className="sr-only peer"
            />
            <div className="w-14 h-8 bg-gray-300 rounded-full transition peer-checked:bg-blue-600"></div>
            <span className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-6"></span>
          </label>

          <Mic className={`w-6 h-6 transition ${voiceEnabled ? "text-blue-600" : "text-gray-400"}`} />
        </div> */}

        {/* Timer */}
        <span className={`font-bold text-xl tracking-wide transition-colors ${getTimeColor()}`}>
          {formatTime(timeLeft)}
        </span>

        {/* Exit Button */}
        <button
          onClick={onEarlyExit}
          className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition font-medium"
        >
          <LogOut className="w-4 h-4" /> Exit
        </button>
      </div>
    </div>
  );
}
