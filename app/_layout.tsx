import { Stack } from "expo-router";
import { useEffect } from "react";
import * as ScreenOrientation from "expo-screen-orientation";
import { Camera } from "react-native-vision-camera";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GameProvider } from "./context/GameContext";
import { requestMicPermissionOnce } from "./context/micPermission";

export default function RootLayout() {
  useEffect(() => {
    requestMicPermissionOnce();
    Camera.requestCameraPermission();
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
          <Stack.Screen name="pose-test" />
        </Stack>
      </GameProvider>
    </SafeAreaProvider>
  );
}
