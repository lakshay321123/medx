// tailwind.config.js — Second Opinion Design System v2
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        so: {
          bg: "#F7F6F3",
          card: "#FFFFFF",
          border: "#E8E6E1",
          text: "#2C2C2A",
          muted: "#87A39F",
          accent: "#2E3667",
          "accent-light": "rgba(46, 54, 103, 0.08)",
          "accent-hover": "#3B4580",
          good: "#179D76",
          "good-light": "rgba(23, 157, 118, 0.08)",
          watch: "#B88D5E",
          "watch-light": "rgba(184, 141, 94, 0.08)",
          alert: "#DD4F28",
          "alert-light": "rgba(221, 79, 40, 0.08)",
          // Dark mode
          "dark-bg": "#131316",
          "dark-card": "rgba(255, 255, 255, 0.04)",
          "dark-border": "#2A2A2E",
          "dark-text": "#E8E6E1",
          "dark-muted": "#636366",
          "dark-accent": "#5B6BBF",
          "dark-accent-light": "rgba(91, 107, 191, 0.15)",
        },
      },
      fontSize: {
        "chat-base": ["15px", { lineHeight: "24px" }],
        "chat-sm": ["13px", { lineHeight: "20px" }],
        "chat-lg": ["17px", { lineHeight: "26px" }],
        "metric-xl": ["28px", { lineHeight: "34px", fontWeight: "600", letterSpacing: "-0.02em" }],
        "metric-lg": ["24px", { lineHeight: "30px", fontWeight: "600", letterSpacing: "-0.01em" }],
        "label-xs": ["11px", { lineHeight: "16px", letterSpacing: "0.03em" }],
        "label-sm": ["10px", { lineHeight: "14px", letterSpacing: "0.05em" }],
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: {
        "so": "12px",
        "so-lg": "16px",
        "so-xl": "20px",
        "so-full": "9999px",
      },
      boxShadow: {
        "so-card": "0 1px 2px rgba(0,0,0,0.04)",
        "so-hover": "0 2px 8px rgba(0,0,0,0.06)",
      },
      spacing: {
        "so-sidebar": "220px",
      },
      transitionTimingFunction: {
        "so": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
