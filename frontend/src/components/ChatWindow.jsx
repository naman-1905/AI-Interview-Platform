import { useState, useEffect, useRef } from "react";
import { Mic, Send, Loader2, Sparkles } from "lucide-react";
import { useLocation } from "react-router-dom";

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;

export default function ChatWindow({ timeExpired, onFinalResponse, voiceEnabled }) {
  const location = useLocation();
  const [messages, setMessages] = useState(() => JSON.parse(localStorage.getItem("interviewChat") || "[]"));
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const chatRef = useRef(null);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");

  // Scroll on new messages
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Persist chat
  useEffect(() => {
    localStorage.setItem("interviewChat", JSON.stringify(messages));
  }, [messages]);

  // Clear when leaving interview
  useEffect(() => {
    return () => {
      if (location.pathname !== "/interview") localStorage.removeItem("interviewChat");
    };
  }, [location.pathname]);

  // TEXT TO SPEECH - Enhanced with real-time narration
  const speak = (text) => {
    if (!voiceEnabled) return;
    if (!window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = "en-US";
    msg.rate = 1.07;
    msg.onstart = () => console.log("Speech started");
    msg.onend = () => console.log("Speech ended");
    msg.onerror = (e) => console.error("Speech error:", e);
    window.speechSynthesis.speak(msg);
  };

  // SPEECH TO TEXT - Initialize
  useEffect(() => {
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported");
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onstart = () => setListening(true);
    
    rec.onend = () => {
      // Auto-restart if still supposed to be listening
      if (recognitionRef.current && listening) {
        try {
          rec.start();
        } catch (e) {
          console.error("Error restarting recognition:", e);
        }
      }
    };

    rec.onerror = (e) => {
      console.error("Speech recognition error:", e.error);
      if (e.error !== "no-speech") {
        setListening(false);
      }
    };

    rec.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += transcript + " ";
        } else {
          interim += transcript;
        }
      }
      setInput(finalTranscriptRef.current + interim);
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleMic = () => {
    if (!recognitionRef.current) return;
    
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
      finalTranscriptRef.current = "";
    } else {
      finalTranscriptRef.current = input;
      recognitionRef.current.start();
    }
  };

  // START INTERVIEW
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
          speak(data.bot_response);
        }
        if (data.next_question) {
          setMessages(prev => [...prev, { sender: "ai", text: data.next_question }]);
          speak(data.next_question);
        }
      } catch {
        setMessages(prev => [...prev, { sender: "ai", text: "⚠ Interview failed to start." }]);
      }
    };

    startInterview();
  }, [voiceEnabled, hasStarted]);

  // SEND RESPONSE
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userId = localStorage.getItem("user_id");
    if (!userId) return alert("Session expired.");

    const message = input.trim();
    setMessages(prev => [...prev, { sender: "user", text: message }]);
    setInput("");
    finalTranscriptRef.current = "";
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
        speak(data.bot_response);
      }

      if (data.next_question) {
        setMessages(prev => [...prev, { sender: "ai", text: data.next_question }]);
        speak(data.next_question);
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
            placeholder="Speak or type your response..."
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
            className="border w-full p-3 rounded-xl"
          />

          {/* <button onClick={toggleMic} disabled={!recognitionRef.current} className={`p-4 rounded-xl transition ${listening ? "bg-red-500 text-white" : "bg-gray-200"}`}>
            <Mic size={20} className={listening ? "animate-pulse" : ""} />
          </button> */}

          <button onClick={sendMessage} disabled={!input.trim()} className="p-4 bg-blue-600 text-white rounded-xl">
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
