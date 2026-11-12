export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: "#070B16", 900: "#0B1222", 800: "#111A2E", 700: "#1A2540" },
        node: { problem: "#3B82F6", discipline: "#8B5CF6", concept: "#22D3EE",
                mechanism: "#34D399", analogy: "#FB923C", solution: "#F472B6" },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "sans-serif"],
        sans: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
