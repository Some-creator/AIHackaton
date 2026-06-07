import { HeroGeometric } from '@/components/ui/shape-landing-hero';
import { ContainerScroll } from '@/components/ui/container-scroll-animation';
import { InteractiveGradientCta } from '@/components/ui/interactive-gradient-cta';
import DashboardPreview from './DashboardPreview';
import { useTheme } from '../context/ThemeContext';

const aiAgents = [
  {
    name: 'Ingestion Agent',
    role: 'Scans your website & social profiles',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    ),
  },
  {
    name: 'Analysis Agent',
    role: 'Maps strengths, weaknesses & positioning',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    ),
  },
  {
    name: 'Benchmark Agent',
    role: 'Compares you to local competitors',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    ),
  },
  {
    name: 'Gap Agent',
    role: 'Finds underserved market niches',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    ),
  },
  {
    name: 'Lead Agent',
    role: 'Generates qualified prospects with contacts',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    ),
  },
];

const steps = [
  {
    title: 'Paste your URL',
    description: 'We scan your website and social profiles to understand your business.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    ),
  },
  {
    title: 'Analyze & benchmark',
    description: 'AI maps your strengths, weaknesses, and how you stack up against competitors.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    ),
  },
  {
    title: 'Find market gaps',
    description: 'Discover underserved niches your competitors are missing.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    ),
  },
  {
    title: 'Generate leads',
    description: 'Get qualified prospects with contact details so you can reach out directly.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    ),
  },
];

const features = [
  {
    title: 'Instant business intelligence',
    description: 'Turn a single URL into a full profile — services, positioning, and competitive insights in minutes.',
  },
  {
    title: 'Competitor benchmarking',
    description: 'See how you compare on pricing, reviews, and market presence with side-by-side analysis.',
  },
  {
    title: 'AI-powered lead generation',
    description: 'Find businesses that match your ideal gap with phone, email, and website contact info.',
  },
];

const audience = [
  {
    title: 'Local business owners',
    description: 'Independent cafés, caterers, shops, and service providers who want more customers without guessing.',
  },
  {
    title: 'Operators ready to grow',
    description: 'You have a website and reviews, but need clarity on competitors, gaps, and who to reach out to next.',
  },
  {
    title: 'Not built for',
    description: 'National chains, franchise pages, or big e-commerce catalogs — HookLine works best for local SMBs.',
    muted: true,
  },
];

