/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./frontend/public/**/*.{html,js}"],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    screens: {
      xs: "480px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
    },
    extend: {
      colors: {
        bg: 'var(--bg)',
        'bg-soft': 'var(--bg-soft)',
        surface: 'var(--surface)',
        'surface-elevated': 'var(--surface-elevated)',
        'surface-hover': 'var(--surface-hover)',
        card: 'var(--card)',
        'card-border': 'var(--card-border)',
        text: 'var(--text)',
        'text-secondary': 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        accent: 'var(--accent)',
        'accent-light': 'var(--accent-light)',
        'accent-hover': 'var(--accent-hover)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--error)',
        info: 'var(--info)',
      },
      fontFamily: {
        display: ['"Space Grotesk"', "sans-serif"],
        body: ["Manrope", "sans-serif"],
      },
      borderRadius: {
        xl: "30px",
        lg: "22px",
        md: "16px",
        sm: "12px",
      },
    },
  },
  plugins: [],
};
