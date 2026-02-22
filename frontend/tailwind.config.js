/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary: Black/Grayscale
        primary: {
          50:  '#f9f9f9',
          100: '#f0f0f0',
          200: '#e0e0e0',
          300: '#c0c0c0',
          400: '#a0a0a0',
          500: '#808080',
          600: '#606060',
          700: '#404040',
          800: '#202020',
          900: '#000000',
          DEFAULT: '#000000',
        },
        // Accent: Deep Red
        accent: {
          50:  '#fcf0f3',
          100: '#f8e0e6',
          200: '#f0b3c4',
          300: '#e5809e',
          400: '#d94d78',
          500: '#96092B',
          600: '#870827',
          700: '#780722',
          800: '#5a051a',
          900: '#3c0311',
          DEFAULT: '#96092B',
        },
        // Highlight: Fresh Green
        highlight: {
          50:  '#e5f9ed',
          100: '#bdf0d2',
          500: '#00C853',
          600: '#00b049',
          700: '#00903b',
          DEFAULT: '#00C853',
        },
        brand: {
          black: '#000000',
          red:   '#96092B',
          green: '#00C853',
          white: '#FFFFFF',
          bg:    '#FDFDFD',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'soft':      '0 4px 24px rgba(0,0,0,0.06)',
        'soft-lg':   '0 8px 32px rgba(0,0,0,0.08)',
        'card':      '0 2px 16px rgba(0,0,0,0.04)',
        'card-hover':'0 12px 40px rgba(0,0,0,0.08)',
        'nav':       '0 1px 0 rgba(0,0,0,0.05)',
      },
      backgroundImage: {
        'dark-gradient':  'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
        'red-gradient':   'linear-gradient(135deg, #96092B 0%, #c4103b 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-slow': 'bounce 2s infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      }
    },
  },
  plugins: [],
}
