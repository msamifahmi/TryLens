/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        blue: {
          DEFAULT: "#427AB5",
          deep: "#406AAF"
        },
        accent: {
          yellow: "#F7DD7D",
          cream: "#FFE8BE"
        },
        ink: {
          DEFAULT: "#111827",
          text: "#1F2937",
          muted: "#6B7280"
        },
        border: "#E5E7EB",
        success: "#2E9B62",
        error: "#D92D20",
        surface: {
          blue: "#EEF5FC",
          cream: "#FFF8E7"
        }
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"]
      },
      borderRadius: {
        card: "12px",
        pill: "999px"
      }
    }
  },
  plugins: []
};
