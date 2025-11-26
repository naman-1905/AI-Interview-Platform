import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function TimeUpModal({ onViewResults }) {
  const [loading, setLoading] = useState(false);

  const handleViewResults = async () => {
    setLoading(true);
    try {
      await onViewResults();
    } catch (error) {
      console.error("Error viewing results:", error);
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