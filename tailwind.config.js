/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'hsl(221, 100%, 96%)',
          100: 'hsl(221, 100%, 91%)',
          200: 'hsl(221, 100%, 86%)',
          300: 'hsl(221, 100%, 76%)',
          400: 'hsl(221, 83%, 66%)',
          500: 'hsl(221, 83%, 53%)',
          600: 'hsl(221, 90%, 48%)',
          700: 'hsl(221, 90%, 40%)',
          800: 'hsl(221, 89%, 32%)',
          900: 'hsl(221, 74%, 26%)',
          950: 'hsl(222, 71%, 16%)',
        },
        secondary: {
          50: 'hsl(160, 100%, 96%)',
          100: 'hsl(160, 94%, 86%)',
          200: 'hsl(161, 94%, 76%)',
          300: 'hsl(161, 94%, 61%)',
          400: 'hsl(160, 84%, 48%)',
          500: 'hsl(160, 84%, 39%)',
          600: 'hsl(161, 84%, 33%)',
          700: 'hsl(162, 72%, 28%)',
          800: 'hsl(163, 69%, 22%)',
          900: 'hsl(165, 67%, 18%)',
          950: 'hsl(167, 70%, 10%)',
        },
        dark: {
          100: '#1E1E2E', // Background base
          200: '#181825', // Surface
          300: '#11111B', // Mantle
          400: '#0D0D15', // Crust - pure dark
          500: '#CDD6F4', // Text
          600: '#A6ADC8', // Subtext
        },
        accent: {
          blue: '#89B4FA',
          lavender: '#B4BEFE',
          sapphire: '#74C7EC',
          sky: '#89DCEB',
          teal: '#94E2D5',
          green: '#A6E3A1',
          yellow: '#F9E2AF',
          peach: '#FAB387',
          maroon: '#EBA0AC',
          red: '#F38BA8',
          mauve: '#CBA6F7',
          pink: '#F5C2E7',
          flamingo: '#F2CDCD',
          rosewater: '#F5E0DC',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
        'slide-in': 'slideIn 0.6s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(120, 120, 255, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(120, 120, 255, 0.8)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        slideIn: {
          '0%': { transform: 'translateY(20px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
      },
      boxShadow: {
        'inner-md': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        'neon': '0 0 5px theme("colors.accent.blue"), 0 0 20px theme("colors.accent.blue")',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.1)',
        'modern': '0px 4px 16px rgba(17, 17, 26, 0.1), 0px 8px 32px rgba(17, 17, 26, 0.05)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        display: ['Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      backdropFilter: {
        'none': 'none',
        'blur': 'blur(20px)',
      },
      borderRadius: {
        '4xl': '2rem',
        'blob': '69% 31% 31% 69% / 57% 59% 41% 43%',
      },
    },
  },
  plugins: [],
};