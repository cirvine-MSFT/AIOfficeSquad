import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

const config: Config = {
  content: ['./src/renderer/**/*.{tsx,ts,html}'],
  darkMode: 'class',
  theme: {
    fontFamily: {
      sans: [
        'Inter',
        'ui-sans-serif',
        'system-ui',
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'Roboto',
        'Helvetica Neue',
        'Arial',
        'sans-serif',
      ],
      mono: [
        'JetBrains Mono',
        'Fira Code',
        'ui-monospace',
        'SFMono-Regular',
        'Menlo',
        'Monaco',
        'Consolas',
        'Liberation Mono',
        'Courier New',
        'monospace',
      ],
    },
    fontSize: {
      '2xs': ['0.625rem', { lineHeight: '0.875rem' }],   // 10px — micro labels
      xs: ['0.6875rem', { lineHeight: '1rem' }],          // 11px — status bar, badges
      sm: ['0.75rem', { lineHeight: '1rem' }],             // 12px — sidebar items, metadata
      base: ['0.8125rem', { lineHeight: '1.25rem' }],      // 13px — body text (dense)
      md: ['0.875rem', { lineHeight: '1.25rem' }],         // 14px — primary content
      lg: ['1rem', { lineHeight: '1.5rem' }],              // 16px — section headers
      xl: ['1.125rem', { lineHeight: '1.75rem' }],         // 18px — page titles
      '2xl': ['1.5rem', { lineHeight: '2rem' }],           // 24px — hero/modal titles
    },
    extend: {
      colors: {
        // ── Background shades (dark navy-charcoal) ──
        bg: {
          DEFAULT: '#0f1117',   // app background
          raised: '#151820',    // sidebar, panels
          surface: '#1a1d27',   // cards, dropdowns
          hover: '#1f2330',     // interactive hover
          active: '#252936',    // selected/active state
          overlay: '#0d0f14',   // modal overlays
        },

        // ── Border & divider ──
        border: {
          DEFAULT: '#2a2e3b',   // subtle dividers
          strong: '#3a3f50',    // emphasized borders
          focus: '#5b8def',     // focus ring
        },

        // ── Text hierarchy ──
        text: {
          primary: '#e8eaf0',   // high-emphasis text
          secondary: '#9ba1b0', // medium-emphasis
          tertiary: '#636a7c',  // low-emphasis, placeholders
          inverse: '#0f1117',   // text on light backgrounds
        },

        // ── Agent role accent colors ──
        role: {
          lead:     { DEFAULT: '#f5a623', light: '#fcd281', dim: '#3d2e10' },
          frontend: { DEFAULT: '#38bdf8', light: '#7dd3fc', dim: '#0c2d42' },
          backend:  { DEFAULT: '#4ade80', light: '#86efac', dim: '#0d3320' },
          tester:   { DEFAULT: '#a78bfa', light: '#c4b5fd', dim: '#2a1f54' },
          expert:   { DEFAULT: '#fb923c', light: '#fdba74', dim: '#3d2010' },
          design:   { DEFAULT: '#f472b6', light: '#f9a8d4', dim: '#3d1028' },
          scribe:   { DEFAULT: '#94a3b8', light: '#cbd5e1', dim: '#1e2736' },
          monitor:  { DEFAULT: '#2dd4bf', light: '#5eead4', dim: '#0d3330' },
        },

        // ── Status colors ──
        status: {
          active:  '#4ade80',
          idle:    '#facc15',
          error:   '#f87171',
          working: '#60a5fa',
        },

        // ── Interactive / accent ──
        accent: {
          DEFAULT: '#5b8def',
          hover: '#7ba4f7',
          pressed: '#4a73cc',
          muted: '#1e2d4d',
        },
      },

      spacing: {
        // Compact spacing for dense UI
        '0.5': '0.125rem',  // 2px
        '1.5': '0.375rem',  // 6px
        '2.5': '0.625rem',  // 10px
        '4.5': '1.125rem',  // 18px
        '13': '3.25rem',    // 52px — header height area
        '18': '4.5rem',     // 72px
        // Layout tokens
        sidebar: '17.5rem',   // 280px
        'panel-min': '20rem', // 320px
        'status-bar': '2rem', // 32px
        header: '3rem',       // 48px
      },

      borderRadius: {
        sm: '0.25rem',   // 4px — badges, small chips
        md: '0.375rem',  // 6px — buttons, inputs
        lg: '0.5rem',    // 8px — cards, panels
        xl: '0.75rem',   // 12px — modals, popovers
      },

      boxShadow: {
        'elevation-1': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'elevation-2': '0 2px 8px 0 rgba(0, 0, 0, 0.4)',
        'elevation-3': '0 8px 24px 0 rgba(0, 0, 0, 0.5)',
        'glow-accent': '0 0 12px 0 rgba(91, 141, 239, 0.25)',
        'glow-status': '0 0 8px 0 rgba(74, 222, 128, 0.3)',
        'inner-border': 'inset 0 0 0 1px rgba(255, 255, 255, 0.06)',
      },

      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(8px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        pulseStatus: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },

      animation: {
        'fade-in': 'fadeIn 150ms ease-out',
        'fade-in-up': 'fadeInUp 200ms ease-out',
        'slide-in-right': 'slideInRight 200ms ease-out',
        'slide-in-left': 'slideInLeft 200ms ease-out',
        'pulse-status': 'pulseStatus 2s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        'scale-in': 'scaleIn 150ms ease-out',
      },

      transitionDuration: {
        '50': '50ms',
        '250': '250ms',
      },

      transitionTimingFunction: {
        snappy: 'cubic-bezier(0.2, 0, 0, 1)',
      },
    },
  },
  plugins: [
    // Utility for status dot glow per role
    plugin(({ addUtilities }) => {
      addUtilities({
        '.scrollbar-thin': {
          'scrollbar-width': 'thin',
          'scrollbar-color': '#2a2e3b #0f1117',
        },
        '.no-drag': {
          '-webkit-app-region': 'no-drag',
        },
        '.drag': {
          '-webkit-app-region': 'drag',
        },
      });
    }),
  ],
};

export default config;
