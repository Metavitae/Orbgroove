import { Stack } from "expo-router";
import { useEffect, useCallback } from "react";
import * as ScreenOrientation from "expo-screen-orientation";
import * as SplashScreen from "expo-splash-screen";
import { Camera } from "react-native-vision-camera";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, Fredoka_400Regular, Fredoka_600SemiBold, Fredoka_700Bold } from "@expo-google-fonts/fredoka";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";
import { GameProvider } from "./context/GameContext";
import { requestMicPermissionOnce } from "./context/micPermission";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fredoka_400Regular,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    requestMicPermissionOnce();
    Camera.requestCameraPermission();
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
  }, []);

  const onLayoutRootView = useCallback(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
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
          <Stack.Screen name="pose-test" />
        </Stack>
      </GameProvider>
    </SafeAreaProvider>
  );
}
