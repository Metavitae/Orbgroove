import { Text, View, Animated, Easing, ImageBackground } from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGame } from "./context/GameContext";
import { GradientButton } from "./components/GradientButton";
import { colors } from "./theme";

const countries = [
  { name: "Brazil", flag: "🇧🇷", dance: "Samba" },
  { name: "Spain", flag: "🇪🇸", dance: "Flamenco" },
  { name: "Argentina", flag: "🇦🇷", dance: "Tango" },
  { name: "India", flag: "🇮🇳", dance: "Bharatanatyam" },
  { name: "Ireland", flag: "🇮🇪", dance: "Riverdance" },
  { name: "Japan", flag: "🇯🇵", dance: "Bon Odori" },
  { name: "Cuba", flag: "🇨🇺", dance: "Salsa" },
  { name: "Colombia", flag: "🇨🇴", dance: "Cumbia" },
  { name: "Mexico", flag: "🇲🇽", dance: "Folklórico (Jarabe Tapatío)" },
  { name: "USA", flag: "🇺🇸", dance: "Hip-Hop/Breaking" },
  { name: "South Korea", flag: "🇰🇷", dance: "K-pop choreography" },
  { name: "France", flag: "🇫🇷", dance: "Cancan" },
  { name: "Greece", flag: "🇬🇷", dance: "Sirtaki" },
  { name: "Egypt", flag: "🇪🇬", dance: "Belly dance" },
  { name: "Nigeria", flag: "🇳🇬", dance: "Afrobeats" },
  { name: "South Africa", flag: "🇿🇦", dance: "Gumboot dance" },
  { name: "China", flag: "🇨🇳", dance: "Chinese fan dance" },
  { name: "Philippines", flag: "🇵🇭", dance: "Tinikling" },
  { name: "Hawaii", flag: "🌺", dance: "Hula" },
  { name: "Austria", flag: "🇦🇹", dance: "Waltz" },
  { name: "Russia", flag: "🇷🇺", dance: "Cossack dance" },
  { name: "Jamaica", flag: "🇯🇲", dance: "Dancehall" },
  { name: "Poland", flag: "🇵🇱", dance: "Polka" },
  { name: "Israel", flag: "🇮🇱", dance: "Hora" },
  { name: "Peru", flag: "🇵🇪", dance: "Marinera" },
  { name: "Dominican Republic", flag: "🇩🇴", dance: "Merengue" },
  { name: "Bavaria", flag: "🇩🇪", dance: "Schuhplattler" },
  { name: "Thailand", flag: "🇹🇭", dance: "Thai classical dance" },
  { name: "Turkey", flag: "🇹🇷", dance: "Halay" },
  { name: "Indonesia", flag: "🇮🇩", dance: "Saman" },
];

export default function Round() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentPlayer, currentRoundIndex, roundCount, currentCountry, setCurrentCountry, usedCountries, markCountryUsed } = useGame();
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
      // Final round draws only from countries not yet danced this match, so
      // the last round never repeats an earlier reveal. Falls back to the
      // full pool if every entry has already been used (only possible with
      // more player turns than the 30-country pool has room for).
      const pool = isFinalRound
        ? countries.filter(c => !usedCountries.includes(c.name)).length > 0
          ? countries.filter(c => !usedCountries.includes(c.name))
          : countries
        : countries;
      const picked = pool[Math.floor(Math.random() * pool.length)];
      setCurrentCountry(picked);
      markCountryUsed(picked.name);
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
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(6,20,15,0.4)" }} pointerEvents="none" />
      {phase === "spinning" && (
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: colors.pink, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>
            Round {currentRoundIndex + 1} of {roundCount}
          </Text>
          <Text style={{ color: colors.mintDim, fontSize: 13, letterSpacing: 4, textTransform: "uppercase", marginBottom: 40 }}>Get Ready...</Text>
          <Animated.Text style={{ fontSize: 100, transform: [{ rotate: spin }] }}>🌍</Animated.Text>
        </View>
      )}
      {phase === "reveal" && currentCountry && (
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 80, marginBottom: 24 }}>{currentCountry.flag}</Text>
          <Text style={{ color: colors.mint, fontSize: 42, fontWeight: "700", marginBottom: 12 }}>{currentCountry.name}</Text>
          <Text style={{ color: colors.pink, fontSize: 13, letterSpacing: 4, textTransform: "uppercase", marginBottom: 60 }}>
            {currentPlayer ? `${currentPlayer.name}, get dancing!` : "Get dancing!"}
          </Text>
          <GradientButton label="I'M READY" onPress={() => router.push("/recording")} />
        </View>
      )}
    </ImageBackground>
  );
}
