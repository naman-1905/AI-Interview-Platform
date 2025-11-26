import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Clock, CheckCircle, AlertCircle } from "lucide-react";

const api = import.meta.env.VITE_API_ENDPOINT;

const STATUS_UI = {
  checking: { icon: Users, color: "blue", text: "Checking availability..." },
  joining: { icon: Clock, color: "blue", text: "Joining the queue..." },
  waiting: { icon: Clock, color: "yellow", text: "Waiting for your turn..." },
  ready: { icon: CheckCircle, color: "green", text: "Preparing session..." },
  in_session: { icon: CheckCircle, color: "green", text: "Redirecting..." },
  idle: { icon: Clock, color: "blue", text: "Retrying..." },
  error: { icon: AlertCircle, color: "red", text: "Connection error" },
};

const Loader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-pulse text-lg text-gray-500">Loading...</div>
  </div>
);

export default function WaitingArea() {
  const navigate = useNavigate();
  const userId = localStorage.getItem("user_id");
  const [status, setStatus] = useState("checking");
  const [queue, setQueue] = useState(null);
  const [error, setError] = useState("");
  const poller = useRef(null);

  useEffect(() => {
    if (!userId) return fail("User not found. Restart application.");
    setTimeout(() => joinQueue(), 800);
    return () => clearInterval(poller.current);
  }, []);

  const fail = (msg) => {
    setStatus("error");
    setError(msg);
  };

  const joinQueue = async () => {
    setStatus("joining");
    try {
      const res = await fetch(`${api}/users/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });

      const data = await res.json();
      if (!res.ok) return fail(data.message || "Unable to join queue");

      updateState(data);
      if (["ready", "in_session"].includes(data.status)) return redirect();
      startPolling();
    } catch {
      fail("Network error. Try again.");
    }
  };

  const startPolling = () => {
    poller.current = setInterval(async () => {
      try {
        const res = await fetch(`${api}/status/${userId}`);
        if (!res.ok) return;
        const data = await res.json();
        updateState(data);
        if (["ready", "in_session"].includes(data.status)) redirect();
      } catch {}
    }, 5000);
  };

  const updateState = (data) => {
    setQueue(data.queue_number);
    setStatus(data.status);
    localStorage.setItem("status", data.status);
    localStorage.setItem("queue", data.queue_number);
  };

  const redirect = () => {
    clearInterval(poller.current);
    setTimeout(() => navigate("/interview"), 1200);
  };

  if (status === "checking") return <Loader />;

  const ui = STATUS_UI[status] || STATUS_UI.error;
  const Icon = ui.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-${ui.color}-100`}>
          <Icon className={`w-10 h-10 text-${ui.color}-600`} />
        </div>

        <h1 className="mt-4 text-xl font-bold capitalize">{status.replace("_", " ")}</h1>
        <p className="text-gray-500 mt-1">{ui.text}</p>

        {queue !== null && status === "waiting" && (
          <p className="mt-4 text-lg font-semibold text-yellow-600">Queue: #{queue}</p>
        )}

        {status === "error" && (
          <>
            <p className="text-red-600 mt-4 text-sm">{error}</p>
            <button
              className="mt-4 bg-blue-600 text-white px-5 py-2 rounded-lg"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </>
        )}
      </div>
    </div>
  );
}
