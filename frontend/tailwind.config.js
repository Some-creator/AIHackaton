/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['"General Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        hero: '-0.02em',
        heading: '-0.01em',
      },
      lineHeight: {
        hero: '1.1',
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        // GREY DARK THEME (revertible): the darkest zinc surface shades are
        // lifted off pure black to a soft charcoal. Only 800/900/950 are
        // overridden (used as dark-mode surfaces); 50–700 keep Tailwind defaults.
        // To revert, delete this `zinc` block (originals: 800 #27272a, 900 #18181b, 950 #09090b).
        zinc: {
          800: '#2b2b31',
          900: '#202024',
          950: '#161619',
        },
        hookline: {
          50: '#f0f4ff',
          100: '#dbe4ff',
          200: '#c2d0ff',
          300: '#9db3fd',
          400: '#7790fa',
          500: '#4f6ef7',
          600: '#3b57e0',
          700: '#2f46c4',
          800: '#283a9c',
          900: '#1a2560',
          950: '#11173a',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        '2xl': 'calc(var(--radius) + 6px)',
      },
      boxShadow: {
        'glow-sm': '0 2px 12px -2px rgba(79, 110, 247, 0.25)',
        glow: '0 8px 30px -6px rgba(79, 110, 247, 0.35)',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        rise: 'rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
