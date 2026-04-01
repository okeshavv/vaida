/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        vaida: {
          teal: '#0F6E56',
          'teal-light': '#E1F5EE',
          'teal-mid': '#1D9E75',
          purple: '#534AB7',
          'purple-light': '#EEEDFE',
          'purple-mid': '#7F77DD',
          coral: '#993C1D',
          'coral-light': '#FAECE7',
          'coral-mid': '#D85A30',
          amber: '#854F0B',
          'amber-light': '#FAEEDA',
          'amber-mid': '#BA7517',
          blue: '#185FA5',
          'blue-light': '#E6F1FB',
          'blue-mid': '#378ADD',
          dark: '#0F1923',
          bg: '#F8F7F2',
          bg2: '#F1EFE8',
          text: '#1a1a18',
          'text-muted': '#5F5E5A',
          'text-hint': '#888780',
        },
        urgency: {
          green: '#639922',
          'green-bg': '#EAF3DE',
          'green-border': '#97C459',
          amber: '#BA7517',
          'amber-bg': '#FAEEDA',
          'amber-border': '#EF9F27',
          red: '#E24B4A',
          'red-bg': '#FCEBEB',
          'red-border': '#E24B4A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Devanagari', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.4s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'ripple': 'ripple 0.6s ease-out',
        'recording': 'recording 1.5s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(29, 158, 117, 0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(29, 158, 117, 0)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'ripple': {
          '0%': { transform: 'scale(0)', opacity: '1' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
        'recording': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.15)', opacity: '0.8' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      screens: {
        'xs': '360px',
      },
    },
  },
  plugins: [],
};
