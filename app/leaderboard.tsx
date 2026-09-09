import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGame } from "./context/GameContext";
import { GradientButton } from "./components/GradientButton";
import { colors } from "./theme";

export default function Leaderboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { players, currentRoundIndex } = useGame();

  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <View style={{ flex: 1, justifyContent: "center", backgroundColor: colors.bg, padding: 14, paddingBottom: 14 + insets.bottom }}>
      <Text style={{ color: colors.pink, fontSize: 10, letterSpacing: 3, textTransform: "uppercase", marginBottom: 4, textAlign: "center" }}>After Round {currentRoundIndex}</Text>
      <Text style={{ color: colors.mint, fontSize: 20, fontStyle: "italic", marginBottom: 8, textAlign: "center" }}>Leaderboard</Text>
      {sorted.map((p, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", width: "100%", backgroundColor: colors.card, borderWidth: i === 0 ? 1.5 : 0, borderColor: colors.pink, borderRadius: 14, padding: 6, marginBottom: 5 }}>
          <Text style={{ color: i === 0 ? colors.pink : colors.mint, fontSize: 15, fontWeight: "700", width: 26 }}>{i + 1}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: i === 0 ? colors.pink : colors.mint, fontSize: 12, fontWeight: "700" }}>{p.name}</Text>
            <Text style={{ color: colors.mintDim, fontSize: 8, letterSpacing: 2, textTransform: "uppercase" }}>{p.type}</Text>
          </View>
          <Text style={{ color: i === 0 ? colors.pink : colors.mint, fontSize: 16, fontWeight: "700" }}>{p.score}</Text>
        </View>
      ))}
      <GradientButton label="NEXT ROUND" onPress={() => router.push("/round")} style={{ width: "100%", marginTop: 10 }} />
    </View>
  );
}
