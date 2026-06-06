import { useState } from 'react';
import { Sparkles, Globe, Star, Share2, Users, ArrowRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import ActivityLog from './ActivityLog';
import StepNavigation from './StepNavigation';

const SCAN_CHIPS = [
  { label: 'Website', icon: Globe },
  { label: 'Reviews', icon: Star },
  { label: 'Socials', icon: Share2 },
  { label: 'Competitors', icon: Users },
];

export default function Onboarding({ onSubmit, loading, ingestFinishing = false, logs = [], onBack, backLabel, onNext, nextLabel, navDisabled }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [url, setUrl] = useState('');

  const [socialLinks, setSocialLinks] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
    const socialProfiles = socialLinks
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    onSubmit(formattedUrl, socialProfiles);
  };

  return (
    <div className="relative max-w-xl mx-auto">
      <StepNavigation
        onBack={onBack}
        backLabel={backLabel}
        onNext={onNext}
        nextLabel={nextLabel}
        backDisabled={navDisabled}
        nextDisabled={navDisabled}
      />

      {/* Decorative atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-24 -bottom-10 z-0 overflow-visible">
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-hookline-500/25 blur-[90px] animate-drift" />
        <div className="absolute top-24 -left-16 h-56 w-56 rounded-full bg-hookline-400/20 blur-[90px] animate-drift-slow" />
        <div className="absolute top-32 -right-16 h-56 w-56 rounded-full bg-fuchsia-500/15 blur-[90px] animate-drift" />
      </div>

      <div className="relative z-10">
        <div className="text-center mb-9 animate-rise">
          <div className="flex justify-center mb-5">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-hookline-500/40 blur-xl" />
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-hookline-400 to-hookline-600 flex items-center justify-center shadow-glow ring-1 ring-white/20">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
          <p className="eyebrow mb-3">Step 1 · Ingestion</p>
          <h1 className={`font-section-title text-4xl sm:text-5xl mb-3 tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Let&apos;s analyze your{' '}
            <span className="text-gradient-animate">business</span>
          </h1>
          <p className={`max-w-md mx-auto text-base ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
            Drop in your website and HookLine builds your full profile in seconds.
          </p>
        </div>

        {/* Gradient-ring glass card */}
        <div
          className="animate-rise rounded-[1.75rem] p-px bg-gradient-to-b from-hookline-500/50 via-hookline-500/15 to-transparent shadow-glow"
          style={{ animationDelay: '0.06s' }}
        >
          <form
            onSubmit={handleSubmit}
            className={`rounded-[1.7rem] p-8 transition-all duration-300 ${isDark ? 'bg-zinc-950/80 backdrop-blur-xl' : 'bg-white/90 backdrop-blur-xl'}`}
          >
            <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
              Your website URL
            </label>
            <div className="relative">
              <Globe className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`} />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="yourbusiness.com"
                className={`w-full pl-11 pr-4 py-3 rounded-xl border outline-none transition focus:ring-2 focus:ring-hookline-500 focus:border-hookline-500 ${isDark ? 'bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'}`}
                required
                disabled={loading}
              />
            </div>

            <label className={`block text-sm font-semibold mt-5 mb-2 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
              Social media links <span className={`font-normal ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>(optional, comma-separated)</span>
            </label>
            <div className="relative">
              <Share2 className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`} />
              <input
                type="text"
                value={socialLinks}
                onChange={(e) => setSocialLinks(e.target.value)}
                placeholder="instagram.com/yourbiz, facebook.com/yourbiz"
                className={`w-full pl-11 pr-4 py-3 rounded-xl border outline-none transition focus:ring-2 focus:ring-hookline-500 focus:border-hookline-500 ${isDark ? 'bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'}`}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !url.trim()}
              className={`group w-full mt-6 px-6 py-3.5 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                loading || !url.trim()
                  ? 'bg-hookline-500/40 text-white/60 cursor-not-allowed'
                  : 'bg-gradient-to-r from-hookline-500 to-hookline-600 hover:to-hookline-500 text-white shadow-glow-sm hover:shadow-glow hover:-translate-y-0.5'
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
                <>
                  Get Started
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>

            {/* What we scan */}
            <div className="mt-6 pt-5 border-t border-dashed border-zinc-500/20">
              <p className={`text-xs font-semibold uppercase tracking-wider mb-3 text-center ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                What we scan
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SCAN_CHIPS.map(({ label, icon: Icon }) => (
                  <span
                    key={label}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                      isDark
                        ? 'bg-hookline-500/10 border-hookline-500/25 text-hookline-300'
                        : 'bg-hookline-50 border-hookline-100 text-hookline-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {(loading || ingestFinishing) && (
              <ActivityLog
                logs={logs}
                title="Agent 1 — Reading your website"
                loading={loading}
                finishing={ingestFinishing}
              />
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
