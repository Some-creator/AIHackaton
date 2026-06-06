export default function DashboardPreview({ theme = 'dark' }) {
  const isDark = theme === 'dark';

  const surface = isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-gray-200';
  const muted = isDark ? 'text-zinc-500' : 'text-gray-500';
  const text = isDark ? 'text-zinc-100' : 'text-gray-900';
  const barBg = isDark ? 'bg-zinc-800' : 'bg-gray-200';
  const barFill = isDark ? 'bg-hookline-500' : 'bg-hookline-500';

  const stats = [
    { label: 'Market score', value: '87', delta: '+12%' },
    { label: 'Competitors tracked', value: '14', delta: '3 new' },
    { label: 'Qualified leads', value: '48', delta: '+24%' },
  ];

  const bars = [62, 78, 45, 91, 58, 84, 70];

  return (
    <div className={`h-full w-full p-4 md:p-6 ${isDark ? 'bg-zinc-950' : 'bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-5 md:mb-6">
        <div>
          <p className={`text-[10px] md:text-xs font-bold uppercase tracking-widest ${muted}`}>
            HookLine dashboard
          </p>
          <p className={`text-sm md:text-base font-bold ${text}`}>Business intelligence overview</p>
        </div>
        <div className={`hidden sm:flex gap-2`}>
          <span className={`h-2.5 w-2.5 rounded-full ${isDark ? 'bg-red-500/80' : 'bg-red-400'}`} />
          <span className={`h-2.5 w-2.5 rounded-full ${isDark ? 'bg-yellow-500/80' : 'bg-yellow-400'}`} />
          <span className={`h-2.5 w-2.5 rounded-full ${isDark ? 'bg-green-500/80' : 'bg-green-400'}`} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-5 md:mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className={`rounded-xl border p-2.5 md:p-4 ${surface}`}>
            <p className={`text-[10px] md:text-xs font-semibold ${muted}`}>{stat.label}</p>
            <p className={`text-lg md:text-2xl font-extrabold mt-1 ${text}`}>{stat.value}</p>
            <p className={`text-[10px] md:text-xs font-bold mt-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              {stat.delta}
            </p>
          </div>
        ))}
      </div>

      <div className={`rounded-xl border p-3 md:p-5 ${surface}`}>
        <div className="flex items-center justify-between mb-4">
          <p className={`text-xs md:text-sm font-bold ${text}`}>Weekly visibility trend</p>
          <p className={`text-[10px] md:text-xs font-semibold ${muted}`}>Last 7 days</p>
        </div>
        <div className="flex items-end gap-1.5 md:gap-2 h-24 md:h-32">
          {bars.map((height, index) => (
            <div key={index} className={`flex-1 rounded-t-md ${barBg}`} style={{ height: `${height}%` }}>
              <div className={`h-full w-full rounded-t-md ${barFill} opacity-90`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
