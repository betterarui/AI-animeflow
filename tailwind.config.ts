import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        muted: "#888888",
        line: "#333333",
        paper: "#0A0D14",
        amber: "#F07020",
        teal: "#F07020",
        coral: "#F05D5E",
        violet: "#7C5CFF"
      },
      boxShadow: {
        work: "0 22px 52px rgba(0, 0, 0, 0.5)"
      },
      borderRadius: {
        card: "8px"
      }
    }
  },
  plugins: []
};

export default config;
