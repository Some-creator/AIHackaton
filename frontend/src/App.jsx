import { useState, useCallback, useEffect } from 'react';
import HomePage from './components/HomePage';
import AuthPage from './components/AuthPage';
import Onboarding from './components/Onboarding';
import BusinessAnalysis from './components/BusinessAnalysis';
import CompetitorBenchmark from './components/CompetitorBenchmark';
import MarketGap from './components/MarketGap';
import LeadGeneration from './components/LeadGeneration';
import ThemeToggle from './components/ThemeToggle';
import { useTheme } from './context/ThemeContext';
import { useAuth } from './context/AuthContext';
import * as api from './api';

const STEPS = ['home', 'auth', 'onboarding', 'analysis', 'competitors', 'gap', 'leads'];

const stepLabels = {
  onboarding: 'Start',
  analysis: 'Analysis',
  competitors: 'Competitors',
  gap: 'Market Gap',
  leads: 'Leads',
};

const PREVIOUS_STEP = {
  auth: 'home',
  onboarding: 'home',
  analysis: 'onboarding',
  competitors: 'analysis',
  gap: 'competitors',
  leads: 'gap',
};

const BACK_LABELS = {
  home: 'Home',
  onboarding: 'Start',
  analysis: 'Analysis',
  competitors: 'Competitors',
  gap: 'Market Gap',
};

const NEXT_LABELS = {
  analysis: 'Analysis',
  competitors: 'Competitors',
  gap: 'Market Gap',
  leads: 'Leads',
};

const FLOW_STEPS = ['onboarding', 'analysis', 'competitors', 'gap', 'leads'];

