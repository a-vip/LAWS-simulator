import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#050508',
          panel: '#080c12',
          card: '#0d1520',
          border: '#1a2535',
          'border-bright': '#253545',
          green: '#00d47e',
          'green-dim': '#005c36',
          'green-glow': '#00ff9540',
          red: '#ff1a2e',
          'red-dim': '#6b0010',
          'red-glow': '#ff1a2e30',
          amber: '#ffaa00',
          'amber-dim': '#5c3c00',
          blue: '#0096ff',
          'blue-dim': '#002d52',
          text: '#ccd6e0',
          'text-dim': '#536878',
          'text-faint': '#2a3a4a',
          'text-header': '#e8f0f8',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Space Mono"', '"Courier New"', 'monospace'],
        ui: ['"Inter"', '"Helvetica Neue"', 'sans-serif'],
      },
      animation: {
        'pulse-red': 'pulseRed 1.2s ease-in-out infinite',
        'scan': 'scan 3s linear infinite',
        'blink': 'blink 1s step-end infinite',
        'confidence-rise': 'confidenceRise 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.4s cubic-bezier(0.22,1,0.36,1)',
        'fade-in': 'fadeIn 0.3s ease-out',
        'ping-red': 'pingRed 1.5s cubic-bezier(0,0,0.2,1) infinite',
      },
      keyframes: {
        pulseRed: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 rgba(255,26,46,0.4)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 0 8px rgba(255,26,46,0)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        confidenceRise: {
          '0%': { transform: 'scaleX(0.95)' },
          '100%': { transform: 'scaleX(1)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pingRed: {
          '75%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}

export default config
