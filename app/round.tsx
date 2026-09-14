import { Text, View, Animated, Easing, ImageBackground } from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGame } from "./context/GameContext";
import { GradientButton } from "./components/GradientButton";
import { colors, fonts, textOnImageShadow } from "./theme";

const genres = [
  { name: "House" },
  { name: "Hip-Hop" },
  { name: "Afrobeats" },
  { name: "K-pop" },
  { name: "Samba" },
  { name: "Flamenco" },
  { name: "Tango" },
  { name: "Salsa" },
  { name: "Merengue" },
  { name: "Hula" },
  { name: "Dancehall" },
  { name: "Waltz" },
  { name: "Cumbia" },
  { name: "Amapiano" },
  { name: "Jersey Club" },
];

export default function Round() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentPlayer, currentRoundIndex, roundCount, currentGenre, setCurrentGenre, usedGenres, markGenreUsed } = useGame();
  const [phase, setPhase] = useState("spinning");
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    anim.start();

    setTimeout(() => {
      anim.stop();
      const isFinalRound = currentRoundIndex + 1 >= roundCount;
      // Final round draws only from genres not yet danced this match, so
      // the last round never repeats an earlier reveal. Falls back to the
      // full pool if every entry has already been used (only possible with
      // more player turns than the genre pool has room for).
      const pool = isFinalRound
        ? genres.filter(g => !usedGenres.includes(g.name)).length > 0
          ? genres.filter(g => !usedGenres.includes(g.name))
          : genres
        : genres;
      const picked = pool[Math.floor(Math.random() * pool.length)];
      setCurrentGenre(picked);
      markGenreUsed(picked.name);
      setPhase("reveal");
    }, 3000);
  }, []);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <ImageBackground
      source={require("../assets/images/bg_round_intro.jpg")}
      resizeMode="cover"
      style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, paddingBottom: 24 + Math.max(insets.bottom, 24) }}
    >
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.scrim }} pointerEvents="none" />
      {phase === "spinning" && (
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: colors.pink, fontSize: 11, fontFamily: fonts.labelMedium, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8, ...textOnImageShadow }}>
            Round {currentRoundIndex + 1} of {roundCount}
          </Text>
          <Text style={{ color: colors.mintDim, fontSize: 13, fontFamily: fonts.labelMedium, letterSpacing: 4, textTransform: "uppercase", marginBottom: 40, ...textOnImageShadow }}>Get Ready...</Text>
          <Animated.Text style={{ fontSize: 100, transform: [{ rotate: spin }] }}>🌍</Animated.Text>
        </View>
      )}
      {phase === "reveal" && currentGenre && (
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: colors.mint, fontSize: 42, fontFamily: fonts.displayBold, marginBottom: 12, ...textOnImageShadow }}>{currentGenre.name}</Text>
          <Text style={{ color: colors.pink, fontSize: 13, fontFamily: fonts.labelMedium, letterSpacing: 4, textTransform: "uppercase", marginBottom: 60, ...textOnImageShadow }}>
            {currentPlayer ? `${currentPlayer.name}, get dancing!` : "Get dancing!"}
          </Text>
          <GradientButton label="I'M READY" onPress={() => router.push("/recording")} />
        </View>
      )}
    </ImageBackground>
  );
}
