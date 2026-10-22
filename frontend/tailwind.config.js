/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        apple: {
          blue: '#007AFF',
          'blue-dark': '#0056B3',
          purple: '#AF52DE',
          indigo: '#5856D6',
          pink: '#FF2D55',
          green: '#34C759',
          orange: '#FF9500',
          red: '#FF3B30',
          teal: '#30B0C7',
          yellow: '#FFCC00',
          gray: {
            1: '#8E8E93',
            2: '#AEAEB2',
            3: '#C7C7CC',
            4: '#D1D1D6',
            5: '#E5E5EA',
            6: '#F2F2F7',
          },
          bg: {
            light: '#F2F2F7',
            dark: '#000000',
          },
          surface: {
            light: '#FFFFFF',
            dark: '#1C1C1E',
            elevated: '#2C2C2E',
            tertiary: '#3A3A3C',
          },
          border: {
            light: 'rgba(60, 60, 67, 0.12)',
            dark: 'rgba(235, 235, 245, 0.12)',
          },
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"SF Pro"',
          'system-ui',
          '-apple-system-subheadline',
          'sans-serif',
        ],
      },
      boxShadow: {
        'apple-sm': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'apple-card': '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
        'apple-modal': '0 24px 48px -12px rgba(0, 0, 0, 0.25), 0 12px 24px -8px rgba(0, 0, 0, 0.12)',
        'apple-glass': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.35)',
        'apple-glow-blue': '0 0 20px -3px rgba(0, 122, 255, 0.35)',
        'apple-glow-purple': '0 0 20px -3px rgba(175, 82, 222, 0.35)',
      },
      backdropBlur: {
        apple: '24px',
        heavy: '32px',
      },
      borderRadius: {
        '4xl': '2rem',
        'ios': '1.25rem',
      },
    },
  },
  plugins: [],
}
