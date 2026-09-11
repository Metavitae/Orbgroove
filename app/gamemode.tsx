import { Text, View, TouchableOpacity, ImageBackground } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGame } from "./context/GameContext";
import type { GameMode } from "./context/GameContext";
import { GradientButton } from "./components/GradientButton";
import { OutlineButton } from "./components/OutlineButton";
import { colors, fonts, textOnImageShadow } from "./theme";

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
    <ImageBackground
      source={require("../assets/images/bg_pregame.jpg")}
      resizeMode="cover"
      style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, paddingBottom: 24 + Math.max(insets.bottom, 24) }}
    >
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(6,20,15,0.4)" }} pointerEvents="none" />
      {step === "mode" && (
        <View style={{ width: "100%", alignItems: "center" }}>
          <Text style={{ color: colors.pink, fontSize: 13, fontFamily: fonts.labelMedium, letterSpacing: 4, textTransform: "uppercase", marginBottom: 16, ...textOnImageShadow }}>Game Mode</Text>
          <Text style={{ color: colors.mint, fontSize: 36, fontFamily: fonts.displaySemiBold, fontStyle: "italic", marginBottom: 60, textAlign: "center", ...textOnImageShadow }}>How shall we play?</Text>
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
          <Text style={{ color: colors.pink, fontSize: 13, fontFamily: fonts.labelMedium, letterSpacing: 4, textTransform: "uppercase", marginBottom: 16, ...textOnImageShadow }}>Rounds</Text>
          <Text style={{ color: colors.mint, fontSize: 36, fontFamily: fonts.displaySemiBold, fontStyle: "italic", marginBottom: 60, textAlign: "center", ...textOnImageShadow }}>How many rounds?</Text>
          {roundOptions.map(count => (
            <OutlineButton key={count} label={`${count} Rounds`} onPress={() => chooseRounds(count)} style={{ width: "100%", marginBottom: 16 }} />
          ))}
        </View>
      )}
    </ImageBackground>
  );
}
