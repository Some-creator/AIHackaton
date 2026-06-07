import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Fish,
  Sparkles,
  Zap,
  Shield,
  Clock,
  CreditCard,
  Loader2,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useCredits } from '../context/CreditsContext';
import { FREE_SCAN_COUNT, SCAN_INCLUDES, SCAN_PACKS, PRICING_FAQ } from '../lib/scanPacks';

function ScanBalance({ scansRemaining, isDark }) {
  if (scansRemaining === null) return null;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${
        isDark
          ? 'border-hookline-500/30 bg-hookline-500/10 text-hookline-200'
          : 'border-hookline-200 bg-hookline-50 text-hookline-800'
      }`}
    >
      <Fish className="h-4 w-4" aria-hidden="true" />
      {scansRemaining === 1 ? '1 scan left' : `${scansRemaining} scans left`}
    </div>
  );
}

export default function PricingPage({
  user,
  onSignIn,
  onGetStarted,
  onBack,
  purchaseNotice,
  onClearPurchaseNotice,
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { scansRemaining, purchasePack, refreshCredits } = useCredits();
  const [buyingId, setBuyingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState(purchaseNotice || null);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleBuy = async (packId) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    onClearPurchaseNotice?.();

    if (!user) {
      onSignIn?.(packId);
      return;
    }

    setBuyingId(packId);
    try {
      const result = await purchasePack(packId);
      setSuccessMsg(`${result.scansAdded} scan${result.scansAdded === 1 ? '' : 's'} added — you're ready to go.`);
      await refreshCredits();
    } catch (err) {
      setErrorMsg(err.message || 'Purchase failed');
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <div className="relative w-full overflow-x-hidden">
      {/* Hero */}
      <section
        className={`relative pt-6 pb-16 md:pb-20 ${
          isDark ? 'bg-background' : 'bg-[#f5f5f7]'
        }`}
      >
        <div
          className={`pointer-events-none absolute inset-0 ${
            isDark
              ? 'bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.14)_0%,_transparent_55%),radial-gradient(ellipse_at_80%_20%,_rgba(168,85,247,0.12)_0%,_transparent_45%)]'
              : 'bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.1)_0%,_transparent_55%)]'
          }`}
        />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className={`mb-8 text-sm font-semibold transition ${
                isDark ? 'text-zinc-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              ← Back to home
            </button>
          )}

          <div className="text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 mb-6 text-sm font-semibold ${
                isDark
                  ? 'border-white/15 bg-white/5 text-hookline-300'
                  : 'border-gray-200 bg-white text-hookline-700 shadow-sm'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              No subscriptions · Pay only when you scan
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className={`font-section-title text-4xl sm:text-5xl md:text-6xl mb-5 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              Hook once.
              <span className={`block mt-1 ${isDark ? 'text-hookline-400' : 'text-hookline-600'}`}>
                Pay per cast.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`text-lg max-w-2xl mx-auto mb-8 ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}
            >
              Most people only need to analyze a few websites — not another monthly SaaS bill.
              Start with a free scan, then buy more when you need them.
            </motion.p>

            {user && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
                <ScanBalance scansRemaining={scansRemaining} isDark={isDark} />
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Free tier + paid packs */}
      <section className={`py-14 md:py-16 ${isDark ? 'bg-zinc-950' : 'bg-white'}`}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {(successMsg || errorMsg) && (
            <div
              className={`mb-8 rounded-2xl border px-5 py-4 text-sm font-medium ${
                successMsg
                  ? isDark
                    ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-200'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : isDark
                    ? 'border-red-500/30 bg-red-950/30 text-red-200'
                    : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {successMsg || errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-stretch">
            {/* Free scan card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className={`relative flex flex-col rounded-3xl border p-6 lg:col-span-1 ${
                isDark
                  ? 'border-zinc-800 bg-zinc-900/60'
                  : 'border-gray-200 bg-[#f5f5f7]'
              }`}
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-hookline-600 text-white">
                <Zap className="h-5 w-5" />
              </div>
              <p className="eyebrow mb-1">Starter</p>
              <h3 className={`font-section-title text-2xl mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                First Cast
              </h3>
              <p className={`text-sm mb-6 ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
                Your first full pipeline run — on us.
              </p>
              <div className="mb-6">
                <span className={`font-section-title text-4xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Free
                </span>
                <span className={`ml-2 text-sm ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                  {FREE_SCAN_COUNT} scan
                </span>
              </div>
              <ul className={`space-y-2.5 text-sm flex-1 mb-8 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                {SCAN_INCLUDES.slice(0, 4).map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check className="h-4 w-4 shrink-0 text-hookline-500 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => (user ? onGetStarted?.() : onSignIn?.())}
                className={`w-full rounded-xl py-3.5 text-sm font-bold transition ${
                  isDark
                    ? 'bg-white/10 hover:bg-white/15 text-white border border-white/20'
                    : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 shadow-sm'
                }`}
              >
                {user ? 'Use your free scan' : 'Sign in & claim free scan'}
              </button>
            </motion.div>

            {/* Paid packs */}
            {SCAN_PACKS.map((pack, i) => (
              <motion.div
                key={pack.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.05 * (i + 1) }}
                className={`relative flex flex-col rounded-3xl border p-6 ${
                  pack.featured
                    ? isDark
                      ? 'border-hookline-500/50 bg-gradient-to-b from-hookline-950/40 to-zinc-900/80 shadow-[0_0_40px_rgba(56,189,248,0.12)]'
                      : 'border-hookline-300 bg-gradient-to-b from-hookline-50/80 to-white shadow-lg shadow-hookline-100/50'
                    : isDark
                      ? 'border-zinc-800 bg-zinc-900/40'
                      : 'border-gray-200 bg-white'
                }`}
              >
                {pack.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-hookline-600 px-3 py-1 text-xs font-bold text-white shadow-md">
                    {pack.badge}
                  </span>
                )}

                <p className="eyebrow mb-1">{pack.scans} scan{pack.scans > 1 ? 's' : ''}</p>
                <h3 className={`font-section-title text-2xl mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {pack.name}
                </h3>
                <p className={`text-sm mb-5 min-h-[40px] ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
                  {pack.tagline}
                </p>

                <div className="mb-1 flex items-end gap-2">
                  <span className={`font-section-title text-4xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {pack.priceLabel}
                  </span>
                  {pack.savings && (
                    <span className="mb-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-500">
                      {pack.savings}
                    </span>
                  )}
                </div>
                <p className={`text-xs mb-6 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>{pack.perScanLabel}</p>

                <ul className={`space-y-2.5 text-sm flex-1 mb-8 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                  {pack.features.map((item) => (
                    <li key={item} className="flex gap-2">
                      <Check className="h-4 w-4 shrink-0 text-hookline-500 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  disabled={buyingId === pack.id}
                  onClick={() => handleBuy(pack.id)}
                  className={`w-full rounded-xl py-3.5 text-sm font-bold transition flex items-center justify-center gap-2 disabled:opacity-60 ${
                    pack.featured
                      ? 'bg-hookline-600 hover:bg-hookline-500 text-white shadow-lg shadow-hookline-600/25'
                      : isDark
                        ? 'bg-white/10 hover:bg-white/15 text-white border border-white/20'
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                  }`}
                >
                  {buyingId === pack.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing…
                    </>
                  ) : user ? (
                    <>
                      Buy {pack.scans} scan{pack.scans > 1 ? 's' : ''}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Sign in to buy
                      <CreditCard className="h-4 w-4" />
                    </>
                  )}
                </button>
              </motion.div>
            ))}
          </div>

          <p className={`mt-8 text-center text-xs max-w-xl mx-auto ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
            Checkout requires sign-in. Demo mode adds scans instantly — wire Stripe when you are ready for live payments.
          </p>
        </div>
      </section>

      {/* What's included */}
      <section className={`py-14 md:py-16 ${isDark ? 'bg-background' : 'bg-[#f5f5f7]'}`}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className={`font-section-title text-3xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Every scan includes the full pipeline
            </h2>
            <p className={`mt-3 max-w-xl mx-auto ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
              One scan = one website run end to end. No upsells mid-flow.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SCAN_INCLUDES.map((item, i) => (
              <div
                key={item}
                className={`rounded-2xl border p-4 flex gap-3 card-lift ${
                  isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-gray-200 bg-white'
                }`}
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-hookline-500/15 text-hookline-500">
                  <Check className="h-4 w-4" />
                </div>
                <p className={`text-sm font-medium pt-1.5 ${isDark ? 'text-zinc-200' : 'text-gray-800'}`}>{item}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Shield, title: 'No subscription trap', text: 'Buy scans when you need them. Cancel nothing — there is nothing to cancel.' },
              { icon: Clock, title: 'Scans never expire', text: 'Your balance stays in your account until you use it.' },
              { icon: CreditCard, title: 'Sign in to checkout', text: 'Purchases are tied to your account so your history and credits stay synced.' },
            ].map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className={`rounded-2xl border p-5 ${isDark ? 'border-zinc-800 bg-zinc-900/30' : 'border-gray-200 bg-white'}`}
              >
                <Icon className="h-5 w-5 text-hookline-500 mb-3" />
                <h3 className={`font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
                <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className={`py-14 md:py-16 ${isDark ? 'bg-zinc-950' : 'bg-white'}`}>
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className={`font-section-title text-3xl text-center mb-10 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Common questions
          </h2>
          <div className="space-y-4">
            {PRICING_FAQ.map((item) => (
              <details
                key={item.q}
                className={`group rounded-2xl border overflow-hidden ${
                  isDark ? 'border-zinc-800 bg-zinc-900/40' : 'border-gray-200 bg-[#f5f5f7]'
                }`}
              >
                <summary
                  className={`cursor-pointer list-none px-5 py-4 font-semibold flex justify-between items-center ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {item.q}
                  <span className="text-hookline-500 text-lg group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className={`px-5 pb-4 text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
