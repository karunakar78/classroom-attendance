/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'Courier New', 'monospace'],
        display: ['"Syne"', 'sans-serif'],
      },
      keyframes: {
        fadeSlideUp: {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scanline: {
          '0%':   { top: '0%' },
          '100%': { top: '100%' },
        },
        pulse2: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.15' },
        },
      },
      animation: {
        'fade-slide-up': 'fadeSlideUp 0.45s ease forwards',
        'scanline':      'scanline 3s linear infinite',
        'pulse2':        'pulse2 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
