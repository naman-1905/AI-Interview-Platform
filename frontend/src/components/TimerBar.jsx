import { useState, useEffect } from "react";
import { Mic, LogOut } from "lucide-react";

export default function TimerBar({ duration = 300, onTimeOver, onEarlyExit, onVoiceToggle }) {
  const storedTime = localStorage.getItem("interviewTimeLeft");
  const [timeLeft, setTimeLeft] = useState(storedTime ? Number(storedTime) : duration);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeOver?.();
      localStorage.removeItem("interviewTimeLeft");
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;
        localStorage.setItem("interviewTimeLeft", newTime);
        return newTime;
      });
    }, 1000);

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
        
        {/* Timer */}
        <span className={`font-bold text-xl tracking-wide transition-colors ${getTimeColor()}`}>
          {formatTime(timeLeft)}
        </span>

        {/* Exit Button */}
        <button
          onClick={() => {
            localStorage.removeItem("interviewTimeLeft");
            onEarlyExit();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition font-medium"
        >
          <LogOut className="w-4 h-4" /> Exit
        </button>
      </div>
    </div>
  );
}
