import React from "react";
import { User } from "lucide-react";

export default function Navbar({ name = "John Doe", email = "john@example.com" }) {
  return (
    <nav className="bg-white shadow-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Title */}
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-800">
              Interview Session
            </h1>
          </div>

          {/* Right side - User Info */}
          <div className="flex items-center space-x-3 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
            <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-800">{name}</span>
              <span className="text-xs text-gray-500">{email}</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}