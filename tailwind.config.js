/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Status colors from app constants (UI.COLORS.STATUS)
        status: {
          draft: '#8B8B8B',
          planned: '#1890FF',
          pending: '#FAAD14',
          approved: '#52C41A',
          confirmed: '#722ED1',
          shipped: '#13C2C2',
          completed: '#52C41A',
          error: '#F5222D',
        },
        // Cover colors from app constants (UI.COLORS.COVER)
        cover: {
          low: '#F5222D',      // Red (< 1 month)
          medium: '#FAAD14',   // Orange (1-3 months)
          good: '#52C41A',     // Green (3-6 months)
          high: '#1890FF',      // Blue (> 6 months)
        },
      },
    },
  },
  plugins: [],
}

