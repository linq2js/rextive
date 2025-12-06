/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Outfit", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        // Primary brand - warm terracotta/coral
        brand: {
          50: "#fef7f4",
          100: "#fdeee8",
          200: "#fad9cc",
          300: "#f5b99f",
          400: "#ee8e69",
          500: "#e5693f",
          600: "#d44f26",
          700: "#b03c1d",
          800: "#8f331d",
          900: "#752e1c",
          950: "#40140b",
        },
        // Accent - sage/olive green
        sage: {
          50: "#f4f6f2",
          100: "#e5eae0",
          200: "#ccd6c4",
          300: "#aab99e",
          400: "#869777",
          500: "#687b59",
          600: "#516145",
          700: "#404d38",
          800: "#353f2f",
          900: "#2d3529",
          950: "#171c14",
        },
        // Light mode neutrals - warm cream/stone
        stone: {
          50: "#fafaf8",
          100: "#f5f4f1",
          200: "#eae8e3",
          300: "#dbd8d0",
          400: "#b5b0a5",
          500: "#8f897c",
          600: "#726c60",
          700: "#5c574d",
          800: "#4d4942",
          900: "#433f39",
          950: "#24221f",
        },
        // Dark mode base - deep slate blue
        slate: {
          50: "#f6f7f9",
          100: "#eceef2",
          200: "#d5dae2",
          300: "#b0b9c9",
          400: "#8593ab",
          500: "#667591",
          600: "#515e78",
          700: "#434d62",
          800: "#3a4253",
          900: "#343a47",
          950: "#1e222b",
        },
        // Accent gold for dark mode highlights
        gold: {
          50: "#fdfbea",
          100: "#fbf5c6",
          200: "#f8ea90",
          300: "#f3d650",
          400: "#edc126",
          500: "#dcaa14",
          600: "#be840e",
          700: "#985f0f",
          800: "#7e4b14",
          900: "#6b3e17",
          950: "#3e1f09",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "pulse-soft": "pulseSoft 3s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        glow: "glow 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "0.3" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        glow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(212, 79, 38, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(212, 79, 38, 0.5)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        shimmer:
          "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
      },
      boxShadow: {
        glow: "0 0 20px rgba(212, 79, 38, 0.2)",
        "glow-lg": "0 0 40px rgba(212, 79, 38, 0.3)",
        "inner-glow": "inset 0 1px 0 0 rgba(255,255,255,0.1)",
      },
    },
  },
  plugins: [],
};
