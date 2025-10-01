module.exports = {
  root: true,
  extends: ["next", "next/core-web-vitals"],
  plugins: ["@typescript-eslint"],
  rules: {
    "react-hooks/exhaustive-deps": "warn",
  },
};
