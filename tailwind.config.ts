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
        pool: {
          deep: "var(--pool-deep)",
          blue: "var(--pool-blue)",
          teal: "var(--pool-teal)",
          foam: "var(--pool-foam)",
          ice: "var(--pool-ice)",
        },
        ball: {
          gold: "var(--ball-gold)",
        },
        goggle: {
          red: "var(--goggle-red)",
        },
        paper: {
          DEFAULT: "var(--paper)",
          card: "var(--paper-card)",
          sunk: "var(--paper-sunk)",
        },
        ink: {
          200: "var(--ink-200)",
          300: "var(--ink-300)",
          400: "var(--ink-400)",
          600: "var(--ink-600)",
          700: "var(--ink-700)",
          900: "var(--ink-900)",
        },
        action: "var(--action)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
      },
      borderRadius: {
        none: "var(--r-0)",
        xs: "var(--r-xs)",
        sm: "var(--r-sm)",
        DEFAULT: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
        full: "var(--r-pill)",
      },
      boxShadow: {
        "elev-1": "var(--shadow-1)",
        "elev-2": "var(--shadow-2)",
        "elev-3": "var(--shadow-3)",
        "elev-4": "var(--shadow-4)",
        "elev-5": "var(--shadow-5)",
        pool: "var(--shadow-pool)",
      },
      letterSpacing: {
        eyebrow: "var(--tracking-eyebrow)",
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
