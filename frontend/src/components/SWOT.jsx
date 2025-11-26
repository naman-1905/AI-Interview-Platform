import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_ENDPOINT;
const USER_ID = "8e8ab2fa06d24a6a929ec62edde4cac7";

// Mapping for SWOT categories to display properties
const swotConfig = {
  strengths: {
    key: "Strengths",
    color: "bg-green-50 border-green-200",
  },
  weaknesses: {
    key: "Weaknesses",
    color: "bg-red-50 border-red-200",
  },
  opportunities: {
    key: "Opportunities",
    color: "bg-blue-50 border-blue-200",
  },
  threats: {
    key: "Threats",
    color: "bg-yellow-50 border-yellow-200",
  },
};

function SkeletonLoader() {
  return (
    <div className="min-h-screen p-10 font-sans flex items-center bg-gray-50">
      <div className="max-w-4xl mx-auto w-full bg-white rounded-2xl p-10 shadow-2xl">
        <div className="h-10 bg-gray-200 rounded-lg w-3/5 mx-auto mb-2 animate-pulse" />
        <div className="h-5 bg-gray-200 rounded-lg w-4/5 mx-auto mb-8 animate-pulse" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-gray-100 border border-gray-200 rounded-xl p-6 h-full flex flex-col"
            >
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-3 animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-4/5 animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        <div className="h-12 bg-gray-200 rounded-lg mt-10 animate-pulse" />
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="min-h-screen p-10 font-sans flex items-center bg-gray-50">
      <div className="max-w-4xl mx-auto w-full bg-white rounded-2xl p-10 shadow-2xl">
        <div className="text-center">
          <div className="text-6xl mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Unable to Load SWOT Analysis
          </h2>
          <p className="text-gray-600 mb-6">{message}</p>
          <button
            onClick={onRetry}
            className="px-6 py-3 bg-blue-800 text-white rounded-lg font-semibold hover:bg-blue-900 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SWOT() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [swotData, setSwotData] = useState(null);

  const fetchSWOT = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/swot/${USER_ID}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to fetch SWOT analysis");
      }

      const data = await response.json();

      if (!data.found || !data.swot_analysis) {
        throw new Error("SWOT analysis not yet generated");
      }

      setSwotData(data.swot_analysis);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSWOT();
  }, []);

  const handleBackToHome = () => {
    // Clear all cookies
    document.cookie.split(";").forEach((cookie) => {
      document.cookie = cookie
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/");
    });

    navigate("/");
  };

  if (loading) return <SkeletonLoader />;
  if (error) return <ErrorState message={error} onRetry={fetchSWOT} />;

  const displayData = Object.entries(swotConfig).map(([key, config]) => {
    const content = swotData?.[key];
    const description = Array.isArray(content)
      ? content.join(". ")
      : content || "No data available";

    return {
      key: config.key,
      description,
      color: config.color,
    };
  });

  return (
    <div className="min-h-screen p-10 font-sans bg-gray-50">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl p-10 shadow-2xl">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-2">
          Your SWOT Analysis
        </h1>
        <p className="text-center text-gray-600 mb-12">
          Based on your interview responses
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayData.map((item) => (
            <div
              key={item.key}
              className={`border rounded-xl p-6 ${item.color}`}
            >
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                {item.key}
              </h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-4 mt-10">
          <button
            onClick={fetchSWOT}
            className="w-full px-6 py-3 bg-blue-800 text-white rounded-lg font-semibold hover:bg-blue-900 transition-colors"
          >
            Refresh SWOT Analysis
          </button>

          <button
            onClick={handleBackToHome}
            className="w-full px-6 py-3 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-900 transition-colors"
          >
            Back to Home (Clear Session)
          </button>
        </div>
      </div>
    </div>
  );
}
