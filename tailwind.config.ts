import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      colors: {
        surface: "#12121A",
        accent: {
          DEFAULT: "#6366F1",
          secondary: "#8B5CF6",
        },
      },
      backgroundImage: {
        "hero-gradient": "linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)",
        "btn-gradient": "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
        "progress-gradient": "linear-gradient(90deg, #6366F1 0%, #22D3EE 100%)",
      },
    },
  },
  plugins: [],
}

export default config
