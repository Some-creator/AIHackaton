import { HeroGeometric } from '@/components/ui/shape-landing-hero';
import { ContainerScroll } from '@/components/ui/container-scroll-animation';
import { InteractiveGradientCta } from '@/components/ui/interactive-gradient-cta';
import DashboardPreview from './DashboardPreview';
import { useTheme } from '../context/ThemeContext';

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
    description: 'Get qualified prospects with personalized outreach emails, ready to send.',
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
    description: 'Find businesses that match your ideal gap and get draft emails tailored to each prospect.',
  },
];

export default function HomePage({ onGetStarted }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="w-full overflow-x-hidden">
      <HeroGeometric
        theme={theme}
        badge="AI Business Intelligence"
        title1="Are businesses ignoring you?"
        title1Highlight="businesses"
        title2="Don't worry."
        description="Paste your website. HookLine analyzes your business, finds market gaps, and generates qualified leads — fast."
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 max-w-lg sm:max-w-none mx-auto">
          <button
            type="button"
            onClick={onGetStarted}
            className="w-full sm:w-auto px-8 py-3.5 bg-[#0071e3] hover:bg-[#0077ed] text-white font-button rounded-full transition shadow-lg shadow-blue-500/20"
          >
            Get Started — It&apos;s Free
          </button>
          <a
            href="#how-it-works"
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
          No credit card required · Works in demo mode instantly
        </p>
      </HeroGeometric>

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
              <span className={`block mt-1.5 ${isDark ? 'text-[#2997ff]' : 'text-[#0071e3]'}`}>
                in one dashboard
              </span>
            </h2>
          </div>
        }
      >
        <DashboardPreview theme={theme} />
      </ContainerScroll>

      <section
        id="how-it-works"
        className={`scroll-mt-16 transition-colors duration-300 relative z-10 ${
          isDark ? 'bg-black' : 'bg-white'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-16">
          <div className="text-center mb-10">
            <h2 className={`font-section-title text-3xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
              How HookLine works
            </h2>
            <p className={`mt-3 max-w-xl mx-auto font-body-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              From website URL to actionable leads in four simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className={`relative rounded-3xl border p-5 transition ${
                  isDark
                    ? 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-600'
                    : 'bg-[#f5f5f7] border-gray-200/80 hover:border-blue-200'
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#0071e3] text-white text-sm font-bold shrink-0">
                    {index + 1}
                  </span>
                  <div
                    className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${
                      isDark ? 'bg-zinc-800 border-zinc-700 text-sky-400' : 'bg-white border-gray-200 text-[#0071e3]'
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
        className={`transition-colors duration-300 ${
          isDark ? 'bg-black' : 'bg-[#f5f5f7]'
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
                className={`rounded-3xl border p-6 transition ${
                  isDark
                    ? 'bg-zinc-900 border-zinc-800'
                    : 'bg-white border-gray-200 shadow-sm'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-5 ${
                    isDark ? 'bg-blue-500/20 text-sky-400' : 'bg-blue-50 text-[#0071e3]'
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

      <section className={isDark ? 'bg-black' : 'bg-white'}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-14 md:pb-16">
          <InteractiveGradientCta>
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="font-section-title text-3xl sm:text-4xl mb-3 text-white">
                Ready to find your next customers?
              </h2>
              <p className="mb-6 font-body-medium text-blue-50/90">
                Start with your website URL and let HookLine do the rest.
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
