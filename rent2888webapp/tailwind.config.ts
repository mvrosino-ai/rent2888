import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#F5F4F0",
        card: "#FFFFFF",
        ink: "#22284F",
        ink2: "#4A4F6B",
        ink3: "#9497A8",
        line: "#E4E4E7",
        navy: "#22284F",
        brand: {
          red: "#E54040",
          "red-bg": "#FDEAEA",
          gold: "#C9A84C",
          "gold-bg": "#FBF5E6",
          green: "#166534",
          "green-bg": "#DCFCE7",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "sans-serif"],
        serif: ["var(--font-dm-serif)", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
