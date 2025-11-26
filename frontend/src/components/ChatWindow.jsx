import { useState, useEffect, useRef } from "react";
import { Mic, Send, Loader2, Sparkles } from "lucide-react";
import { useLocation } from "react-router-dom";

export default function ChatWindow({ timeExpired, onFinalResponse }) {
  const location = useLocation();

  const [messages, setMessages] = useState(() => {
    // Load existing messages if available
    const cached = localStorage.getItem("interviewChat");
    return cached ? JSON.parse(cached) : [];
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);

  const chatRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto Scroll
  useEffect(() => {
    chatRef.current?.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  // Save messages in localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("interviewChat", JSON.stringify(messages));
  }, [messages]);

  // Clear cache when user leaves "/interview"
  useEffect(() => {
    return () => {
      if (location.pathname !== "/interview") {
        localStorage.removeItem("interviewChat");
      }
    };
  }, [location.pathname]);

  // Speech Recognition
  useEffect(() => {
    if (!("webkitSpeechRecognition" in window)) return;

    const rec = new window.webkitSpeechRecognition();
    rec.lang = "en-US";

    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (e) =>
      setInput((prev) => prev + e.results[0][0].transcript);

    recognitionRef.current = rec;
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // --- Replace with actual AI streaming response later ---
    setTimeout(() => {
      const aiResponse = { sender: "ai", text: "AI response placeholder." };

      setMessages((prev) => [...prev, aiResponse]);
      setLoading(false);

      if (timeExpired) onFinalResponse?.();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-hidden">
      
      {/* Chat List */}
      <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4">

        {messages.length === 0 && (
          <div className="h-screen flex items-center justify-center">
            <div className="text-center space-y-3 max-w-md">
              <h2 className="text-2xl font-semibold text-gray-800">Start a conversation</h2>
              <p className="text-gray-500">Type a message or use voice input to begin</p>
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"} animate-fadeIn`}>
            <div className="flex items-end gap-2 max-w-[75%]">
              {m.sender === "ai" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              )}

              <div className={`px-4 py-3 rounded-2xl shadow-md transition-all ${
                m.sender === "user"
                  ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-br-sm"
                  : "bg-white text-gray-800 rounded-bl-sm border border-gray-100"
              }`}>
                <p className="text-sm whitespace-pre-wrap">{m.text}</p>
              </div>

              {m.sender === "user" && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shadow-md">
                  <span className="text-sm font-semibold text-gray-700">You</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start animate-fadeIn">
            <div className="flex items-end gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-md">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white px-4 py-3 rounded-2xl shadow-md">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Section */}
      <div className="p-4 bg-white/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex gap-3 items-end">
          <textarea
            value={input}
            disabled={timeExpired || loading}
            placeholder="Type your message..."
            rows={1}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 p-3 border-black rounded-xl resize-none"
          />
          <button onClick={() => recognitionRef.current?.start()} disabled={listening || loading} className="p-4 bg-gray-100 rounded-xl">
            <Mic size={20} />
          </button>
          <button onClick={sendMessage} disabled={!input.trim() || loading} className="p-4 bg-blue-600 text-white rounded-xl">
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
