import { useNavigate } from "react-router-dom";

export default function SWOT() {
  const navigate = useNavigate();

  const swotData = [
    {
      key: 'Strengths',
      description:
        'Strong problem-solving skills, clear communication, and consistent performance in previous roles.',
      color: 'bg-green-50 border-green-200',
    },
    {
      key: 'Weaknesses',
      description:
        'Tends to overanalyze at times and is still improving time management in fast-paced environments.',
      color: 'bg-red-50 border-red-200',
    },
    {
      key: 'Opportunities',
      description:
        'High potential to grow into leadership roles, upskill in system design, and mentor junior engineers.',
      color: 'bg-blue-50 border-blue-200',
    },
    {
      key: 'Threats',
      description:
        'Risk of burnout without proper work-life balance and needs more exposure to large-scale production systems.',
      color: 'bg-yellow-50 border-yellow-200',
    },
  ];

  return (
    <div className="min-h-screen p-10 font-sans flex items-center bg-gray-50">
      <div className="max-w-4xl mx-auto w-full bg-white rounded-2xl p-10 shadow-2xl">
        <h2 className="text-3xl md:text-4xl text-center font-bold text-gray-800 mb-2">
          Candidate SWOT Overview
        </h2>
        <p className="text-gray-500 text-sm md:text-base font-medium text-center mb-8">
          A quick snapshot of the candidate&apos;s strengths, weaknesses,
          opportunities and threats
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {swotData.map((item) => (
            <div
              key={item.key}
              className={`${item.color} border rounded-xl p-6 h-full flex flex-col transition-all hover:shadow-lg hover:scale-[1.02]`}
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {item.key}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        {/* Navigation Button */}
        <button
          onClick={() => navigate('/')}
          className="w-full mt-10 py-3.5 bg-blue-800 text-white rounded-lg font-semibold cursor-pointer hover:bg-blue-900 transition-colors"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
