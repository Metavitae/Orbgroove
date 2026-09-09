import { Text, View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGame } from "./context/GameContext";
import type { GameMode } from "./context/GameContext";
import { GradientButton } from "./components/GradientButton";
import { OutlineButton } from "./components/OutlineButton";
import { colors } from "./theme";

const roundOptions = [3, 5, 7];

export default function GameMode() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setRoundCount } = useGame();
  const [step, setStep] = useState<"mode" | "rounds">("mode");
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);

  const chooseMode = (mode: GameMode) => {
    setSelectedMode(mode);
    setStep("rounds");
  };

  const chooseRounds = (count: number) => {
    setRoundCount(count);
    router.push({ pathname: "/players", params: { mode: selectedMode ?? "pure" } });
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg, padding: 24, paddingBottom: 24 + insets.bottom }}>
      {step === "mode" && (
        <View style={{ width: "100%", alignItems: "center" }}>
          <Text style={{ color: colors.pink, fontSize: 13, letterSpacing: 4, textTransform: "uppercase", marginBottom: 16 }}>Game Mode</Text>
          <Text style={{ color: colors.mint, fontSize: 36, fontStyle: "italic", marginBottom: 60, textAlign: "center" }}>How shall we play?</Text>
          <GradientButton
            label="Pure Scoring"
            subtitle="AI judges everything"
            onPress={() => chooseMode("pure")}
            style={{ width: "100%", marginBottom: 16 }}
          />
          <OutlineButton
            label="Crowd Favorite"
            subtitle="AI scores + audience votes"
            onPress={() => chooseMode("crowd")}
            style={{ width: "100%" }}
          />
        </View>
      )}

      {step === "rounds" && (
        <View style={{ width: "100%", alignItems: "center" }}>
          <Text style={{ color: colors.pink, fontSize: 13, letterSpacing: 4, textTransform: "uppercase", marginBottom: 16 }}>Rounds</Text>
          <Text style={{ color: colors.mint, fontSize: 36, fontStyle: "italic", marginBottom: 60, textAlign: "center" }}>How many rounds?</Text>
          {roundOptions.map(count => (
            <OutlineButton key={count} label={`${count} Rounds`} onPress={() => chooseRounds(count)} style={{ width: "100%", marginBottom: 16 }} />
          ))}
        </View>
      )}
    </View>
  );
}
