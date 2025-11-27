import { useState, useEffect, useRef } from "react";
import { Send, Loader2, Sparkles } from "lucide-react";
import { useLocation } from "react-router-dom";

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;

export default function ChatWindow({ timeExpired, onFinalResponse, onSessionOver }) {
  const location = useLocation();
  const [messages, setMessages] = useState(() => JSON.parse(localStorage.getItem("interviewChat") || "[]"));
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const chatRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Persist chat locally
  useEffect(() => {
    localStorage.setItem("interviewChat", JSON.stringify(messages));
  }, [messages]);

  // Cleanup chat when leaving interview
  useEffect(() => {
    return () => {
      if (location.pathname !== "/interview") localStorage.removeItem("interviewChat");
    };
  }, [location.pathname]);

  // Start interview once per session
  useEffect(() => {
    const startInterview = async () => {
      const userId = localStorage.getItem("user_id");
      if (!userId || hasStarted) return;

      try {
        const res = await fetch(`${API_ENDPOINT}/interview/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId }),
        });

        const data = await res.json();
        setHasStarted(true);

        if (data.bot_response) {
          setMessages(prev => [...prev, { sender: "ai", text: data.bot_response }]);
        }

        if (data.next_question) {
          setMessages(prev => [...prev, { sender: "ai", text: data.next_question }]);
        }
      } catch {
        setMessages(prev => [...prev, { sender: "ai", text: "⚠️ Interview failed to start." }]);
      }
    };

    startInterview();
  }, [hasStarted]);

  // Send text message
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userId = localStorage.getItem("user_id");
    if (!userId) return alert("Session expired.");

    const message = input.trim();
    setMessages(prev => [...prev, { sender: "user", text: message }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_ENDPOINT}/interview/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, user_response: message }),
      });

      const data = await res.json();

      if (data.bot_response) {
        setMessages(prev => [...prev, { sender: "ai", text: data.bot_response }]);
      }

      if (data.next_question) {
        setMessages(prev => [...prev, { sender: "ai", text: data.next_question }]);
      }

      // Detect end of session
      if (
        data.status === "session over" || 
        data.bot_response?.toLowerCase().includes("session has concluded") ||
        data.bot_response?.toLowerCase().includes("status: session over")
      ) {
        onSessionOver?.();
        return;
      }

      if (data.status === "completed" || timeExpired) {
        onFinalResponse?.(data);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      
      {/* Chat */}
      <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div className="flex items-end gap-2 max-w-[75%]">
              {m.sender === "ai" && (
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex justify-center items-center">
                  <Sparkles size={16} />
                </div>
              )}
              <div
                className={`px-4 py-3 rounded-2xl shadow-md ${
                  m.sender === "user"
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-white text-gray-800 rounded-bl-sm"
                }`}
              >
                {m.text}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2">
            <Loader2 className="animate-spin" /> <span>AI thinking…</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white backdrop-blur-lg">
        <div className="flex gap-3">
          <textarea
            value={input}
            rows={1}
            disabled={timeExpired}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your response..."
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
            className="border w-full p-3 rounded-xl"
          />

          <button onClick={sendMessage} disabled={!input.trim()} className="p-4 bg-blue-600 text-white rounded-xl">
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
