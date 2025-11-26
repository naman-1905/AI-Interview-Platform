import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Users, Clock, CheckCircle, AlertCircle } from "lucide-react";

const STATUS_CONFIG = {
  checking: {
    title: "Checking Availability",
    icon: Users,
    color: "blue",
    description: "Please wait while we check for available slots...",
  },
  joining: {
    title: "Joining Queue",
    icon: Clock,
    color: "blue",
    description: "Adding you to the session...",
  },
  idle: {
    title: "Ready to Join",
    icon: CheckCircle,
    color: "green",
    description: "You're ready! Joining the queue now...",
  },
  in_session: {
    title: "In Session",
    icon: CheckCircle,
    color: "green",
    description: "You are now in the interview session!",
  },
  waiting: {
    title: "Waiting Room",
    icon: Clock,
    color: "yellow",
    description: "Please wait in queue. You will be notified when it's your turn.",
  },
  ready: {
    title: "Ready to Join",
    icon: CheckCircle,
    color: "green",
    description: "Preparing your interview session...",
  },
  error: {
    title: "Connection Error",
    icon: AlertCircle,
    color: "red",
    description: "Failed to connect. Please try again.",
  },
};

function SkeletonLoader() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-2xl w-full">
        {/* Badge skeleton */}
        <div className="h-8 w-40 bg-gray-200 rounded-full mx-auto mb-4 animate-pulse" />

        <div className="space-y-6">
          {/* Icon skeleton */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-200 rounded-full animate-pulse" />

          {/* Title skeleton */}
          <div className="h-8 bg-gray-200 rounded-lg w-3/5 mx-auto animate-pulse" />
          
          {/* Description skeleton */}
          <div className="h-5 bg-gray-200 rounded-lg w-4/5 mx-auto animate-pulse" />

          {/* Info box skeleton */}
          <div className="bg-gray-100 border border-gray-200 p-6 rounded-lg space-y-3">
            <div className="flex justify-between">
              <div className="h-5 bg-gray-200 rounded w-1/3 animate-pulse" />
              <div className="h-5 bg-gray-200 rounded w-1/6 animate-pulse" />
            </div>
            <div className="flex justify-between">
              <div className="h-5 bg-gray-200 rounded w-1/4 animate-pulse" />
              <div className="h-5 bg-gray-200 rounded w-1/6 animate-pulse" />
            </div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto pt-2 border-t animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WaitingArea() {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState("checking");
  const [queueNumber, setQueueNumber] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const pollRef = useRef(null);
  const hasJoinedRef = useRef(false);

  useEffect(() => {
    // Get user_id from localStorage (stored by ApplicationForm as "user_id")
    const userId = localStorage.getItem("user_id") || localStorage.getItem("userId") || location.state?.userId;
    
    if (!userId) {
      setStatus("error");
      setErrorMessage("No user ID found. Please complete the application form first.");
      setIsInitialLoad(false);
      return;
    }

    // Simulate initial loading then join queue
    const loadTimer = setTimeout(() => {
      setIsInitialLoad(false);
      joinQueue(userId);
    }, 1000);

    return () => {
      clearTimeout(loadTimer);
      clearInterval(pollRef.current);
    };
  }, [location.state]);

  const joinQueue = async (userId) => {
    // Prevent duplicate join requests
    if (hasJoinedRef.current) return;
    hasJoinedRef.current = true;

    try {
      setStatus("joining");
      const apiEndpoint = import.meta.env.VITE_API_ENDPOINT || "https://aibackend-1071940624586.asia-south2.run.app";
      
      const response = await fetch(`${apiEndpoint}/users/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "accept": "application/json",
        },
        body: JSON.stringify({
          user_id: userId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors (422)
        if (response.status === 422 && data.detail) {
          const errorMessages = data.detail
            .map(err => `${err.loc.join('.')}: ${err.msg}`)
            .join(", ");
          setErrorMessage(`Validation error: ${errorMessages}`);
        } else {
          setErrorMessage(data.message || "Failed to join queue. Please try again.");
        }
        setStatus("error");
        hasJoinedRef.current = false;
        return;
      }

      // Success (200)
      setStatus(data.status);
      setQueueNumber(data.queue_number);
      
      // Update localStorage with latest info
      localStorage.setItem("status", data.status);
      localStorage.setItem("queueNumber", data.queue_number.toString());

      // Handle different statuses
      if (data.status === "in_session") {
        // User is already in session, redirect to interview
        setTimeout(() => {
          navigate("/interview");
        }, 1500);
      } else if (data.status === "ready") {
        // User is ready to join, redirect to interview
        setTimeout(() => {
          navigate("/interview");
        }, 1500);
      } else if (data.status === "idle") {
        // User is idle/ready, need to call join again to get into queue
        setStatus("idle");
        setTimeout(() => {
          hasJoinedRef.current = false; // Reset flag to allow another join call
          joinQueue(userId);
        }, 1000);
      } else if (data.status === "waiting" || data.queue_number > 0) {
        // User is in queue, start polling
        setStatus("waiting");
        startPolling(userId);
      }

    } catch (error) {
      console.error("Error joining queue:", error);
      setStatus("error");
      setErrorMessage("Network error. Please check your connection and try again.");
      hasJoinedRef.current = false;
    }
  };

  const startPolling = (userId) => {
    pollRef.current = setInterval(async () => {
      try {
        const apiEndpoint = import.meta.env.VITE_API_ENDPOINT || "https://aibackend-1071940624586.asia-south2.run.app";
        
        const response = await fetch(`${apiEndpoint}/users/join`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "accept": "application/json",
          },
          body: JSON.stringify({
            user_id: userId
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setQueueNumber(data.queue_number);
          setStatus(data.status);
          
          // Update localStorage
          localStorage.setItem("status", data.status);
          localStorage.setItem("queueNumber", data.queue_number.toString());

          // If status changed to in_session or ready, redirect
          if (data.status === "in_session" || data.status === "ready") {
            clearInterval(pollRef.current);
            setTimeout(() => {
              navigate("/interview");
            }, 1500);
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 5000); // Poll every 5 seconds
  };

  const handleRetry = () => {
    const userId = localStorage.getItem("user_id") || localStorage.getItem("userId");
    if (!userId) {
      navigate("/"); // Go back to application form
      return;
    }
    
    hasJoinedRef.current = false;
    setErrorMessage("");
    setStatus("checking");
    joinQueue(userId);
  };

  if (isInitialLoad) return <SkeletonLoader />;

  const currentStatus = STATUS_CONFIG[status] || STATUS_CONFIG.error;
  const { title, icon: Icon, color, description } = currentStatus;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-2xl w-full">
        <span className="inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold mb-4">
          Interview Meeting
        </span>

        <div className="space-y-6">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${
            color === "blue" ? "bg-blue-100 animate-pulse" :
            color === "green" ? "bg-green-100" :
            color === "yellow" ? "bg-yellow-100 animate-pulse" :
            "bg-red-100"
          }`}>
            <Icon className={`w-10 h-10 ${
              color === "blue" ? "text-blue-600" :
              color === "green" ? "text-green-600" :
              color === "yellow" ? "text-yellow-600" :
              "text-red-600"
            }`} />
          </div>

          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          <p className="text-gray-600">{description}</p>

          {status === "waiting" && (
            <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg space-y-3">
              <div className="flex justify-between font-medium text-gray-700">
                <span>Your Position in Queue:</span>
                <span className="text-xl font-bold text-yellow-600">#{queueNumber}</span>
              </div>
              <p className="text-sm text-gray-500 pt-2 border-t">
                Please do not refresh or exit the window. You will be automatically redirected when it's your turn.
              </p>
              <div className="flex items-center justify-center gap-1 text-gray-400 mt-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <p className="text-sm text-red-700">{errorMessage}</p>
                </div>
              )}
              <button 
                className="bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition"
                onClick={handleRetry}
              >
                Try Again
              </button>
              <button 
                className="block mx-auto text-sm text-gray-500 hover:text-gray-700 underline"
                onClick={() => navigate("/")}
              >
                Go back to application form
              </button>
            </div>
          )}

          {(status === "in_session" || status === "ready") && (
            <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
              <p className="text-green-700 font-medium">
                Please do not refresh or exit the window. Redirecting to interview session...
              </p>
              <div className="flex items-center justify-center gap-1 text-green-400 mt-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}

          {(status === "idle" || status === "joining") && (
            <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
              <p className="text-blue-700 font-medium">
                Please do not refresh or exit the window. Connecting to the queue...
              </p>
              <div className="flex items-center justify-center gap-1 text-blue-400 mt-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}