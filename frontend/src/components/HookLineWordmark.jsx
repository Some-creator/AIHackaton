import { useId } from 'react';
import { cn } from '@/lib/utils';

function useLogoColors(isDark) {
  return {
    // bright azure -> royal blue, used for the hook "h" and "line"
    blueStart: isDark ? '#38c6ff' : '#16a6e8',
    blueEnd: isDark ? '#5b8cff' : '#2563eb',
    // deep navy for "ook"; lightens to soft slate on dark backgrounds
    navy: isDark ? '#e2e8f0' : '#0f2744',
    tagline: isDark ? '#94a3b8' : '#26405f',
  };
}

const ROUND_FONT =
  '"Fredoka", "General Sans", ui-rounded, "Segoe UI", system-ui, sans-serif';

export function HookLineWordmark({ showTagline = false, className, isDark = false }) {
  const uid = useId().replace(/:/g, '');
  const c = useLogoColors(isDark);
  const blue = `hlBlue-${uid}`;

  return (
    <svg
      viewBox={showTagline ? '0 0 232 62' : '0 0 232 50'}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('block w-auto', className)}
      role="img"
      aria-label="hookline — find leads, make more"
    >
      <defs>
        <linearGradient id={blue} x1="0" y1="6" x2="40" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor={c.blueStart} />
          <stop offset="1" stopColor={c.blueEnd} />
        </linearGradient>
      </defs>

      {/* fishhook "h" — eye ring, stem curving into a barbed hook, plus the arch + leg */}
      <g
        stroke={`url(#${blue})`}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {/* hook eye */}
        <circle cx="14.5" cy="9" r="3.4" strokeWidth="2.8" />
        {/* stem dropping down then curling into the hook with a barb */}
        <path d="M14.5 12.6V36c0 4.7-2.6 8-6.8 8-3.6 0-6-2.4-6-5.8" />
        <path d="M1.7 38.2l4.4 3.1" strokeWidth="3.2" />
        {/* shoulder arch + right leg of the h */}
        <path d="M14.5 24c2-2.7 4.7-4 7.6-4 4.2 0 6.9 2.7 6.9 7.4V36" />
      </g>

      {/* "ookline" — ook in navy, line in blue, rendered in the rounded brand font */}
      <text
        x="33"
        y="36.4"
        style={{
          fontFamily: ROUND_FONT,
          fontSize: '34px',
          fontWeight: 600,
          letterSpacing: '-0.012em',
        }}
      >
        <tspan fill={c.navy}>ook</tspan>
        <tspan fill={`url(#${blue})`}>line</tspan>
      </text>

      {showTagline && (
        <text
          x="116"
          y="57"
          textAnchor="middle"
          fill={c.tagline}
          style={{
            fontFamily: '"General Sans", "Inter", sans-serif',
            fontSize: '7.5px',
            fontWeight: 600,
            letterSpacing: '0.3em',
          }}
        >
          FIND LEADS. MAKE MORE.
        </text>
      )}
    </svg>
  );
}

export function HookLineMark({ className, isDark = false }) {
  const uid = useId().replace(/:/g, '');
  const c = useLogoColors(isDark);
  const markBlue = `hlMarkBlue-${uid}`;

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="hookline"
    >
      <defs>
        <linearGradient id={markBlue} x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor={isDark ? '#38c6ff' : '#16a6e8'} />
          <stop offset="1" stopColor={isDark ? '#5b8cff' : '#2563eb'} />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${markBlue})`} />
      <circle cx="13" cy="8.5" r="2.1" stroke="#fff" strokeWidth="1.8" fill="none" />
      <path
        d="M13 10.8V21c0 2.6-1.5 4.4-3.9 4.4-2 0-3.4-1.3-3.4-3.2"
        stroke="#fff"
        strokeWidth="2.3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M13 16.5c1.1-1.5 2.6-2.2 4.2-2.2 2.3 0 3.8 1.5 3.8 4.1V24"
        stroke="#fff"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
