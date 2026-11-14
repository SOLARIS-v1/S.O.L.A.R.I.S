/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        nocturne: {
          bg: "#06080C",
          bgLight: "#0B1017",
          panel: "rgba(11, 16, 23, 0.75)",
          border: "rgba(255, 255, 255, 0.08)",
          borderHover: "rgba(255, 255, 255, 0.16)",
          accent: "#B8CCE6",
          accentGlow: "rgba(184, 204, 230, 0.25)",
        },
        nocturneText: {
          primary: "#ECE8E1",
          secondary: "#8D97A6",
          muted: "#5B6573",
        },
        signal: {
          normal: "#6FBF9B",
          watch: "#E0BE6A",
          review: "#E58F55",
          urgent: "#DE6A64",
          simulated: "#8E8AB8",
        },
      },
      fontFamily: {
        sans: ['"Geist Sans"', '"Inter Variable"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"Geist Mono"', '"IBM Plex Mono"', 'Consolas', 'monospace'],
      },
      letterSpacing: {
        instrument: "0.12em",
      },
      transitionTimingFunction: {
        instrument: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        instrument: "500ms",
      },
    },
  },
  plugins: [],
}
