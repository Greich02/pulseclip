import type { Config } from "tailwindcss";

// Tokens ported 1:1 from pulseclip-design.html (:root custom properties).
const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#7F77DD",
          light: "#AFA9EC",
          dim: "#26215C",
        },
        danger: "#D85A30",
        warning: "#EF9F27",
        success: "#5DCAA5",
        bg: {
          0: "#111110",
          1: "#1a1a18",
          2: "#202020",
          3: "#292927",
        },
        border: {
          DEFAULT: "rgba(255,255,255,0.08)",
          md: "rgba(255,255,255,0.14)",
        },
        t: {
          1: "#f0efe9",
          2: "#9c9a92",
          3: "#5c5a55",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
      },
      borderWidth: {
        hairline: "0.5px",
      },
    },
  },
  plugins: [],
};

export default config;
