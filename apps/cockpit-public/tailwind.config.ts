import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/shared/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: 'var(--paper)',
          '2': 'var(--paper-2)',
          '3': 'var(--paper-3)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          '2': 'var(--ink-2)',
          '3': 'var(--ink-3)',
          '4': 'var(--ink-4)',
          '5': 'var(--ink-5)',
        },
        rule: {
          DEFAULT: 'var(--rule)',
          '2': 'var(--rule-2)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          deep: 'var(--accent-deep)',
          soft: 'var(--accent-soft)',
        },
        flag: {
          bleu: 'var(--bleu)',
          rouge: 'var(--rouge)',
        },
        ok: {
          DEFAULT: 'var(--ok)',
          soft: 'var(--ok-soft)',
        },
        warn: {
          DEFAULT: 'var(--warn)',
          soft: 'var(--warn-soft)',
        },
        bad: {
          DEFAULT: 'var(--bad)',
          soft: 'var(--bad-soft)',
        },
      },
      fontFamily: {
        serif: ['Instrument Serif', 'Times New Roman', 'serif'],
        sans: ['Geist', 'Helvetica Neue', 'sans-serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        'thinking-dot': {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.4' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'thinking-dot': 'thinking-dot 1.2s ease-in-out infinite both',
      },
    },
  },
  plugins: [],
} satisfies Config;
