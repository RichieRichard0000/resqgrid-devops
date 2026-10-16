/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        resq: {
          dark: '#0f172a',
          darker: '#020617',
          surface: '#1e293b',
          border: '#334155',
          critical: '#ef4444',
          high: '#f97316',
          medium: '#eab308',
          low: '#3b82f6',
          success: '#10b981'
        }
      }
    },
  },
  plugins: [],
}
