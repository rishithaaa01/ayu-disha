/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1B6CA8",
        action: "#E8813A",
        background: "#F7F3EE",
        success: "#3A8C5C",
        alert: "#C0392B",
      },
    },
  },
  plugins: [],
}
