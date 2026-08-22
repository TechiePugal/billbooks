/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Driven by CSS custom properties (defined per-theme in index.css) so
        // the color scheme can switch at runtime from Settings — every
        // existing `bg-brand-500` etc. across the app re-colors automatically,
        // with zero changes needed in any component file.
        brand: {
          50: 'rgb(var(--brand-50) / <alpha-value>)',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          300: 'rgb(var(--brand-300) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
          800: 'rgb(var(--brand-800) / <alpha-value>)',
          900: 'rgb(var(--brand-900) / <alpha-value>)'
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
        surface: 'rgb(var(--surface) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)'
      },
      fontFamily: {
        display: ['"Fraunces"', '"Noto Sans Tamil"', '"Noto Sans Devanagari"', 'serif'],
        body: ['"Inter"', '"Noto Sans Tamil"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', '"Noto Sans Tamil"', '"Noto Sans Devanagari"', 'monospace']
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
