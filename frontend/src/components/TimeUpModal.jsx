import React from "react";
import { useNavigate } from "react-router-dom";

export default function TimeUpModal() {
  const navigate = useNavigate();

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
          onClick={() => navigate("/result")}
          className="w-full py-3 bg-blue-700 hover:bg-blue-900 transition text-white font-semibold rounded-xl"
        >
          View Results
        </button>
      </div>
    </div>
  );
}
