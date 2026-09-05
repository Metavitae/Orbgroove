import { Text, View, TouchableOpacity, Animated } from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { useGame } from "./context/GameContext";

export default function Winner() {
  const router = useRouter();
  const { mode, players, resetGame } = useGame();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  // Score Champion: purely rhythm/physicality (players[].score). Crowd Favorite:
  // purely accumulated cheer volume (players[].cheerScore) — separate category,
  // never merged into or influencing the score above.
  const scoreSorted = [...players].sort((a, b) => b.score - a.score);
  const champion = scoreSorted[0] ?? null;

  const cheerSorted = [...players].sort((a, b) => b.cheerScore - a.cheerScore);
  const crowdFavorite = cheerSorted[0] ?? null;

  const handlePlayAgain = () => {
    resetGame();
    router.push("/gamemode");
  };

  const handleExit = () => {
    resetGame();
    router.push("/home" as any);
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1A0A2E", paddingHorizontal: 20, paddingVertical: 16 }}>
      <Animated.View style={{ alignItems: "center", transform: [{ scale: scaleAnim }], marginBottom: 20 }}>
        <Text style={{ fontSize: 52 }}>🏆</Text>
        <Text style={{ color: "#C9963A", fontSize: 12, letterSpacing: 3, textTransform: "uppercase", marginTop: 10, marginBottom: 4 }}>Score Champion</Text>
        <Text style={{ color: "#F0E6FF", fontSize: 26, fontWeight: "700", textAlign: "center" }}>{champion ? champion.name : "—"}</Text>
        {champion && (
          <Text style={{ color: "#C9963A", fontSize: 13, fontStyle: "italic", marginTop: 4, textAlign: "center" }}>{champion.score} points</Text>
        )}
      </Animated.View>

      {mode === "crowd" && crowdFavorite && (
        <Animated.View style={{ alignItems: "center", opacity: fadeAnim, marginBottom: 20, width: "100%", borderWidth: 1, borderColor: "#C9963A", borderRadius: 4, padding: 14 }}>
          <Text style={{ fontSize: 34 }}>👑</Text>
          <Text style={{ color: "#C9963A", fontSize: 12, letterSpacing: 3, textTransform: "uppercase", marginTop: 8, marginBottom: 4 }}>Crowd Favorite</Text>
          <Text style={{ color: "#F0E6FF", fontSize: 20, fontWeight: "700", textAlign: "center" }}>{crowdFavorite.name}</Text>
          <Text style={{ color: "#C9963A", fontSize: 13, fontStyle: "italic", marginTop: 4, textAlign: "center" }}>{crowdFavorite.cheerScore} cheer</Text>
        </Animated.View>
      )}

      <TouchableOpacity onPress={handlePlayAgain} style={{ backgroundColor: "#C9963A", paddingHorizontal: 48, paddingVertical: 14, width: "100%", alignItems: "center" }}>
        <Text style={{ color: "#1A0A2E", fontSize: 15, fontWeight: "700", letterSpacing: 3 }}>PLAY AGAIN</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleExit} style={{ marginTop: 10, alignItems: "center", padding: 10 }}>
        <Text style={{ color: "#C9963A", fontSize: 12, letterSpacing: 3, textTransform: "uppercase" }}>Exit to Menu</Text>
      </TouchableOpacity>
    </View>
  );
}
