import { Text, View, TouchableOpacity, Animated, ImageBackground } from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGame } from "./context/GameContext";
import { GradientButton } from "./components/GradientButton";
import { colors } from "./theme";

export default function Winner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    <ImageBackground
      source={require("../assets/images/bg_winner.jpg")}
      resizeMode="cover"
      style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 + Math.max(insets.bottom, 24) }}
    >
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(6,20,15,0.35)" }} pointerEvents="none" />
      <Animated.View style={{ alignItems: "center", transform: [{ scale: scaleAnim }], marginBottom: 20 }}>
        <Text style={{ fontSize: 52 }}>🏆</Text>
        <Text style={{ color: colors.pink, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", marginTop: 10, marginBottom: 4 }}>Score Champion</Text>
        <Text style={{ color: colors.mint, fontSize: 26, fontWeight: "700", textAlign: "center" }}>{champion ? champion.name : "—"}</Text>
        {champion && (
          <Text style={{ color: colors.mintDim, fontSize: 13, fontStyle: "italic", marginTop: 4, textAlign: "center" }}>{champion.score} points</Text>
        )}
      </Animated.View>

      {mode === "crowd" && crowdFavorite && (
        <Animated.View style={{ alignItems: "center", opacity: fadeAnim, marginBottom: 20, width: "100%", borderWidth: 1, borderColor: "rgba(127,207,182,0.3)", borderRadius: 16, padding: 14 }}>
          <Text style={{ fontSize: 34 }}>👑</Text>
          <Text style={{ color: "#00C2FF", fontSize: 12, letterSpacing: 3, textTransform: "uppercase", marginTop: 8, marginBottom: 4 }}>Crowd Favorite</Text>
          <Text style={{ color: colors.mint, fontSize: 20, fontWeight: "700", textAlign: "center" }}>{crowdFavorite.name}</Text>
          <Text style={{ color: colors.mintDim, fontSize: 13, fontStyle: "italic", marginTop: 4, textAlign: "center" }}>{crowdFavorite.cheerScore} cheer</Text>
        </Animated.View>
      )}

      <GradientButton label="PLAY AGAIN" onPress={handlePlayAgain} style={{ width: "100%" }} />
      <TouchableOpacity onPress={handleExit} style={{ marginTop: 10, alignItems: "center", padding: 10 }}>
        <Text style={{ color: colors.mintDim, fontSize: 12, letterSpacing: 3, textTransform: "uppercase" }}>Exit to Menu</Text>
      </TouchableOpacity>
    </ImageBackground>
  );
}
