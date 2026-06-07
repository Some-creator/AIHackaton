/**
 * App-wide ambient atmosphere for the in-app working area.
 * A faint "market signal" dot-grid layered with slow-drifting aurora blooms.
 * Purely decorative, fixed behind content, and tuned to stay subtle (never noisy).
 */
export default function AmbientBackground() {
  return (
    <div aria-hidden className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 ambient-dots" />

      <div className="absolute -top-40 -left-32 h-[36rem] w-[36rem] rounded-full bg-hookline-500/[0.10] dark:bg-hookline-500/[0.14] blur-[130px] animate-aurora-a" />
      <div className="absolute top-1/3 -right-40 h-[32rem] w-[32rem] rounded-full bg-cyan-400/[0.08] dark:bg-cyan-400/[0.10] blur-[130px] animate-aurora-b" />
      <div className="absolute -bottom-40 left-1/4 h-[30rem] w-[30rem] rounded-full bg-indigo-500/[0.07] dark:bg-indigo-500/[0.10] blur-[130px] animate-aurora-c" />

      {/* Top fade so the grid melts cleanly into the header */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#f5f5f7] to-transparent dark:from-black" />
    </div>
  );
}