export default function HomePage({ onGetStarted, onScrollToSection }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="w-full overflow-x-hidden">
      <HeroGeometric
        theme={theme}
        badge="Powered by 5 AI Agents"
        title1="AI Agents that grow your business"
        title1Highlight="AI Agents"
        title2="while you focus on customers."
        description="HookLine deploys a team of specialized AI agents — they scan your site, analyze your market, benchmark competitors, find gaps, and deliver qualified leads. Autonomously."
      >
        <div
          className={`mb-8 rounded-2xl border p-4 sm:p-5 text-left ${
            isDark
              ? 'border-hookline-500/30 bg-hookline-500/10'
              : 'border-hookline-200 bg-hookline-50/80'
          }`}
        >
          <p className="eyebrow mb-3 text-center sm:text-left">Your autonomous agent pipeline</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {aiAgents.map((agent, index) => (
              <div
                key={agent.name}
                className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 ${
                  isDark
                    ? 'border-white/10 bg-white/5'
                    : 'border-white bg-white shadow-sm'
                }`}
              >
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-hookline-500/15 text-hookline-500">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {agent.icon}
                  </svg>
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-zinc-900" />
                </span>
                <div className="min-w-0">
                  <p className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? 'text-hookline-300' : 'text-hookline-600'}`}>
                    Agent {index + 1}
                  </p>
                  <p className={`text-xs font-section-title leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {agent.name.replace(' Agent', '')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 max-w-lg sm:max-w-none mx-auto">
          <button
            type="button"
            onClick={onGetStarted}
            className="btn-primary-pill w-full sm:w-auto"
          >
            Get Started — It&apos;s Free
          </button>
          <a
            href="#how-it-works"
            onClick={(e) => {
              e.preventDefault();
              onScrollToSection?.('how-it-works');
            }}
            className={`w-full sm:w-auto px-8 py-3.5 font-button rounded-full transition text-center ${
              isDark
                ? 'bg-white/10 hover:bg-white/15 text-white border border-white/25 backdrop-blur-sm'
                : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-300/80 shadow-sm'
            }`}
          >
            See How It Works
          </a>
        </div>
        <p className={`mt-6 text-sm font-body-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          1 free scan when you sign up · No subscription · Pay only when you need more
        </p>
      </HeroGeometric>

      <section
        id="ai-agents"
        className={`scroll-mt-20 md:scroll-mt-24 transition-colors duration-300 ${
          isDark ? 'bg-background' : 'bg-white'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-14">
          <div className="text-center mb-8 max-w-2xl mx-auto">
            <p className="eyebrow mb-3">AI Agents</p>
            <h2 className={`font-section-title text-3xl sm:text-4xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Five AI agents. One growth engine.
            </h2>
            <p className={`mt-4 font-body-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Each agent is built for a single job — together they turn your website URL into a full
              competitive strategy and a list of businesses to contact.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {aiAgents.map((agent, index) => (
              <div
                key={agent.name}
                className={`card-lift relative rounded-3xl border p-5 transition ${
                  isDark
                    ? 'bg-zinc-900/80 border-zinc-800 hover:border-hookline-500/50'
                    : 'bg-[#f5f5f7] border-gray-200/80 hover:border-hookline-300'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-hookline-500 text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live
                  </span>
                </div>
                <div
                  className={`mb-4 flex h-10 w-10 items-center justify-center rounded-2xl border ${
                    isDark ? 'border-zinc-700 bg-zinc-800 text-hookline-300' : 'border-gray-200 bg-white text-hookline-600'
                  }`}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {agent.icon}
                  </svg>
                </div>
                <h3 className={`font-section-title mb-2 text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {agent.name}
                </h3>
                <p className={`text-sm font-body ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {agent.role}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ContainerScroll
        theme={theme}
        titleComponent={
          <div>
            <h2
              className={`font-section-title text-3xl sm:text-4xl md:text-5xl ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              Your business intelligence,
              <span className={`block mt-1.5 ${isDark ? 'text-hookline-400' : 'text-hookline-500'}`}>
                from analysis to leads
              </span>
            </h2>
          </div>
        }
      >
        <DashboardPreview theme={theme} />
      </ContainerScroll>

      <section
        id="who-its-for"
        className={`scroll-mt-20 md:scroll-mt-24 transition-colors duration-300 ${
          isDark ? 'bg-background' : 'bg-white'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-16">
          <div className="text-center mb-10 max-w-2xl mx-auto">
            <p className="eyebrow mb-3">Purpose</p>
            <h2 className={`font-section-title text-3xl sm:text-4xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Built for local businesses that need customers, not corporate dashboards
            </h2>
            <p className={`mt-4 font-body-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              HookLine reads your website, maps how you compare to nearby competitors, surfaces market gaps,
              and hands you qualified leads with contact info — so you know who to call and why.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {audience.map((item) => (
              <div
                key={item.title}
                className={`rounded-3xl border p-6 ${
                  item.muted
                    ? isDark
                      ? 'border-zinc-800/80 bg-zinc-900/30'
                      : 'border-gray-200 bg-gray-50'
                    : isDark
                      ? 'border-zinc-800 bg-zinc-900/60 hover:border-hookline-500/40 transition'
                      : 'border-gray-200 bg-[#f5f5f7] hover:border-hookline-300 transition'
                }`}
              >
                <h3 className={`font-section-title mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {item.title}
                </h3>
                <p className={`text-sm font-body leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className={`scroll-mt-20 md:scroll-mt-24 transition-colors duration-300 relative z-10 ${
          isDark ? 'bg-background' : 'bg-white'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-16">
          <div className="text-center mb-10">
            <h2 className={`font-section-title text-3xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
              How HookLine works
            </h2>
            <p className={`mt-3 max-w-xl mx-auto font-body-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Your AI agents run this pipeline automatically — from website URL to actionable leads.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className={`card-lift relative rounded-3xl border p-5 transition ${
                  isDark
                    ? 'bg-zinc-900/80 border-zinc-800 hover:border-hookline-500/50'
                    : 'bg-[#f5f5f7] border-gray-200/80 hover:border-hookline-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-hookline-500 text-white text-sm font-bold shrink-0">
                    {index + 1}
                  </span>
                  <div
                    className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${
                      isDark ? 'bg-zinc-800 border-zinc-700 text-hookline-300' : 'bg-white border-gray-200 text-hookline-600'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {step.icon}
                    </svg>
                  </div>
                </div>
                <h3 className={`font-section-title mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{step.title}</h3>
                <p className={`text-sm font-body ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="features"
        className={`scroll-mt-20 md:scroll-mt-24 transition-colors duration-300 ${
          isDark ? 'bg-background' : 'bg-[#f5f5f7]'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-16">
          <div className="text-center mb-10">
            <h2 className={`font-section-title text-3xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Everything you need to grow
            </h2>
            <p className={`mt-3 max-w-xl mx-auto font-body-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              One tool for analysis, competitive research, and outbound sales.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className={`card-lift rounded-3xl border p-6 transition ${
                  isDark
                    ? 'bg-zinc-900 border-zinc-800 hover:border-hookline-500/40'
                    : 'bg-white border-gray-200 shadow-sm hover:shadow-md'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-5 ${
                    isDark ? 'bg-hookline-500/20 text-hookline-300' : 'bg-hookline-50 text-hookline-600'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className={`font-section-title mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{feature.title}</h3>
                <p className={`text-sm font-body ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={isDark ? 'bg-background' : 'bg-white'}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-14 md:pb-16">
          <InteractiveGradientCta>
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="font-section-title text-3xl sm:text-4xl mb-3 text-white">
                Deploy your AI agents today
              </h2>
              <p className="mb-6 font-body-medium text-blue-50/90">
                Paste your website URL — five AI agents handle the rest.
              </p>
              <button
                type="button"
                onClick={onGetStarted}
                className="px-8 py-3.5 bg-white hover:bg-blue-50 text-gray-900 font-button rounded-full transition shadow-lg shadow-blue-950/20"
              >
                Analyze My Business
              </button>
            </div>
          </InteractiveGradientCta>
        </div>
      </section>
    </div>
  );
}
