import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          deep: "var(--brand-deep)",
          blue: "var(--brand-blue)",
          aqua: "var(--brand-aqua)",
          foam: "var(--brand-foam)",
          ball: "var(--brand-ball)",
        },
        ink: {
          900: "var(--ink-900)",
          600: "var(--ink-600)",
          300: "var(--ink-300)",
        },
        paper: "var(--paper)",
        action: "var(--action)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        full: "var(--radius-full)",
      },
      fontFamily: {
        display: "var(--font-manrope)",
        sans: "var(--font-inter)",
        mono: "var(--font-jetbrains-mono)",
      },
    },
  },
  plugins: [],
};

export default config;
