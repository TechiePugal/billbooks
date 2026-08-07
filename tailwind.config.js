/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Deep teal — trust, "open for business" feel. Not the AI-default terracotta/cream.
        brand: {
          50: '#EAF4EF',
          100: '#CFE6DA',
          200: '#9FCDB4',
          300: '#6FB48F',
          400: '#3F9B69',
          500: '#0F5132', // primary
          600: '#0C4128',
          700: '#09311E',
          800: '#062114',
          900: '#03110A'
        },
        // Turmeric/mustard accent — nods to Indian food-cart culture, used sparingly
        accent: {
          50: '#FBF3DF',
          100: '#F5E3AF',
          200: '#EFD280',
          300: '#E9C250',
          400: '#DFAE2E',
          500: '#D4A017',
          600: '#A97D12',
          700: '#7E5A0D'
        },
        surface: '#FBFAF7',
        ink: '#1F2937'
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace']
      },
      borderRadius: {
        card: '1.1rem'
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,81,50,0.06), 0 4px 14px rgba(15,81,50,0.08)'
      },
      animation: {
        'pop-in': 'popIn 160ms ease-out',
        'slide-up': 'slideUp 220ms ease-out'
      },
      keyframes: {
        popIn: { '0%': { transform: 'scale(0.94)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
        slideUp: { '0%': { transform: 'translateY(12px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } }
      }
    }
  },
  plugins: []
};
