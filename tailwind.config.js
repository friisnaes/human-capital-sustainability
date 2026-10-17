/** Design tokens for Human Capital Sustainability™. */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F4F0E6',
        surface: '#FBF9F4',
        sunk: '#ECE6DA',
        rule: '#DAD2C2',
        'rule-strong': '#BFB4A0',
        ink: { DEFAULT: '#14213A', 2: '#38455A', muted: '#5B6577', faint: '#8D95A3' },
        navy: { DEFAULT: '#1F3A60', soft: '#DCE3EC', mark: '#2F5585' },
        teal: { DEFAULT: '#25645C', soft: '#DCEAE5', mark: '#3E8C80' },
        amber: { DEFAULT: '#7F520A', soft: '#F3E4C2', mark: '#C68A1E' },
        risk: { DEFAULT: '#9A2D22', soft: '#F2D9D2', mark: '#B6402D' },
      },
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.75rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '3px',
        md: '4px',
        lg: '6px',
        full: '9999px',
      },
      boxShadow: {
        panel: '0 1px 0 rgba(20,33,58,0.04), 0 1px 2px rgba(20,33,58,0.05)',
        raised: '0 12px 32px -12px rgba(20,33,58,0.28), 0 2px 6px rgba(20,33,58,0.08)',
      },
      maxWidth: { page: '88rem' },
    },
  },
  plugins: [],
};
