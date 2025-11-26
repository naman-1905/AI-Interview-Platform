import React, { useState, useEffect, useRef } from "react";
import { Users, Clock, CheckCircle, AlertCircle } from "lucide-react";

const MAX_PARTICIPANTS = 3;
const STATUS_CONFIG = {
  checking: {
    title: "Checking Availability",
    icon: Users,
    color: "blue",
    description: "Please wait while we check for available slots...",
  },
  waiting: {
    title: "Waiting Room",
    icon: Clock,
    color: "yellow",
    description: "The room is full. You are in queue.",
  },
  admitted: {
    title: "Admitted!",
    icon: CheckCircle,
    color: "green",
    description: "Joining interview...",
  },
  error: {
    title: "Connection Error",
    icon: AlertCircle,
    color: "red",
    description: "Failed to connect. Try again.",
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
  const [status, setStatus] = useState("checking");
  const [activeCount, setActiveCount] = useState(0);
  const [queuePosition, setQueuePosition] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const pollRef = useRef(null);

  useEffect(() => {
    // Simulate initial loading
    const loadTimer = setTimeout(() => {
      setIsInitialLoad(false);
      checkAndJoin();
    }, 1000);

    return () => {
      clearTimeout(loadTimer);
      clearInterval(pollRef.current);
    };
  }, []);

  const fetchData = async () => {
    const [activeRes, queueRes] = await Promise.all([
      fetch("/api/meeting/active-count"),
      fetch("/api/queue/position"),
    ]);

    return {
      count: (await activeRes.json()).count,
      position: (await queueRes.json()).position,
    };
  };

  const checkAndJoin = async () => {
    try {
      setStatus("checking");
      const { count, position } = await fetchData();

      setActiveCount(count);

      if (count < MAX_PARTICIPANTS) return admit();

      setQueuePosition(position);
      setStatus("waiting");
      startPolling();
    } catch {
      setStatus("error");
    }
  };

  const admit = () => {
    setStatus("admitted");
    setTimeout(() => (window.location.href = "/interview"), 1500);
  };

  const startPolling = () => {
    pollRef.current = setInterval(async () => {
      try {
        const { count, position } = await fetchData();
        setActiveCount(count);
        setQueuePosition(position);
        if (count < MAX_PARTICIPANTS) {
          clearInterval(pollRef.current);
          admit();
        }
      } catch {}
    }, 3000);
  };

  if (isInitialLoad) return <SkeletonLoader />;

  const { title, icon: Icon, color, description } = STATUS_CONFIG[status];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-2xl w-full">
        <span className="inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold mb-4">
          Interview Meeting
        </span>

        <div className="space-y-6">
          <div className={`inline-flex items-center justify-center w-20 h-20 bg-${color}-100 rounded-full animate-pulse`}>
            <Icon className={`w-10 h-10 text-${color}-600`} />
          </div>

          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          <p className="text-gray-600">{description}</p>

          {status === "waiting" && (
            <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg space-y-3">
              <div className="flex justify-between font-medium text-gray-700">
                <span>Active Participants:</span>
                <span>{activeCount} / {MAX_PARTICIPANTS}</span>
              </div>
              <div className="flex justify-between font-medium text-gray-700">
                <span>Your Queue:</span>
                <span>#{queuePosition}</span>
              </div>
              <p className="text-sm text-gray-500 pt-2 border-t">You will be auto-redirected.</p>
            </div>
          )}

          {status === "error" && (
            <button className="bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700" onClick={checkAndJoin}>
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}