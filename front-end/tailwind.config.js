/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17352F",
        page: "#F6F8F4",
        panel: "#FFFEF8",
        "poly-green": "#154734",
        "green-soft": "#E7F0EA",
        "mustang-gold": "#BD8B13",
        "gold-deep": "#73560F",
        "gold-soft": "#FFF4D2",
        "stadium-gold": "#F8E08E",
        canyon: "#F2C75C",
        "coast-sage": "#B7CDC2",
        "sage-soft": "#ECF3EF",
        "surf-blue": "#5CB8B2",
        "sky-soft": "#EAF6F3",
        seal: "#54585A"
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif"
        ]
      },
      boxShadow: {
        soft: "0 18px 55px rgba(21, 71, 52, 0.12)"
      }
    }
  },
  plugins: []
};
