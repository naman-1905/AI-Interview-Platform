import { useState, useEffect, useRef } from "react";
import { Mic, Send, Loader2, Sparkles } from "lucide-react";
import { useLocation } from "react-router-dom";

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;

export default function ChatWindow({ timeExpired, onFinalResponse }) {
  const location = useLocation();

  const [messages, setMessages] = useState(() => {
    const cached = localStorage.getItem("interviewChat");
    return cached ? JSON.parse(cached) : [];
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);

  const chatRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto Scroll
  useEffect(() => {
    chatRef.current?.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  // Save messages whenever they change
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
    rec.continuous = false;

    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (e) =>
      setInput((prev) => prev + e.results[0][0].transcript);

    recognitionRef.current = rec;
  }, []);

  // Start interview on component mount
  useEffect(() => {
    const startInterview = async () => {
      const userId = localStorage.getItem("user_id");
      if (!userId || interviewStarted) return;

      try {
        const response = await fetch(`${API_ENDPOINT}/interview/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId }),
        });

        const data = await response.json();
        
        if (data.bot_response) {
          const aiMsg = { sender: "ai", text: data.bot_response };
          setMessages((prev) => [...prev, aiMsg]);
          setInterviewStarted(true);
        }
      } catch (error) {
        console.error("Failed to start interview:", error);
        const errorMsg = { 
          sender: "ai", 
          text: "Failed to connect. Please try again." 
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    };

    startInterview();
  }, [interviewStarted]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userId = localStorage.getItem("user_id");
    if (!userId) {
      alert("User ID not found. Please log in again.");
      return;
    }

    const userMsg = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    const userInput = input;
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(`${API_ENDPOINT}/interview/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          user_response: userInput,
        }),
      });

      const data = await response.json();

      if (data.bot_response) {
        const aiResponse = { sender: "ai", text: data.bot_response };
        setMessages((prev) => [...prev, aiResponse]);
      }

      if (timeExpired || data.status === "completed") {
        onFinalResponse?.();
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      const errorMsg = { 
        sender: "ai", 
        text: "Failed to send message. Please try again." 
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const toggleMic = () => {
    if (listening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      
      {/* Chat List */}
      <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4">

        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center">
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
      <div className="flex-shrink-0 p-4 bg-white/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex gap-3 items-end">
          <textarea
            value={input}
            disabled={timeExpired || loading}
            placeholder="Type your message..."
            rows={1}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 p-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            onClick={toggleMic} 
            disabled={loading || timeExpired} 
            className="p-4 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50 transition"
          >
            <Mic size={20} className={listening ? "text-red-500 animate-pulse" : "text-gray-700"} />
          </button>
          <button 
            onClick={sendMessage} 
            disabled={!input.trim() || loading || timeExpired} 
            className="p-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}