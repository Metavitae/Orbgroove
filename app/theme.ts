export const colors = {
  bg: "#0A3B2E",
  card: "#0F3226",
  border: "rgba(127,207,182,0.25)",
  mint: "#EAFFF6",
  mintDim: "#7FCFB6",
  pink: "#FF3D8B",
  cyan: "#00C2FF",
  darkText: "#06241B",
  gradient: ["#00C2FF", "#38E56B", "#D8FF33"] as const,
};

// Brand type system: Fredoka for display/headline text, JetBrains Mono for
// small uppercase labels and buttons. Weight names match the font-family
// strings registered by useFonts in _layout.tsx.
export const fonts = {
  displayRegular: "Fredoka_400Regular",
  displaySemiBold: "Fredoka_600SemiBold",
  displayBold: "Fredoka_700Bold",
  labelRegular: "JetBrainsMono_400Regular",
  labelMedium: "JetBrainsMono_500Medium",
  labelBold: "JetBrainsMono_700Bold",
};

// Spread onto any Text style that sits directly on photographic/busy
// ImageBackground art (confetti, light beams, gradients) so it stays legible
// regardless of what's happening in the art behind it -- not needed for text
// inside an already-opaque card (e.g. leaderboard rows, colors.card boxes).
export const textOnImageShadow = {
  textShadowColor: "rgba(0,0,0,0.85)",
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 6,
};
