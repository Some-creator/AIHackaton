import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { GlassAnalysisCard } from '@/components/ui/liquid-glass';
import ServiceTags from './ServiceTags';
import SocialProfileTags from './SocialProfileTags';
import ActivityLog from './ActivityLog';
import StepNavigation from './StepNavigation';
import {
  US_STATE_OPTIONS,
  applyUserLocationUpdate,
  initialProfileFromBusiness,
  isLocationComplete,
} from '../lib/locationUtils';

const BUSINESS_TYPES = ['fixed location', 'mobile vendor', 'service provider'];

function RequiredMark() {
  return (
    <span className="text-red-500 ml-0.5" aria-hidden="true">
      *
    </span>
  );
}

function FieldLabel({ children, required = false, isDark, hint }) {
  return (
    <label className={`text-sm font-semibold ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
      {children}
      {required && <RequiredMark />}
      {hint && (
        <span className={`font-normal ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}> {hint}</span>
      )}
    </label>
  );
}

export default function BusinessAnalysis({ business, analysis, socialScrapes = [], onAnalyze, onContinue, loading, companyId, analysisLogs = [], benchmarkLogs = [], analysisFinishing = false, benchmarkFinishing = false, onBack, backLabel, onNext, nextLabel, navDisabled }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [profile, setProfile] = useState(() => initialProfileFromBusiness(business));

  const updateField = (field, value) => {
    setProfile((prev) => applyUserLocationUpdate({ ...prev, [field]: value }));
  };

  const hasAnalysis = Boolean(analysis);
  const locationReady = isLocationComplete(profile);
  const needsLocation = profile.locationNeedsInput || !locationReady;

  const handleAnalyze = () => {
    const updatedProfile = applyUserLocationUpdate(profile);
    setProfile(updatedProfile);
    if (!isLocationComplete(updatedProfile)) return;
    onAnalyze(updatedProfile);
  };

  const handleContinue = () => {
    const updatedProfile = applyUserLocationUpdate(profile);
    setProfile(updatedProfile);
    if (!isLocationComplete(updatedProfile)) return;
    onContinue(updatedProfile);
  };

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
      <div className="mb-8 animate-rise">
        <p className="eyebrow mb-2">Step 2 · Profile</p>
        <h2 className={`font-section-title text-2xl sm:text-3xl ${isDark ? 'text-white' : 'text-gray-900'}`}>Business Profile</h2>
        <p className={`mt-1.5 ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
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
        {needsLocation && (
          <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            isDark ? 'bg-amber-950/30 border-amber-800/50 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <span className="font-semibold">Confirm your location</span>
            {' — '}
            {profile.locationMessage || 'We could not confidently determine your city and state from your website. Enter them below before continuing.'}
          </div>
        )}
      </div>

      <div className={`rounded-2xl border p-6 mb-8 space-y-5 transition-all duration-300 ${isDark ? 'bg-zinc-900/60 border-zinc-800 backdrop-blur-md' : 'bg-white border-gray-200'}`}>
        <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
          <span className="text-red-500">*</span> Required fields
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel required isDark={isDark}>Business Name</FieldLabel>
            <input
              value={profile.name}
              onChange={(e) => updateField('name', e.target.value)}
              disabled={loading}
              className={`mt-1 w-full px-3 py-2 rounded-lg border outline-none transition focus:ring-2 focus:ring-hookline-500 ${isDark ? 'bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 disabled:bg-gray-50'}`}
            />
          </div>
          <div>
            <FieldLabel required isDark={isDark}>City</FieldLabel>
            <input
              value={profile.city || ''}
              onChange={(e) => updateField('city', e.target.value)}
              placeholder="Richmond"
              disabled={loading}
              className={`mt-1 w-full px-3 py-2 rounded-lg border outline-none transition focus:ring-2 focus:ring-hookline-500 ${isDark ? 'bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 disabled:bg-gray-50'}`}
            />
          </div>
          <div>
            <FieldLabel required isDark={isDark}>State</FieldLabel>
            <select
              value={profile.state || ''}
              onChange={(e) => updateField('state', e.target.value)}
              disabled={loading}
              className={`mt-1 w-full px-3 py-2 rounded-lg border outline-none transition focus:ring-2 focus:ring-hookline-500 ${isDark ? 'bg-zinc-950 border-zinc-700 text-white disabled:bg-zinc-900 text-zinc-400' : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-50'}`}
            >
              <option value="">Select state</option>
              {US_STATE_OPTIONS.map(([abbrev, name]) => (
                <option key={abbrev} value={abbrev} className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-gray-900'}>
                  {abbrev} — {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel isDark={isDark} hint="(recommended)">ZIP code</FieldLabel>
            <input
              value={profile.zipCode || ''}
              onChange={(e) => updateField('zipCode', e.target.value)}
              placeholder="77469"
              inputMode="numeric"
              maxLength={5}
              disabled={loading}
              className={`mt-1 w-full px-3 py-2 rounded-lg border outline-none transition focus:ring-2 focus:ring-hookline-500 ${isDark ? 'bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 disabled:bg-gray-50'}`}
            />
          </div>
          {locationReady && (
            <div className="md:col-span-2">
              <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                Search area: <span className="font-medium">{profile.location}</span>
              </p>
            </div>
          )}
          <div>
            <FieldLabel required isDark={isDark}>Business Type</FieldLabel>
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
            <FieldLabel required isDark={isDark}>Website</FieldLabel>
            <input
              value={profile.website}
              onChange={(e) => updateField('website', e.target.value)}
              disabled={loading}
              className={`mt-1 w-full px-3 py-2 rounded-lg border outline-none transition focus:ring-2 focus:ring-hookline-500 ${isDark ? 'bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'}`}
            />
          </div>
        </div>

        <div>
          <FieldLabel isDark={isDark} hint="(optional)">Target Market</FieldLabel>
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
          optional
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
            onClick={handleAnalyze}
            disabled={loading || needsLocation}
            className={`w-full md:w-auto px-8 py-3.5 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
              loading || needsLocation
                ? 'bg-hookline-500/40 text-white/60 cursor-not-allowed'
                : 'bg-hookline-500 hover:bg-hookline-600 text-white shadow-glow-sm hover:shadow-glow hover:-translate-y-0.5'
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

          {(loading || analysisFinishing) && (
            <ActivityLog
              logs={analysisLogs}
              title="Agent 2 — Analyzing your business"
              loading={loading}
              finishing={analysisFinishing}
            />
          )}
        </>
      ) : (
        <>
          <div className="mb-8 animate-rise">
            <p className="eyebrow mb-2">Step 2 · Analysis</p>
            <h2 className={`font-section-title text-2xl sm:text-3xl mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Business Analysis
            </h2>
            <p className={`font-body-medium ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
              AI-powered assessment of your strengths and opportunities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            <GlassAnalysisCard title="Strengths" items={analysis.strengths} color="green" isDark={isDark} />
            <GlassAnalysisCard title="Weaknesses" items={analysis.weaknesses} color="orange" isDark={isDark} />
            <GlassAnalysisCard title="Improvements" items={analysis.improvements} color="blue" isDark={isDark} />
            <GlassAnalysisCard title="Missing" items={analysis.missing} color="violet" isDark={isDark} />
          </div>

          <button
            onClick={handleContinue}
            disabled={loading || needsLocation}
            className={`w-full md:w-auto px-8 py-3.5 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
              loading || needsLocation
                ? 'bg-hookline-500/40 text-white/60 cursor-not-allowed'
                : 'bg-hookline-500 hover:bg-hookline-600 text-white shadow-glow-sm hover:shadow-glow hover:-translate-y-0.5'
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

          {(loading || benchmarkFinishing) && (
            <ActivityLog
              logs={benchmarkLogs}
              title="Competitor benchmark"
              loading={loading}
              finishing={benchmarkFinishing}
            />
          )}
        </>
      )}
    </div>
  );
}
