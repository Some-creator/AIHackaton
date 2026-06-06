export default function CompetitorBenchmark({ competitors, onContinue, loading }) {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Competitor Benchmark</h2>
        <p className="text-gray-600 mt-1">
          How you stack up against similar businesses in your market.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        {competitors.map((comp, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg text-gray-900">{comp.name}</h3>
                <p className="text-sm text-gray-500">{comp.targetMarket}</p>
              </div>
              {comp.website && (
                <a
                  href={comp.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-hookline-500 hover:text-hookline-600 text-sm"
                >
                  Visit
                </a>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-green-700 mb-2">Their Strengths</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  {comp.strengths.map((s, j) => (
                    <li key={j} className="flex gap-2">
                      <span className="text-green-500">+</span> {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-red-700 mb-2">Their Weaknesses</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  {comp.weaknesses.map((w, j) => (
                    <li key={j} className="flex gap-2">
                      <span className="text-red-400">-</span> {w}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-800 mb-2">
                  They Have, You Don&apos;t
                </h4>
                <ul className="text-sm text-amber-900 space-y-1">
                  {comp.theyHaveYouDont.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onContinue}
        disabled={loading}
        className="w-full md:w-auto px-8 py-3.5 bg-hookline-500 hover:bg-hookline-600 disabled:bg-gray-300 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Finding market gaps...
          </>
        ) : (
          'Find Market Gaps'
        )}
      </button>
    </div>
  );
}
