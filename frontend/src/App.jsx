import { useState, useCallback } from 'react';
import HomePage from './components/HomePage';
import Onboarding from './components/Onboarding';
import BusinessAnalysis from './components/BusinessAnalysis';
import CompetitorBenchmark from './components/CompetitorBenchmark';
import MarketGap from './components/MarketGap';
import LeadGeneration from './components/LeadGeneration';
import ThemeToggle from './components/ThemeToggle';
import { useTheme } from './context/ThemeContext';
import * as api from './api';

const STEPS = ['home', 'onboarding', 'analysis', 'competitors', 'gap', 'leads'];

const stepLabels = {
  onboarding: 'Start',
  analysis: 'Analysis',
  competitors: 'Competitors',
  gap: 'Market Gap',
  leads: 'Leads',
};

export default function App() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [step, setStep] = useState('home');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [context, setContext] = useState({});
  const [leads, setLeads] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [streamComplete, setStreamComplete] = useState(false);
  const [sentLeads, setSentLeads] = useState(new Set());
  const [skippedLeads, setSkippedLeads] = useState(new Set());

  const handleIngest = async (url, socialProfiles) => {
    setLoading(true);
    setError(null);
    try {
      const ingestResult = await api.ingest(url, socialProfiles);
      const updatedContext = { business: ingestResult.business };
      setContext(updatedContext);

      const analysisResult = await api.analyze(updatedContext);
      setContext((prev) => ({ ...prev, analysis: analysisResult.analysis }));
      setStep('analysis');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToBenchmark = async (updatedBusiness) => {
    setLoading(true);
    setError(null);
    try {
      const updatedContext = { ...context, business: updatedBusiness };
      setContext(updatedContext);
      const competitorResult = await api.benchmark(updatedContext);
      setContext((prev) => ({ ...prev, competitors: competitorResult.competitors }));
      setStep('competitors');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFindGaps = async () => {
    setLoading(true);
    setError(null);
    try {
      const gapResult = await api.findGaps(context);
      setContext((prev) => ({
        ...prev,
        gaps: gapResult.gaps,
        recommendedGap: gapResult.recommendedGap,
      }));
      setStep('gap');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmGap = async (gapIndex) => {
    setLoading(true);
    setError(null);
    setLeads([]);
    setStreaming(true);
    setStreamComplete(false);
    setStep('leads');

    try {
      const updatedContext = { ...context, recommendedGap: gapIndex };
      setContext(updatedContext);

      const { sessionId } = await api.createLeadSession(updatedContext);

      api.streamLeads(sessionId, {
        onLead: (lead) => {
          setLeads((prev) => {
            const exists = prev.some((l) => l.name === lead.name);
            if (exists) return prev;
            return [...prev, lead];
          });
        },
        onComplete: () => {
          setStreaming(false);
          setStreamComplete(true);
        },
        onError: (err) => {
          setError(err.message);
          setStreaming(false);
        },
      });
    } catch (err) {
      setError(err.message);
      setStreaming(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = useCallback(async (lead) => {
    const to = lead.email?.includes('@') ? lead.email : `contact@${lead.website?.replace(/https?:\/\//, '') || 'business.com'}`;
    await api.sendEmail({
      to,
      subject: `Quick question about ${lead.name}`,
      body: lead.email,
    });
    setSentLeads((prev) => new Set([...prev, lead.name]));
  }, []);

  const handleSkip = useCallback((lead) => {
    setSkippedLeads((prev) => new Set([...prev, lead.name]));
  }, []);

  const currentStepIndex = STEPS.indexOf(step);

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDark ? 'bg-black' : 'bg-[#f5f5f7]'}`}>
      <header
        className={`sticky top-0 z-50 shrink-0 border-b transition-all duration-300 ${
          step === 'home'
            ? isDark
              ? 'bg-black/70 backdrop-blur-xl border-white/10'
              : 'bg-[#f5f5f7]/80 backdrop-blur-xl border-black/5'
            : isDark
              ? 'bg-zinc-900 border-zinc-800'
              : 'bg-white border-gray-200'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setStep('home')}
            className="flex items-center gap-3 hover:opacity-80 transition shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-[#0071e3] flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className={`font-bold text-lg tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              HookLine
            </span>
          </button>

          {step !== 'home' && step !== 'onboarding' && (
            <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
              {STEPS.slice(2).map((s, i) => {
                const stepIndex = i + 2;
                const isActive = currentStepIndex === stepIndex;
                const isComplete = currentStepIndex > stepIndex;
                return (
                  <div key={s} className="flex items-center">
                    {i > 0 && (
                      <div
                        className={`w-8 h-0.5 ${isComplete ? 'bg-[#0071e3]' : isDark ? 'bg-zinc-700' : 'bg-gray-200'}`}
                      />
                    )}
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        isActive
                          ? 'bg-[#0071e3] text-white'
                          : isComplete
                            ? isDark
                              ? 'bg-blue-500/20 text-sky-400'
                              : 'bg-blue-50 text-[#0071e3]'
                            : isDark
                              ? 'bg-zinc-800 text-zinc-500'
                              : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {stepLabels[s]}
                    </span>
                  </div>
                );
              })}
            </nav>
          )}

          <div className="flex items-center gap-3 shrink-0">
            <ThemeToggle />

            {step === 'home' && (
              <button
                type="button"
                onClick={() => setStep('onboarding')}
                className="hidden sm:inline-flex px-5 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-semibold rounded-full transition"
              >
                Get Started
              </button>
            )}
          </div>
        </div>
      </header>

      <main className={step === 'home' ? 'flex-1 w-full' : 'flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-10 w-full'}>
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-4 underline">Dismiss</button>
          </div>
        )}

        {step === 'home' && (
          <HomePage onGetStarted={() => setStep('onboarding')} />
        )}

        {step === 'onboarding' && (
          <Onboarding onSubmit={handleIngest} loading={loading} />
        )}

        {step === 'analysis' && context.business && context.analysis && (
          <BusinessAnalysis
            business={context.business}
            analysis={context.analysis}
            onContinue={handleContinueToBenchmark}
            loading={loading}
          />
        )}

        {step === 'competitors' && context.competitors && (
          <CompetitorBenchmark
            competitors={context.competitors}
            onContinue={handleFindGaps}
            loading={loading}
          />
        )}

        {step === 'gap' && context.gaps && (
          <MarketGap
            gaps={context.gaps}
            recommendedGap={context.recommendedGap}
            onConfirm={handleConfirmGap}
            loading={loading}
          />
        )}

        {step === 'leads' && (
          <LeadGeneration
            leads={leads}
            streaming={streaming}
            streamComplete={streamComplete}
            onSend={handleSend}
            onSkip={handleSkip}
            sentLeads={sentLeads}
            skippedLeads={skippedLeads}
          />
        )}
      </main>
    </div>
  );
}
