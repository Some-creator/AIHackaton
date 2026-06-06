import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import ServiceTags from './ServiceTags';
import SocialProfileTags from './SocialProfileTags';
import ActivityLog from './ActivityLog';
import StepNavigation from './StepNavigation';

const BUSINESS_TYPES = ['fixed location', 'mobile vendor', 'service provider'];

function AnalysisSection({ title, items, color, isDark }) {
  const colors = isDark ? {
    green: 'bg-green-950/30 border-green-900/50 text-green-400',
    yellow: 'bg-yellow-950/30 border-yellow-900/50 text-yellow-400',
    blue: 'bg-blue-950/30 border-blue-900/50 text-blue-400',
    red: 'bg-red-950/30 border-red-900/50 text-red-400',
  } : {
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

export default function BusinessAnalysis({ business, analysis, socialScrapes = [], onAnalyze, onContinue, loading, companyId, analysisLogs = [], benchmarkLogs = [], onBack, backLabel, onNext, nextLabel, navDisabled }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [profile, setProfile] = useState({ ...business });

  const updateField = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const hasAnalysis = Boolean(analysis);

  return (
    <div className="max-w-4xl mx-auto">
      <StepNavigation
        onBack={onBack}
        backLabel={backLabel}
        onNext={onNext}
        nextLabel={nextLabel}
        backDisabled={navDisabled}
        nextDisabled={navDisabled}
      />
      <div className="mb-8">
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Business Profile</h2>
        <p className={`mt-1 ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
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

      <div className={`rounded-2xl border p-6 mb-8 space-y-5 transition-all duration-300 ${isDark ? 'bg-zinc-900/60 border-zinc-800 backdrop-blur-md' : 'bg-white border-gray-200'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`text-sm font-semibold ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>Business Name</label>
            <input
              value={profile.name}
              onChange={(e) => updateField('name', e.target.value)}
              disabled={loading}
              className={`mt-1 w-full px-3 py-2 rounded-lg border outline-none transition focus:ring-2 focus:ring-hookline-500 ${isDark ? 'bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 disabled:bg-gray-50'}`}
            />
          </div>
          <div>
            <label className={`text-sm font-semibold ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>Location</label>
            <input
              value={profile.location}
              onChange={(e) => updateField('location', e.target.value)}
              disabled={loading}
              className={`mt-1 w-full px-3 py-2 rounded-lg border outline-none transition focus:ring-2 focus:ring-hookline-500 ${isDark ? 'bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 disabled:bg-gray-50'}`}
            />
          </div>
          <div>
            <label className={`text-sm font-semibold ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>Business Type</label>
            <select
              value={profile.type}
              onChange={(e) => updateField('type', e.target.value)}
              disabled={loading}
              className={`mt-1 w-full px-3 py-2 rounded-lg border outline-none transition focus:ring-2 focus:ring-hookline-500 ${isDark ? 'bg-zinc-950 border-zinc-700 text-white disabled:bg-zinc-900 text-zinc-400' : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-50'}`}
            >
              {BUSINESS_TYPES.map((t) => (
                <option key={t} value={t} className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-gray-900'}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={`text-sm font-semibold ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>Website</label>
            <input
              value={profile.website}
              onChange={(e) => updateField('website', e.target.value)}
              disabled={loading}
              className={`mt-1 w-full px-3 py-2 rounded-lg border outline-none transition focus:ring-2 focus:ring-hookline-500 ${isDark ? 'bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'}`}
            />
          </div>
        </div>

        <div>
          <label className={`text-sm font-semibold ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>Target Market</label>
          <textarea
            value={profile.targetMarket}
            onChange={(e) => updateField('targetMarket', e.target.value)}
            rows={2}
            disabled={loading}
            className={`mt-1 w-full px-3 py-2 rounded-lg border outline-none transition focus:ring-2 focus:ring-hookline-500 resize-none ${isDark ? 'bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500 disabled:bg-zinc-900 text-zinc-400' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 disabled:bg-gray-50'}`}
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
        <>
          <button
            onClick={() => onAnalyze(profile)}
            disabled={loading}
            className={`w-full md:w-auto px-8 py-3.5 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
              loading
                ? 'bg-hookline-500/40 text-white/60 cursor-not-allowed'
                : 'bg-hookline-500 hover:bg-hookline-600 text-white shadow-lg hover:shadow-hookline-500/30'
            }`}
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

          {loading && (
            <ActivityLog logs={analysisLogs} title="Agent 2 — Analyzing your business" />
          )}
        </>
      ) : (
        <>
          <div className="mb-8">
            <h2 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Business Analysis</h2>
            <p className={isDark ? 'text-zinc-400' : 'text-gray-600'}>AI-powered assessment of your strengths and opportunities.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <AnalysisSection title="Strengths" items={analysis.strengths} color="green" isDark={isDark} />
            <AnalysisSection title="Weaknesses" items={analysis.weaknesses} color="yellow" isDark={isDark} />
            <AnalysisSection title="Improvements" items={analysis.improvements} color="blue" isDark={isDark} />
            <AnalysisSection title="Missing" items={analysis.missing} color="red" isDark={isDark} />
          </div>

          <button
            onClick={() => onContinue(profile)}
            disabled={loading}
            className={`w-full md:w-auto px-8 py-3.5 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
              loading
                ? 'bg-hookline-500/40 text-white/60 cursor-not-allowed'
                : 'bg-hookline-500 hover:bg-hookline-600 text-white shadow-lg hover:shadow-hookline-500/30'
            }`}
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

          <ActivityLog logs={benchmarkLogs} title="Competitor benchmark" loading={loading} />
        </>
      )}
    </div>
  );
}
