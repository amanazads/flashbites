/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      '2xs': '320px',   // Galaxy A series, iPhone SE 1st gen
      'xs':  '390px',   // iPhone 12 mini, small Androids
      'sm':  '640px',   // Tailwind default
      'md':  '768px',   // Tailwind default
      'lg':  '1024px',  // Tailwind default
      'xl':  '1280px',  // Tailwind default
      '2xl': '1536px',  // Tailwind default
      '3xl': '1920px',  // Large monitors
    },
    extend: {
      colors: {
        primary: {
          50:  '#FEF2F3',
          100: '#FDE4E6',
          200: '#FBC5CA',
          300: '#F79AA1',
          400: '#F06270',
          500: '#E23744',
          600: '#C92535',
          700: '#A81C2B',
          800: '#8A1624',
          900: '#6D1220',
          DEFAULT: '#E23744',
        },
        accent: {
          50:  '#FEF2F3',
          100: '#FDE4E6',
          500: '#E23744',
          600: '#C92535',
          DEFAULT: '#E23744',
        },
        highlight: {
          50:  '#ECFDF5',
          100: '#D1FAE5',
          500: '#1BA672',
          600: '#16946A',
          700: '#0F7F5A',
          DEFAULT: '#1BA672',
        },
        brand: {
          red:    '#E23744',
          green:  '#1BA672',
          yellow: '#F7921E',
          dark:   '#1C1C1C',
          bg:     '#F4F6FB',
          white:  '#FFFFFF',
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
        'soft':       '0 2px 12px rgba(0,0,0,0.07)',
        'soft-lg':    '0 8px 28px rgba(0,0,0,0.11)',
        'card':       '0 2px 12px rgba(0,0,0,0.07)',
        'card-hover': '0 8px 28px rgba(0,0,0,0.11)',
        'nav':        '0 -1px 0 rgba(0,0,0,0.06)',
        'brand':      '0 4px 14px rgba(226,55,68,0.3)',
        'brand-lg':   '0 6px 20px rgba(226,55,68,0.35)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #E23744 0%, #FF6B6B 100%)',
        'dark-gradient':  'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)',
        'green-gradient': 'linear-gradient(135deg, #1BA672 0%, #22C55E 100%)',
      },
      animation: {
        'fade-in':    'fadeIn 0.25s ease-out',
        'slide-up':   'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
        'bounce-slow': 'bounce 2s infinite',
        'float':       'float 3s ease-in-out infinite',
        'shimmer':     'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-800px 0' },
          '100%': { backgroundPosition: '800px 0' },
        },
      }
    },
  },
  plugins: [],
}
