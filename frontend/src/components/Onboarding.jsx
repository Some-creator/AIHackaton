import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import ActivityLog from './ActivityLog';
import StepBackButton from './StepBackButton';

export default function Onboarding({ onSubmit, loading, logs = [], onBack, backLabel }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [url, setUrl] = useState('https://kahfe.square.site/');

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
    <div className="max-w-xl mx-auto">
      <StepBackButton onBack={onBack} disabled={loading} label={backLabel} />
      <div className="text-center mb-10">
        <h1 className={`text-3xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Let&apos;s analyze your business</h1>
        <p className={isDark ? 'text-zinc-400' : 'text-gray-600'}>
          Enter your website and we&apos;ll build your profile automatically.
        </p>
      </div>

      <form onSubmit={handleSubmit} className={`rounded-2xl shadow-lg border p-8 transition-all duration-300 ${isDark ? 'bg-zinc-900/60 border-zinc-800 backdrop-blur-md' : 'bg-white border-gray-200'}`}>
        <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
          Your website URL
        </label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="yourbusiness.com"
          className={`w-full px-4 py-3 rounded-xl border outline-none transition focus:ring-2 focus:ring-hookline-500 ${isDark ? 'bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'}`}
          required
          disabled={loading}
        />

        <label className={`block text-sm font-semibold mt-5 mb-2 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
          Social media links <span className={`font-normal ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>(optional, comma-separated)</span>
        </label>
        <input
          type="text"
          value={socialLinks}
          onChange={(e) => setSocialLinks(e.target.value)}
          placeholder="instagram.com/yourbiz, facebook.com/yourbiz"
          className={`w-full px-4 py-3 rounded-xl border outline-none transition focus:ring-2 focus:ring-hookline-500 ${isDark ? 'bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'}`}
          disabled={loading}
        />

        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="w-full mt-6 px-6 py-3.5 bg-hookline-500 hover:bg-hookline-600 disabled:bg-gray-300 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
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
            'Get Started'
          )}
        </button>

        {loading && <ActivityLog logs={logs} title="Agent 1 — Reading your website" />}
      </form>
    </div>
  );
}
