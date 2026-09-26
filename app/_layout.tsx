import { Stack } from "expo-router";
import { useEffect } from "react";
import * as ScreenOrientation from "expo-screen-orientation";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, Fredoka_600SemiBold, Fredoka_700Bold } from "@expo-google-fonts/fredoka";
import {
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
  JetBrainsMono_800ExtraBold,
} from "@expo-google-fonts/jetbrains-mono";
import { GameProvider } from "./context/GameContext";

export default function RootLayout() {
  // Deliberately not gating the whole app behind this (no "return null until
  // loaded"): if font loading ever stalls or errors, that must never turn
  // into a permanently blank screen. Screens render immediately on the
  // system font and pick up the brand fonts on the re-render once this
  // resolves -- worst case is one flash of the wrong font, not a stuck app.
  const [, fontError] = useFonts({
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    JetBrainsMono_600SemiBold,
    JetBrainsMono_700Bold,
    JetBrainsMono_800ExtraBold,
  });

  useEffect(() => {
    if (fontError) console.error("Font loading failed:", fontError);
  }, [fontError]);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
  }, []);

  return (
    <SafeAreaProvider>
      <GameProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="home" />
          <Stack.Screen name="gamemode" />
          <Stack.Screen name="players" />
          <Stack.Screen name="round" />
          <Stack.Screen name="recording" />
          <Stack.Screen name="reveal" />
          <Stack.Screen name="leaderboard" />
          <Stack.Screen name="winner" />
          <Stack.Screen name="lesson" />
          <Stack.Screen name="pose-test" />
        </Stack>
      </GameProvider>
    </SafeAreaProvider>
  );
}
