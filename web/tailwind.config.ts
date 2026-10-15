import type { Config } from "tailwindcss";

// Every colour is a CSS variable from frontend.md §5.2, so a dark theme can be added later.
const v = (name: string) => `var(--${name})`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: v("bg"),
        surface: v("surface"),
        ink: v("ink"),
        "ink-muted": v("ink-muted"),
        line: v("line"),
        brand: v("brand"),
        accent: v("accent"),
        "accent-soft": v("accent-soft"),
        risk: v("risk"),
        gain: v("gain"),
        caution: v("caution"),
        info: v("info"),
        "chart-line": v("chart-line"),
        "chart-positive": v("chart-positive"),
        "chart-negative": v("chart-negative"),
        "chart-grid": v("chart-grid"),
        "chart-axis": v("chart-axis"),
      },
      fontFamily: { sans: ["var(--font-inter)", "system-ui", "sans-serif"] },
      fontSize: { xs: "12px", sm: "14px", base: "16px", lg: "20px", xl: "24px", "2xl": "32px" },
    },
  },
  plugins: [],
};

export default config;
