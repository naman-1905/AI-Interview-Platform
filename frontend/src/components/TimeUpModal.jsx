import { useState } from "react";
import { Loader2 } from "lucide-react";

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;

export default function TimeUpModal({ onViewResults }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Preparing your results...");

  const handleViewResults = async () => {
    setLoading(true);
    const userId = localStorage.getItem("user_id");

    if (!userId) {
      alert("Session expired. Please restart.");
      setLoading(false);
      return;
    }

    try {
      // Step 1: Try to fetch SWOT
      setStatus("Checking for SWOT analysis...");
      const swotResponse = await fetch(`${API_ENDPOINT}/swot/${userId}`);
      const swotData = await swotResponse.json();

      // Step 2: If SWOT not found, trigger response API to generate it
      if (!swotData.found || !swotData.swot_analysis) {
        setStatus("Generating your SWOT analysis...");
        
        await fetch(`${API_ENDPOINT}/interview/respond`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            user_id: userId, 
            user_response: "" 
          }),
        });

        // Wait a moment for processing
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Step 3: Navigate to SWOT page (which will fetch the data)
      setStatus("Loading your results...");
      await onViewResults();
      
    } catch (error) {
      console.error("Error processing results:", error);
      alert("Failed to load results. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-[90%] text-center animate-fadeIn">
        <h2 className="text-3xl font-bold text-gray-800 mb-3">
          Time's Up
        </h2>

        <p className="text-gray-600 text-lg mb-8">
          Your interview session has ended.
        </p>

        {loading && (
          <p className="text-sm text-blue-600 mb-4 animate-pulse">
            {status}
          </p>
        )}

        <button
          onClick={handleViewResults}
          disabled={loading}
          className="w-full py-3 bg-blue-700 hover:bg-blue-900 transition text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            "View Results"
          )}
        </button>
      </div>
    </div>
  );
}