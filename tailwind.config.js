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
        'chat-base': ['15px', { lineHeight: '22px' }],
        'chat-sm': ['13px', { lineHeight: '20px' }],
        'chat-lg': ['17px', { lineHeight: '24px' }],
      },
      fontFamily: {
        // Use with className="font-sans"
        sans: ["var(--font-roboto)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
