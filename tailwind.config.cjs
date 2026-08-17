/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        ocean: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        safe: {
          DEFAULT: '#10b981',
          light: '#ecfdf5',
          dark: '#064e3b',
          border: '#a7f3d0',
          text: '#047857',
        },
        caution: {
          DEFAULT: '#f59e0b',
          light: '#fffbeb',
          dark: '#78350f',
          border: '#fde68a',
          text: '#b45309',
        },
        advisory: {
          DEFAULT: '#ef4444',
          light: '#fef2f2',
          dark: '#7f1d1d',
          border: '#fecaca',
          text: '#b91c1c',
        },
        unmonitored: {
          DEFAULT: '#64748b',
          light: '#f8fafc',
          dark: '#1e293b',
          border: '#cbd5e1',
          text: '#475569',
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
};
