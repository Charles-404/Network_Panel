/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'noc': {
          'bg': '#0b0d0f',
          'card': '#151719',
          'card-hover': '#1b1d20',
          'border': 'rgba(255, 255, 255, 0.08)',
          'text': '#e4e4e7',
          'text-muted': '#71717a',
          'green': '#22c55e',
          'blue': '#3b82f6',
          'purple': '#a855f7',
          'yellow': '#eab308',
          'red': '#ef4444',
          'orange': '#f97316',
        }
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}