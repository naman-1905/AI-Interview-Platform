import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Clock, CheckCircle, AlertCircle } from "lucide-react";

const api = import.meta.env.VITE_API_ENDPOINT;

const STATUS_CONFIG = {
  checking: { icon: Users, bgColor: "bg-blue-100", textColor: "text-blue-600", text: "Checking availability..." },
  joining: { icon: Clock, bgColor: "bg-blue-100", textColor: "text-blue-600", text: "Joining the queue..." },
  waiting: { icon: Clock, bgColor: "bg-yellow-100", textColor: "text-yellow-600", text: "Waiting for your turn..." },
  ready: { icon: CheckCircle, bgColor: "bg-green-100", textColor: "text-green-600", text: "Preparing your session..." },
  in_session: { icon: CheckCircle, bgColor: "bg-green-100", textColor: "text-green-600", text: "Session ready! Redirecting..." },
  error: { icon: AlertCircle, bgColor: "bg-red-100", textColor: "text-red-600", text: "Connection error" },
};

const SkeletonLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
    <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
      <div className="animate-pulse space-y-6">
        {/* Icon skeleton */}
        <div className="w-20 h-20 mx-auto rounded-full bg-gray-200"></div>
        
        {/* Title skeleton */}
        <div className="space-y-3">
          <div className="h-8 bg-gray-200 rounded-lg w-2/3 mx-auto"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
        </div>

        {/* Queue card skeleton */}
        <div className="mt-6 p-4 bg-gray-100 rounded-lg border border-gray-200">
          <div className="h-3 bg-gray-200 rounded w-1/3 mx-auto mb-2"></div>
          <div className="h-10 bg-gray-200 rounded-lg w-20 mx-auto"></div>
        </div>

        {/* Status indicator skeleton */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    </div>
  </div>
);

const StatusCard = ({ ui, status, queueNumber, error, retryCount, onRetry }) => {
  const Icon = ui.icon;
  
  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
      <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${ui.bgColor} transition-all`}>
        <Icon className={`w-10 h-10 ${ui.textColor}`} />
      </div>

      <h1 className="mt-6 text-2xl font-bold text-gray-800 capitalize">
        {status.replace(/_/g, " ")}
      </h1>
      <p className="text-gray-500 mt-2 text-sm">{ui.text}</p>

      {queueNumber !== null && queueNumber > 0 && status === "waiting" && (
        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-xs text-gray-600 mb-1 uppercase">Your Position</p>
          <p className="text-4xl font-bold text-yellow-600">#{queueNumber}</p>
        </div>
      )}

      {queueNumber === 0 && status === "waiting" && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-sm font-medium text-green-700">You're next in line!</p>
        </div>
      )}

      {status === "error" && (
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
          <button
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            onClick={onRetry}
          >
            Retry Connection {retryCount > 0 && `(Attempt ${retryCount + 1})`}
          </button>
        </div>
      )}

      {status === "waiting" && (
        <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-center gap-2 text-gray-400">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-xs">Checking status every 5 seconds</span>
        </div>
      )}

      {status === "in_session" && (
        <div className="mt-6 w-8 h-8 mx-auto border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
      )}
    </div>
  );
};

export default function WaitingArea() {
  const navigate = useNavigate();
  const userId = localStorage.getItem("user_id");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("checking");
  const [queueNumber, setQueueNumber] = useState(null);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  
  const pollerRef = useRef(null);
  const isMountedRef = useRef(true);
  const isRedirectingRef = useRef(false);
  const consecutiveErrorsRef = useRef(0);
  const MAX_ERRORS = 3;

  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial skeleton loading
    const loadingTimer = setTimeout(() => setLoading(false), 1000);
    
    if (!userId) {
      setStatus("error");
      setError("User ID not found. Please restart the application.");
      return;
    }
    
    const timer = setTimeout(() => joinQueue(), 1800);
    return () => {
      isMountedRef.current = false;
      clearInterval(pollerRef.current);
      clearTimeout(timer);
      clearTimeout(loadingTimer);
    };
  }, [userId]);

  const updateState = (data) => {
    if (!isMountedRef.current) return;
    setStatus(data.status);
    setQueueNumber(data.queue_number);
    try {
      localStorage.setItem("session_status", data.status);
      localStorage.setItem("queue_number", String(data.queue_number));
    } catch (err) {
      console.error("localStorage error:", err);
    }
  };

  const handleError = (message) => {
    consecutiveErrorsRef.current++;
    if (consecutiveErrorsRef.current >= MAX_ERRORS) {
      clearInterval(pollerRef.current);
      setStatus("error");
      setError(message);
    }
  };

  const joinQueue = async () => {
    if (!isMountedRef.current) return;
    setStatus("joining");
    setError("");
    
    try {
      const response = await fetch(`${api}/users/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!isMountedRef.current) return;
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || "Failed to join queue");
      
      updateState(data);
      if (data.status === "in_session") {
        redirectToInterview();
      } else {
        startPolling();
      }
      consecutiveErrorsRef.current = 0;
      setRetryCount(0);
    } catch (err) {
      if (!isMountedRef.current) return;
      setStatus("error");
      setError(err.message || "Network error. Please check your connection.");
    }
  };

  const startPolling = () => {
    if (pollerRef.current) clearInterval(pollerRef.current);
    consecutiveErrorsRef.current = 0;

    pollerRef.current = setInterval(async () => {
      if (!isMountedRef.current || isRedirectingRef.current) {
        clearInterval(pollerRef.current);
        return;
      }

      try {
        const response = await fetch(`${api}/status/${userId}`, {
          method: "GET",
          headers: { "Accept": "application/json" }
        });
        
        if (!isMountedRef.current) return;
        if (!response.ok) {
          handleError("Lost connection to server. Please retry.");
          return;
        }
        
        const data = await response.json();
        consecutiveErrorsRef.current = 0;
        updateState(data);
        
        if (data.status === "in_session") {
          clearInterval(pollerRef.current);
          redirectToInterview();
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        handleError("Connection lost. Please check your network and retry.");
      }
    }, 5000);
  };

  const redirectToInterview = () => {
    if (isRedirectingRef.current) return;
    isRedirectingRef.current = true;
    setStatus("in_session");
    setTimeout(() => isMountedRef.current && navigate("/interview"), 1000);
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setStatus("checking");
    setError("");
    setTimeout(() => joinQueue(), 500);
  };

  if (loading) return <SkeletonLoader />;

  const ui = STATUS_CONFIG[status] || STATUS_CONFIG.error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <StatusCard ui={ui} status={status} queueNumber={queueNumber} error={error} retryCount={retryCount} onRetry={handleRetry} />
    </div>
  );
}