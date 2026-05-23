import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1b1714",
        espresso: "#2a221b",
        bark: "#3b2f25",
        cream: "#f6f0e3",
        parchment: "#efe6d3",
        amber: "#c8841a",
        gold: "#e2a93e",
        copper: "#9a512c",
        muted: "#867a6c",
      },
      fontFamily: {
        display: ['Georgia', '"Iowan Old Style"', '"Times New Roman"', "serif"],
        body: ['"Helvetica Neue"', "Helvetica", "Arial", "system-ui", "sans-serif"],
      },
      maxWidth: {
        content: "68rem",
      },
    },
  },
  plugins: [],
};

export default config;
