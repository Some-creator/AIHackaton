import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import ServiceTags from './ServiceTags';
import SocialProfileTags from './SocialProfileTags';
import ActivityLog from './ActivityLog';
import AnalysisReport from './AnalysisReport';
import StepNavigation from './StepNavigation';
import PrimaryButton from './ui/PrimaryButton';
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

export default function BusinessAnalysis({
  business,
  analysis,
  socialScrapes = [],
  onAnalyze,
  onContinue,
  loading,
  companyId,
  analysisLogs = [],
  benchmarkLogs = [],
  analysisFinishing = false,
  benchmarkFinishing = false,
  onBack,
  backLabel,
  onNext,
  nextLabel,
  navDisabled,
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [profile, setProfile] = useState(() => initialProfileFromBusiness(business));

  const updateField = (field, value) => {
    setProfile((prev) => applyUserLocationUpdate({ ...prev, [field]: value }));
  };

  const hasAnalysis = Boolean(analysis);
  const locationReady = isLocationComplete(profile);
  const needsLocation = profile.locationNeedsInput || !locationReady;
  const hadAnalysis = useRef(hasAnalysis);

  useEffect(() => {
    if (hasAnalysis && !hadAnalysis.current) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
    hadAnalysis.current = hasAnalysis;
  }, [hasAnalysis]);

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

  const inputClass = (disabled = loading) =>
    `mt-1 w-full px-3 py-2 rounded-lg border outline-none transition focus:ring-2 focus:ring-hookline-500 ${
      isDark
        ? 'bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500 disabled:bg-zinc-900 disabled:text-zinc-500'
        : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 disabled:bg-gray-50'
    }`;

  const profileFormFields = (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FieldLabel required isDark={isDark}>Business Name</FieldLabel>
          <input
            value={profile.name}
            onChange={(e) => updateField('name', e.target.value)}
            disabled={loading}
            className={inputClass()}
          />
        </div>
        <div>
          <FieldLabel required isDark={isDark}>City</FieldLabel>
          <input
            value={profile.city || ''}
            onChange={(e) => updateField('city', e.target.value)}
            placeholder="Richmond"
            disabled={loading}
            className={inputClass()}
          />
        </div>
        <div>
          <FieldLabel required isDark={isDark}>State</FieldLabel>
          <select
            value={profile.state || ''}
            onChange={(e) => updateField('state', e.target.value)}
            disabled={loading}
            className={inputClass()}
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
            className={inputClass()}
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
            className={inputClass()}
          >
            {BUSINESS_TYPES.map((t) => (
              <option key={t} value={t} className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-gray-900'}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel required isDark={isDark}>Website</FieldLabel>
          <input
            value={profile.website}
            onChange={(e) => updateField('website', e.target.value)}
            disabled={loading}
            className={inputClass()}
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
          className={`${inputClass()} resize-none`}
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
    </>
  );

  return (
    <div className={`mx-auto ${hasAnalysis ? 'max-w-5xl' : 'max-w-4xl'}`}>
      <StepNavigation
        onBack={onBack}
        backLabel={backLabel}
        onNext={onNext}
        nextLabel={nextLabel}
        backDisabled={navDisabled}
        nextDisabled={navDisabled}
      />

      {!hasAnalysis && (
        <div className="mb-8 animate-rise">
          <p className="eyebrow mb-2">Step 2 · Profile</p>
          <h2 className={`font-section-title text-2xl sm:text-3xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Business Profile
          </h2>
          <p className={`mt-1.5 ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
            Review and edit your business details, then run the analysis.
          </p>
          {companyId ? (
            <p className="text-xs text-gray-400 mt-2">Saved to Firestore · companies/{companyId}</p>
          ) : (
            <p className="text-xs text-amber-600 mt-2">
              Not saved to database — check Firebase credentials in .env
            </p>
          )}
          {needsLocation && (
            <div
              className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                isDark ? 'bg-amber-950/30 border-amber-800/50 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <span className="font-semibold">Confirm your location</span>
              {' — '}
              {profile.locationMessage || 'Enter your city and state below before continuing.'}
            </div>
          )}
        </div>
      )}

      {hasAnalysis ? (
        <details className={`surface-card mb-8 overflow-hidden group ${isDark ? 'border-zinc-800' : ''}`}>
          <summary
            className={`cursor-pointer list-none px-6 py-4 text-sm font-semibold flex items-center justify-between ${
              isDark ? 'text-zinc-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Edit business profile
            <span className="text-hookline-500 text-xs font-mono group-open:rotate-45 transition-transform">+</span>
          </summary>
          <div className={`px-6 pb-6 pt-2 border-t space-y-5 ${isDark ? 'border-zinc-800/60' : 'border-gray-200'}`}>
            {profileFormFields}
          </div>
        </details>
      ) : (
        <div className="surface-card p-6 mb-8 space-y-5">
          <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
            <span className="text-red-500">*</span> Required fields
          </p>
          {profileFormFields}
        </div>
      )}

      {!hasAnalysis ? (
        <>
          <PrimaryButton
            onClick={handleAnalyze}
            disabled={needsLocation}
            loading={loading}
            loadingText="Analyzing your business..."
          >
            Analyze My Business
          </PrimaryButton>

          {(loading || analysisFinishing) && (
            <ActivityLog
              logs={analysisLogs}
              title="Gentle roast in progress"
              loading={loading}
              finishing={analysisFinishing}
            />
          )}
        </>
      ) : (
        <>
          {needsLocation && (
            <div
              className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
                isDark ? 'bg-amber-950/30 border-amber-800/50 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <span className="font-semibold">Confirm your location</span>
              {' — '}
              Expand &quot;Edit business profile&quot; above to update city and state before continuing.
            </div>
          )}

          <AnalysisReport business={profile} analysis={analysis} isDark={isDark} />

          <div className="mt-10">
            <PrimaryButton
              onClick={handleContinue}
              disabled={needsLocation}
              loading={loading}
              loadingText="Benchmarking competitors..."
            >
              Continue to Competitor Benchmark
            </PrimaryButton>
          </div>

          {(loading || benchmarkFinishing) && (
            <ActivityLog
              logs={benchmarkLogs}
              title="Competitor recon"
              loading={loading}
              finishing={benchmarkFinishing}
            />
          )}
        </>
      )}
    </div>
  );
}
