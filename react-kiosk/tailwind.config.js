/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyberBg: "#0B0F19",
        cyberCard: "#111827",
        cyberBorder: "#1F2937",
        neonCyan: "#06B6D4",
        neonGreen: "#10B981",
        cyberAmber: "#F59E0B",
        laserRed: "#EF4444",
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
