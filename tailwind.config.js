// tailwind.config.js
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontSize: {
        "chat-base": ["15px", { lineHeight: "22px" }],
        "chat-sm": ["13px", { lineHeight: "20px" }],
        "chat-lg": ["17px", { lineHeight: "24px" }],
      },
      fontFamily: {
        // Used by className="font-sans"
        sans: [
          "var(--font-sans)",
          "Proxima Nova",
          "Proxima Nova Rg",
          "ProximaNova",
          "proxima-nova",
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
        ],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
