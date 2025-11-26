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
        </div>
      </div>
    </nav>
  );
}