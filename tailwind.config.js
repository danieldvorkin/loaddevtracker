/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@firebase-oss/ui-styles/dist/**/*.css",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        "primary-hover": "var(--color-primary-hover)",
        "primary-surface": "var(--color-primary-surface)",
        text: "var(--color-text)",
        "text-muted": "var(--color-text-muted)",
        background: "var(--color-background)",
        border: "var(--color-border)",
        input: "var(--color-input)",
        error: "var(--color-error)",
      },
      borderRadius: {
        card: "var(--radius-card)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0,0,0,0.05)",
      },
    },
  },
  plugins: [],
};
