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

function HookLineLogo({ className = 'w-8 h-8' }) {
  return (
    <div className={`rounded-lg bg-hookline-500 flex items-center justify-center ${className}`}>
      <svg className="w-1/2 h-1/2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    </div>
  );
}

export default function HomePage({ onGetStarted }) {
  return (
    <div className="-mx-4 -my-10">
      <section className="relative overflow-hidden bg-gradient-to-b from-hookline-50 via-white to-gray-50 px-4 py-20 sm:py-28">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-hookline-100 rounded-full blur-3xl opacity-60" />
          <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-hookline-50 rounded-full blur-3xl opacity-80" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-hookline-100 text-hookline-700 text-sm font-medium mb-8 shadow-sm">
            <HookLineLogo className="w-5 h-5 rounded-md" />
            AI Business Intelligence
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight leading-tight">
            Find who your competitors
            <span className="block text-hookline-500">are ignoring.</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Paste your website. HookLine analyzes your business, benchmarks competitors,
            uncovers market gaps, and generates qualified leads with personalized outreach.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto px-8 py-4 bg-hookline-500 hover:bg-hookline-600 text-white font-semibold rounded-xl transition shadow-lg shadow-hookline-500/25"
            >
              Get Started — It&apos;s Free
            </button>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl border border-gray-200 transition"
            >
              See How It Works
            </a>
          </div>

          <p className="mt-6 text-sm text-gray-500">
            No credit card required · Works in demo mode instantly
          </p>
        </div>
      </section>

      <section id="how-it-works" className="px-4 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">How HookLine works</h2>
            <p className="mt-3 text-gray-600 max-w-xl mx-auto">
              From website URL to actionable leads in four simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="relative bg-gray-50 rounded-2xl border border-gray-100 p-6 hover:border-hookline-100 hover:bg-hookline-50/30 transition"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-hookline-500 text-white text-sm font-bold">
                    {index + 1}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-hookline-500">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {step.icon}
                    </svg>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">Everything you need to grow</h2>
            <p className="mt-3 text-gray-600 max-w-xl mx-auto">
              One tool for analysis, competitive research, and outbound sales.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-hookline-100 flex items-center justify-center mb-5">
                  <svg className="w-5 h-5 text-hookline-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20">
        <div className="max-w-3xl mx-auto text-center bg-hookline-900 rounded-3xl px-8 py-14 sm:px-16">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to find your next customers?
          </h2>
          <p className="text-hookline-100 mb-8 leading-relaxed">
            Start with your website URL and let HookLine do the rest.
          </p>
          <button
            onClick={onGetStarted}
            className="px-8 py-4 bg-white hover:bg-gray-100 text-hookline-700 font-semibold rounded-xl transition"
          >
            Analyze My Business
          </button>
        </div>
      </section>
    </div>
  );
}
