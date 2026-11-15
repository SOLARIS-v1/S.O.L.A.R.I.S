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
        solaris: {
          bg: "#F4F7FC",
          surface: "#FFFFFF",
          surfaceSecondary: "#F8FAFC",
          surfaceTertiary: "#EDF2F7",
          primary: "#4F46E5",
          primaryLight: "#EEF2FF",
          primaryHover: "#4338CA",
          amber: "#F97316",
          text: "#1E293B",
          textSecondary: "#64748B",
          muted: "#94A3B8",
          subtle: "#CBD5E1",
          border: "#E2E8F0",
          borderSubtle: "#F1F5F9",
          card: "#FFFFFF",
          cardHover: "#FAFAFA",
        },
        status: {
          normal: "#10B981",
          observation: "#F59E0B",
          review: "#EA580C",
          urgent: "#EF4444",
          simulated: "#8B5CF6",
        },
        nocturne: {
          bg: "#F4F7FC",
          bgLight: "#FFFFFF",
          panel: "rgba(255, 255, 255, 0.95)",
          border: "#E2E8F0",
          borderHover: "#4F46E5",
          accent: "#4F46E5",
          accentGlow: "rgba(79, 70, 229, 0.15)",
        },
        nocturneText: {
          primary: "#1E293B",
          secondary: "#64748B",
          muted: "#94A3B8",
        },
        signal: {
          normal: "#10B981",
          watch: "#F59E0B",
          observation: "#F59E0B",
          review: "#EA580C",
          urgent: "#EF4444",
          simulated: "#8B5CF6",
        },
      },
      boxShadow: {
        neu: "6px 6px 14px rgba(163, 177, 198, 0.25), -6px -6px 14px rgba(255, 255, 255, 0.8)",
        neuSm: "3px 3px 8px rgba(163, 177, 198, 0.2), -3px -3px 8px rgba(255, 255, 255, 0.8)",
        neuLg: "10px 10px 24px rgba(163, 177, 198, 0.3), -10px -10px 24px rgba(255, 255, 255, 0.9)",
        neuInset: "inset 3px 3px 6px rgba(163, 177, 198, 0.25), inset -3px -3px 6px rgba(255, 255, 255, 0.7)",
        neuCard: "0 4px 20px -2px rgba(50, 50, 93, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.04)",
        glowTeal: "0 0 16px rgba(78, 205, 196, 0.25)",
        glowNormal: "0 0 12px rgba(78, 190, 142, 0.3)",
        glowObservation: "0 0 12px rgba(224, 176, 66, 0.3)",
        glowUrgent: "0 0 16px rgba(222, 88, 82, 0.35)",
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