export default function App() {
  const { theme } = useTheme();
  const { user, loading: authLoading, logout } = useAuth();
  const isDark = theme === 'dark';
  const [step, setStep] = useState('home');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [context, setContext] = useState({});
  const [leads, setLeads] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [streamComplete, setStreamComplete] = useState(false);
  const [skippedLeads, setSkippedLeads] = useState(new Set());
  const [ingestLogs, setIngestLogs] = useState([]);
  const [analysisLogs, setAnalysisLogs] = useState([]);
  const [benchmarkLogs, setBenchmarkLogs] = useState([]);
  const [gapLogs, setGapLogs] = useState([]);

  const handleIngest = async (url, socialProfiles) => {
    setLoading(true);
    setError(null);
    setIngestLogs([]);
    try {
      const { sessionId } = await api.createIngestSession(url, socialProfiles);

      const ingestResult = await new Promise((resolve, reject) => {
        api.streamIngest(sessionId, {
          onLog: (message) => setIngestLogs((prev) => [...prev, message]),
          onComplete: resolve,
          onError: reject,
        });
      });

      setContext({
        business: ingestResult.business,
        companyId: ingestResult.companyId,
        saved: ingestResult.saved,
        socialScrapes: ingestResult.socialScrapes || [],
      });
      setStep('analysis');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIngestLogs([]);
    }
  };

  const handleAnalyze = async (updatedBusiness) => {
    setLoading(true);
    setError(null);
    setAnalysisLogs([]);
    try {
      const updatedContext = { ...context, business: updatedBusiness };
      setContext(updatedContext);

      const { sessionId } = await api.createAnalysisSession(updatedContext);

      const analysisResult = await new Promise((resolve, reject) => {
        api.streamAnalysis(sessionId, {
          onLog: (message) => setAnalysisLogs((prev) => [...prev, message]),
          onComplete: resolve,
          onError: reject,
        });
      });

      setContext((prev) => ({
        ...prev,
        business: updatedBusiness,
        analysis: analysisResult.analysis,
        analysisMock: analysisResult.mock ?? false,
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setAnalysisLogs([]);
    }
  };

  const handleContinueToBenchmark = async (updatedBusiness) => {
    setLoading(true);
    setError(null);
    setBenchmarkLogs([]);
    try {
      const updatedContext = { ...context, business: updatedBusiness };
      setContext(updatedContext);

      const { sessionId } = await api.createBenchmarkSession(updatedContext);

      const benchmarkResult = await new Promise((resolve, reject) => {
        api.streamBenchmark(sessionId, {
          onLog: (message) => setBenchmarkLogs((prev) => [...prev, message]),
          onComplete: resolve,
          onError: reject,
        });
      });

      setContext((prev) => ({
        ...prev,
        competitors: benchmarkResult.competitors,
        competitorsMock: benchmarkResult.mock ?? false,
        competitorsMockReason: benchmarkResult.mockReason || null,
      }));
      setStep('competitors');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setBenchmarkLogs([]);
    }
  };

  const handleFindGaps = async () => {
    setLoading(true);
    setError(null);
    setGapLogs([]);
    try {
      const { sessionId } = await api.createGapSession(context);

      const gapResult = await new Promise((resolve, reject) => {
        api.streamGaps(sessionId, {
          onLog: (message) => setGapLogs((prev) => [...prev, message]),
          onComplete: resolve,
          onError: reject,
        });
      });

      setContext((prev) => ({
        ...prev,
        gaps: gapResult.gaps,
        recommendedGap: gapResult.recommendedGap,
        gapsMock: gapResult.mock ?? false,
        gapsMockReason: gapResult.mockReason || null,
      }));
      setStep('gap');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setGapLogs([]);
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

  const handleSkip = useCallback((lead) => {
    setSkippedLeads((prev) => new Set([...prev, lead.name]));
  }, []);

  const requireAuth = useCallback(() => {
    if (user) {
      setStep('onboarding');
    } else {
      setStep('auth');
    }
  }, [user]);

  const handleAuthSuccess = useCallback(() => {
    setStep('onboarding');
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    setStep('home');
    setContext({});
    setLeads([]);
    setError(null);
  }, [logout]);

  const canNavigateToStep = useCallback((targetStep) => {
    switch (targetStep) {
      case 'onboarding':
        return Boolean(user);
      case 'analysis':
        return Boolean(context.business);
      case 'competitors':
        return Boolean(context.competitors);
      case 'gap':
        return Boolean(context.gaps);
      case 'leads':
        return leads.length > 0 || streaming || streamComplete;
      default:
        return false;
    }
  }, [user, context, leads.length, streaming, streamComplete]);

  const getNextCompletedStep = useCallback(() => {
    const currentIndex = FLOW_STEPS.indexOf(step);
    if (currentIndex < 0) return null;

    for (let i = currentIndex + 1; i < FLOW_STEPS.length; i += 1) {
      const targetStep = FLOW_STEPS[i];
      if (canNavigateToStep(targetStep)) return targetStep;
    }
    return null;
  }, [step, canNavigateToStep]);

  const handleGoToStep = useCallback((targetStep) => {
    if (loading) return;

    const targetIndex = STEPS.indexOf(targetStep);
    const currentIndex = STEPS.indexOf(step);
    if (targetIndex < 0 || targetIndex === currentIndex) return;
    if (!canNavigateToStep(targetStep)) return;

    setError(null);
    if (step === 'leads' && targetStep !== 'leads') {
      setStreaming(false);
      setStreamComplete(false);
    }
    setStep(targetStep);
  }, [loading, step, canNavigateToStep]);

  const handleBack = useCallback(() => {
    if (loading || (streaming && step !== 'leads')) return;

    const previousStep = PREVIOUS_STEP[step];
    if (!previousStep) return;

    setError(null);
    if (step === 'leads') {
      setStreaming(false);
      setStreamComplete(false);
    }
    setStep(previousStep);
  }, [loading, streaming, step]);

  const handleNext = useCallback(() => {
    if (loading || (streaming && step !== 'leads')) return;

    const nextStep = getNextCompletedStep();
    if (!nextStep) return;

    setError(null);
    setStep(nextStep);
  }, [loading, streaming, step, getNextCompletedStep]);

  const nextStep = getNextCompletedStep();
  const nextLabel = nextStep ? NEXT_LABELS[nextStep] : null;
  const navDisabled = loading || (streaming && step !== 'leads');

  useEffect(() => {
    const protectedSteps = ['onboarding', 'analysis', 'competitors', 'gap', 'leads'];
    if (!authLoading && !user && protectedSteps.includes(step)) {
      setStep('auth');
    }
  }, [authLoading, user, step]);

  const currentStepIndex = STEPS.indexOf(step);

  const isHomeOrAuth = step === 'home' || step === 'auth';

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDark ? 'bg-black' : 'bg-[#f5f5f7]'}`}>
      {/* Global loading progress bar */}
      {loading && <div className="loading-bar" style={{ width: '100%' }} />}
      <header
        className={`sticky top-0 z-50 shrink-0 border-b transition-all duration-300 ${
          isHomeOrAuth
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

          {step !== 'home' && step !== 'auth' && step !== 'onboarding' && (
            <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
              {STEPS.slice(3).map((s, i) => {
                const stepIndex = i + 3;
                const isActive = currentStepIndex === stepIndex;
                const isBehind = currentStepIndex > stepIndex;
                const isAheadComplete = currentStepIndex < stepIndex && canNavigateToStep(s);
                const isClickable = !loading && (isBehind || isAheadComplete);
                return (
                  <div key={s} className="flex items-center">
                    {i > 0 && (
                      <div
                        className={`w-8 h-0.5 ${isBehind || isAheadComplete ? 'bg-[#0071e3]' : isDark ? 'bg-zinc-700' : 'bg-gray-200'}`}
                      />
                    )}
                    {isClickable ? (
                      <button
                        type="button"
                        onClick={() => handleGoToStep(s)}
                        className={`px-3 py-1 text-xs font-semibold rounded-full transition hover:opacity-80 ${
                          isActive
                            ? 'bg-[#0071e3] text-white'
                            : isDark
                              ? 'bg-blue-500/20 text-sky-400'
                              : 'bg-blue-50 text-[#0071e3]'
                        }`}
                      >
                        {stepLabels[s]}
                      </button>
                    ) : (
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          isActive
                            ? 'bg-[#0071e3] text-white'
                            : isBehind || isAheadComplete
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
                    )}
                  </div>
                );
              })}
            </nav>
          )}

          <div className="flex items-center gap-3 shrink-0">
            <ThemeToggle />

            {user && (
              <div className="hidden sm:flex items-center gap-2">
                <span
                  className={`text-xs font-semibold max-w-[120px] truncate ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}
                  title={user.email || user.displayName}
                >
                  {user.displayName || user.email}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full border transition ${
                    isDark
                      ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Sign out
                </button>
              </div>
            )}

            {step === 'home' && !user && (
              <button
                type="button"
                onClick={() => setStep('auth')}
                className={`hidden sm:inline-flex px-4 py-2 text-sm font-bold rounded-full border transition ${
                  isDark
                    ? 'border-zinc-600 text-white hover:bg-zinc-800'
                    : 'border-gray-300 text-gray-900 hover:bg-gray-100'
                }`}
              >
                Sign In
              </button>
            )}

            {(step === 'home' || step === 'auth') && (
              <button
                type="button"
                onClick={requireAuth}
                className="hidden sm:inline-flex px-5 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-semibold rounded-full transition"
              >
                Get Started
              </button>
            )}
          </div>
        </div>
      </header>

      <main className={isHomeOrAuth ? 'flex-1 w-full' : 'flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-10 w-full'}>
        {authLoading && !isHomeOrAuth && (
          <div className={`mb-6 text-center text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Checking authentication…
          </div>
        )}

        {error && (
          <div className={`mb-8 rounded-2xl border overflow-hidden ${
            isDark ? 'border-red-500/30 bg-red-950/20' : 'border-red-200 bg-red-50'
          }`}>
            <div className={`flex items-center gap-3 px-5 py-3 border-b ${
              isDark ? 'border-red-500/20 bg-red-500/10' : 'border-red-200 bg-red-100'
            }`}>
              <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span className={`text-sm font-bold ${
                isDark ? 'text-red-400' : 'text-red-700'
              }`}>Agent failed — no data loaded</span>
              <button
                onClick={() => setError(null)}
                className={`ml-auto text-xs px-3 py-1 rounded-full border font-semibold transition ${
                  isDark ? 'border-red-500/40 text-red-400 hover:bg-red-500/10' : 'border-red-300 text-red-600 hover:bg-red-100'
                }`}
              >
                Dismiss
              </button>
            </div>
            <div className="px-5 py-4">
              <p className={`text-xs font-mono leading-relaxed ${
                isDark ? 'text-red-300' : 'text-red-700'
              }`}>{error}</p>
            </div>
          </div>
        )}

        {(step === 'home' || step === 'auth') && (
          <HomePage onGetStarted={requireAuth} />
        )}

        {step === 'auth' && (
          <AuthPage onSuccess={handleAuthSuccess} onClose={handleBack} />
        )}

        {step === 'onboarding' && user && (
          <Onboarding
            onSubmit={handleIngest}
            loading={loading}
            logs={ingestLogs}
            onBack={handleBack}
            backLabel={BACK_LABELS[PREVIOUS_STEP.onboarding]}
            onNext={nextStep ? handleNext : null}
            nextLabel={nextLabel}
            navDisabled={navDisabled}
          />
        )}

        {step === 'analysis' && context.business && (
          <BusinessAnalysis
            business={context.business}
            analysis={context.analysis}
            socialScrapes={context.socialScrapes}
            companyId={context.companyId}
            onAnalyze={handleAnalyze}
            onContinue={handleContinueToBenchmark}
            loading={loading}
            analysisLogs={analysisLogs}
            benchmarkLogs={benchmarkLogs}
            onBack={handleBack}
            backLabel={BACK_LABELS[PREVIOUS_STEP.analysis]}
            onNext={nextStep ? handleNext : null}
            nextLabel={nextLabel}
            navDisabled={navDisabled}
          />
        )}

        {step === 'competitors' && context.competitors && (
          <CompetitorBenchmark
            competitors={context.competitors}
            mock={context.competitorsMock}
            mockReason={context.competitorsMockReason}
            onContinue={handleFindGaps}
            loading={loading}
            gapLogs={gapLogs}
            onBack={handleBack}
            backLabel={BACK_LABELS[PREVIOUS_STEP.competitors]}
            onNext={nextStep ? handleNext : null}
            nextLabel={nextLabel}
            navDisabled={navDisabled}
          />
        )}

        {step === 'gap' && context.gaps && (
          <MarketGap
            gaps={context.gaps}
            recommendedGap={context.recommendedGap}
            onConfirm={handleConfirmGap}
            loading={loading}
            onBack={handleBack}
            backLabel={BACK_LABELS[PREVIOUS_STEP.gap]}
            onNext={nextStep ? handleNext : null}
            nextLabel={nextLabel}
            navDisabled={navDisabled}
          />
        )}

        {step === 'leads' && (
          <LeadGeneration
            leads={leads}
            streaming={streaming}
            streamComplete={streamComplete}
            onSkip={handleSkip}
            skippedLeads={skippedLeads}
            onBack={handleBack}
            backLabel={BACK_LABELS[PREVIOUS_STEP.leads]}
            onNext={nextStep ? handleNext : null}
            nextLabel={nextLabel}
            navDisabled={navDisabled}
          />
        )}
      </main>
    </div>
  );
}
