import { useState } from 'react';
import ServiceTags from './ServiceTags';
import SocialProfileTags from './SocialProfileTags';

const BUSINESS_TYPES = ['fixed location', 'mobile vendor', 'service provider'];

function AnalysisSection({ title, items, color }) {
  const colors = {
    green: 'bg-green-50 border-green-200 text-green-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    red: 'bg-red-50 border-red-200 text-red-800',
  };

  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <h3 className="font-semibold text-sm uppercase tracking-wide mb-3">{title}</h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm flex gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current flex-shrink-0 opacity-60" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function BusinessAnalysis({ business, analysis, socialScrapes = [], onAnalyze, onContinue, loading, companyId, benchmarkLogs = [] }) {
  const [profile, setProfile] = useState({ ...business });

  const updateField = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const hasAnalysis = Boolean(analysis);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Business Profile</h2>
        <p className="text-gray-600 mt-1">
          {hasAnalysis
            ? 'Review your profile and analysis below.'
            : 'Review and edit your business details, then run the analysis.'}
        </p>
        {companyId ? (
          <p className="text-xs text-gray-400 mt-2">Saved to Firestore · companies/{companyId}</p>
        ) : (
          <p className="text-xs text-amber-600 mt-2">
            Not saved to database — check Firebase credentials in .env (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Business Name</label>
            <input
              value={profile.name}
              onChange={(e) => updateField('name', e.target.value)}
              disabled={loading}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-hookline-500 outline-none disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Location</label>
            <input
              value={profile.location}
              onChange={(e) => updateField('location', e.target.value)}
              disabled={loading}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-hookline-500 outline-none disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Business Type</label>
            <select
              value={profile.type}
              onChange={(e) => updateField('type', e.target.value)}
              disabled={loading}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-hookline-500 outline-none bg-white disabled:bg-gray-50"
            >
              {BUSINESS_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Website</label>
            <input
              value={profile.website}
              onChange={(e) => updateField('website', e.target.value)}
              disabled={loading}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-hookline-500 outline-none disabled:bg-gray-50"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Target Market</label>
          <textarea
            value={profile.targetMarket}
            onChange={(e) => updateField('targetMarket', e.target.value)}
            rows={2}
            disabled={loading}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-hookline-500 outline-none resize-none disabled:bg-gray-50"
          />
        </div>

        <ServiceTags
          label="Services"
          items={profile.services}
          onChange={(services) => updateField('services', services)}
          placeholder="e.g. Mobile beverage catering"
        />

        <SocialProfileTags
          items={profile.socialProfiles || []}
          socialScrapes={socialScrapes}
          onChange={(socialProfiles) => updateField('socialProfiles', socialProfiles)}
        />
      </div>

      {!hasAnalysis ? (
        <button
          onClick={() => onAnalyze(profile)}
          disabled={loading}
          className="w-full md:w-auto px-8 py-3.5 bg-hookline-500 hover:bg-hookline-600 disabled:bg-gray-300 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing your business...
            </>
          ) : (
            'Analyze My Business'
          )}
        </button>
      ) : (
        <>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Business Analysis</h2>
            <p className="text-gray-600">AI-powered assessment of your strengths and opportunities.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <AnalysisSection title="Strengths" items={analysis.strengths} color="green" />
            <AnalysisSection title="Weaknesses" items={analysis.weaknesses} color="yellow" />
            <AnalysisSection title="Improvements" items={analysis.improvements} color="blue" />
            <AnalysisSection title="Missing" items={analysis.missing} color="red" />
          </div>

          <button
            onClick={() => onContinue(profile)}
            disabled={loading}
            className="w-full md:w-auto px-8 py-3.5 bg-hookline-500 hover:bg-hookline-600 disabled:bg-gray-300 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Benchmarking competitors...
              </>
            ) : (
              'Continue to Competitor Benchmark'
            )}
          </button>
        </>
      )}
    </div>
  );
}
