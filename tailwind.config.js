/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./frontend/public/**/*.{html,js}"],
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
        bg: "#07111f",
        "bg-soft": "#0d1a2d",
        panel: "rgba(12, 21, 38, 0.78)",
        "panel-strong": "#10203a",
        card: "rgba(16, 28, 49, 0.88)",
        "card-border": "rgba(152, 181, 255, 0.16)",
        text: "#eef4ff",
        muted: "#a6b4cc",
        accent: "#7ef4d2",
        "accent-2": "#ffb86c",
        "accent-3": "#8f9bff",
        danger: "#ff6b7a",
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
