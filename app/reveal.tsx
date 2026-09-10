import { Text, View, Animated, ImageBackground } from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGame } from "./context/GameContext";
import { GradientButton } from "./components/GradientButton";
import { OutlineButton } from "./components/OutlineButton";
import { colors } from "./theme";
import { genreForDance } from "./lib/danceGenreMap";
import { computeMovesScore, computeRhythmScore, type Pose } from "./lib/danceScoring";
import poseReferenceData from "../assets/data/pose-reference.json";

const REFERENCE_POSES = poseReferenceData as Record<string, { label: string; landmarks: Pose }[]>;

// Old random ranges, kept as the fallback for any dance without reference
// pose data yet (see app/lib/danceGenreMap.ts) and as the floor/ceiling feel
// for real scores below, so the UI's bar-fill math (rhythmScore/40,
// physScore/60) keeps behaving the same regardless of which path scored.
function randomRhythmScore() {
  return Math.floor(Math.random() * 40) + 20;
}
function randomPhysScore() {
  return Math.floor(Math.random() * 60) + 20;
}

export default function Reveal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    players,
    currentPlayer,
    currentPlayerIndex,
    currentRoundIndex,
    roundCount,
    currentCountry,
    capturedFrames,
    addScore,
    nextPlayerTurn,
    nextRound,
    setCurrentPlayerIndex,
  } = useGame();
  const [phase, setPhase] = useState("suspense");
  const rhythmAnim = useRef(new Animated.Value(0)).current;
  const physAnim = useRef(new Animated.Value(0)).current;
  const textAnim = useRef(new Animated.Value(0)).current;

  // Real scoring when the round's dance has reference pose data (see
  // app/lib/danceGenreMap.ts) and the recording actually captured usable
  // frames; falls back to the original random placeholder otherwise, so an
  // uncovered dance (most of the 32-country list, still) plays exactly like
  // it did before this was wired up rather than scoring everyone a flat 0.
  const [rhythmScore] = useState(() => {
    const rhythmNorm = computeRhythmScore(capturedFrames);
    return rhythmNorm !== null ? Math.round(rhythmNorm * 40) + 20 : randomRhythmScore();
  });
  const [physScore] = useState(() => {
    const genre = currentCountry ? genreForDance(currentCountry.dance) : null;
    const referencePoses = genre ? REFERENCE_POSES[genre]?.map(p => p.landmarks) ?? [] : [];
    const movesNorm =
      referencePoses.length > 0
        ? computeMovesScore(capturedFrames.map(f => f.pose), referencePoses)
        : null;
    return movesNorm !== null ? Math.round(movesNorm * 60) + 20 : randomPhysScore();
  });
  const scoredRef = useRef(false);

  useEffect(() => {
    setTimeout(() => setPhase("splitscreen"), 2000);
  }, []);

  useEffect(() => {
    if (phase === "scores") {
      Animated.parallel([
        Animated.timing(rhythmAnim, { toValue: rhythmScore / 40, duration: 1400, useNativeDriver: false }),
        Animated.timing(physAnim, { toValue: physScore / 60, duration: 1400, useNativeDriver: false }),
        Animated.timing(textAnim, { toValue: 1, duration: 1400, useNativeDriver: false }),
      ]).start();

      if (!scoredRef.current) {
        scoredRef.current = true;
        addScore(currentPlayerIndex, rhythmScore + physScore);
      }
    }
  }, [phase]);

  const rhythmHeight = rhythmAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  const physHeight = physAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  const textTranslateY = textAnim.interpolate({ inputRange: [0, 1], outputRange: [120, 0] });
  const textSize = textAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 22] });
  const textLetterSpacing = textAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 8] });

  const handleNext = () => {
    const isLastPlayerOfRound = currentPlayerIndex === players.length - 1;

    if (!isLastPlayerOfRound) {
      nextPlayerTurn();
      router.push("/round");
      return;
    }

    const isFinalRound = currentRoundIndex + 1 >= roundCount;
    if (isFinalRound) {
      router.push("/winner");
      return;
    }

    nextRound();
    setCurrentPlayerIndex(0);
    router.push("/leaderboard");
  };

  return (
    <ImageBackground
      source={require("../assets/images/bg_reveal.jpg")}
      resizeMode="cover"
      style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, paddingBottom: 24 + Math.max(insets.bottom, 24) }}
    >
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(6,20,15,0.4)" }} pointerEvents="none" />

      {phase === "suspense" && (
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: colors.pink, fontSize: 16, letterSpacing: 4, textTransform: "uppercase", marginBottom: 24 }}>Calculating...</Text>
          <Text style={{ fontSize: 80 }}>⚡</Text>
        </View>
      )}

      {phase === "splitscreen" && (
        // Same fix as the scores phase below: flex:1 + space-between instead of
        // a centered block of fixed-height content, so the comparison cards
        // shrink to fit whatever height is actually available instead of
        // pushing SEE MY SCORE past the bottom edge on a shorter screen.
        <View style={{ flex: 1, width: "100%", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: colors.mint, fontSize: 20, fontWeight: "700", marginBottom: 8, textAlign: "center" }}>{currentPlayer ? currentPlayer.name : ""}</Text>
            <Text style={{ color: colors.pink, fontSize: 14, letterSpacing: 4, textTransform: "uppercase", textAlign: "center" }}>How did you do?</Text>
          </View>
          <View style={{ flexDirection: "row", width: "100%", flex: 1, minHeight: 0, marginVertical: 16 }}>
            <View style={{ flex: 1, backgroundColor: colors.card, justifyContent: "center", alignItems: "center", marginRight: 6, borderRadius: 14, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 60 }}>🕺</Text>
              <Text style={{ color: colors.mint, fontSize: 15, marginTop: 12, fontWeight: "700", letterSpacing: 2 }}>YOUR MOVES</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.card, justifyContent: "center", alignItems: "center", marginLeft: 6, borderRadius: 14, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 60 }}>💃</Text>
              <Text style={{ color: colors.cyan, fontSize: 15, marginTop: 12, fontWeight: "700", letterSpacing: 2 }}>PRO MOVES</Text>
            </View>
          </View>
          <OutlineButton label="SEE MY SCORE" onPress={() => setPhase("scores")} style={{ paddingHorizontal: 32, paddingVertical: 14 }} />
        </View>
      )}

      {phase === "scores" && (
        // flex:1 (not a fixed/centered height) so this always fills exactly the
        // space available under the safe-area padding above -- the chart area
        // below is flex-based too, so on a short landscape screen it shrinks
        // instead of pushing the NEXT button past the bottom edge.
        <View style={{ flex: 1, width: "100%", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: colors.mint, fontSize: 20, fontWeight: "700", marginBottom: 12, textAlign: "center" }}>{currentPlayer ? currentPlayer.name : ""}</Text>
          <View style={{ flexDirection: "row", width: "100%", flex: 1, minHeight: 0 }}>
            <View style={{ flexDirection: "row", flex: 1, alignItems: "flex-end" }}>
              <View style={{ flex: 1, alignItems: "center", marginRight: 12, height: "100%" }}>
                <View style={{ width: 44, flex: 1, backgroundColor: colors.card, borderRadius: 8, justifyContent: "flex-end", overflow: "hidden" }}>
                  <Animated.View style={{ width: 44, height: rhythmHeight, backgroundColor: colors.cyan }} />
                </View>
                <Text style={{ color: colors.mint, fontSize: 12, letterSpacing: 2, marginTop: 8, textTransform: "uppercase" }}>Rhythm</Text>
              </View>
              <View style={{ flex: 1, alignItems: "center", height: "100%" }}>
                <View style={{ width: 44, flex: 1, backgroundColor: colors.card, borderRadius: 8, justifyContent: "flex-end", overflow: "hidden" }}>
                  <Animated.View style={{ width: 44, height: physHeight, backgroundColor: colors.pink }} />
                </View>
                <Text style={{ color: colors.mint, fontSize: 12, letterSpacing: 2, marginTop: 8, textTransform: "uppercase" }}>Moves</Text>
              </View>
            </View>
            <View style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", paddingBottom: 28 }}>
              <Animated.Text style={{ color: colors.pink, fontWeight: "700", textTransform: "uppercase", transform: [{ translateY: textTranslateY }], fontSize: textSize, letterSpacing: textLetterSpacing }}>
                YOUR{"\n"}SCORE
              </Animated.Text>
            </View>
          </View>
          <GradientButton label="NEXT" onPress={handleNext} style={{ width: "100%", marginTop: 16 }} />
        </View>
      )}

    </ImageBackground>
  );
}
