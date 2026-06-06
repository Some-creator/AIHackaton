import { useState } from 'react';

export default function Onboarding({ onSubmit, loading }) {
  const [url, setUrl] = useState('cosmicprintingandmail.com');
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
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-hookline-500 mb-6">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">HookLine</h1>
        <p className="text-lg text-gray-600">
          Paste your website. We&apos;ll find who your competitors are ignoring.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your website URL
        </label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="yourbusiness.com"
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-hookline-500 focus:border-hookline-500 outline-none transition"
          required
          disabled={loading}
        />

        <label className="block text-sm font-medium text-gray-700 mt-5 mb-2">
          Social media links <span className="text-gray-400 font-normal">(optional, comma-separated)</span>
        </label>
        <input
          type="text"
          value={socialLinks}
          onChange={(e) => setSocialLinks(e.target.value)}
          placeholder="instagram.com/yourbiz, facebook.com/yourbiz"
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-hookline-500 focus:border-hookline-500 outline-none transition"
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
      </form>
    </div>
  );
}
