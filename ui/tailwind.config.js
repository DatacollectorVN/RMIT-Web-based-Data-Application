module.exports = {
  content: ["./src/**/*.{tsx,ts,jsx,js}"],
  theme: {
    extend: {
      colors: {
        forest: "#1A3028",
        "forest-mid": "#2C5F3E",
        "forest-light": "#3A7D52",
        sage: "#F4F5EE",
        "sage-mid": "#E8EDD8",
        "sage-border": "#D4DCC8",
        "sage-muted": "#687860",
        mint: "#A8D8B8",
        card: "#FFFFFF",
        gold: "#C9A84C",
        danger: "#C0392B",
        success: "#2D6A4F"
      },
      fontFamily: {
        serif: ["'Playfair Display'", "Georgia", "serif"],
        sans: ["'Inter'", "-apple-system", "sans-serif"]
      }
    }
  },
  plugins: []
};
