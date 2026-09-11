import { Text, View, TouchableOpacity, ImageBackground } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GradientButton } from "./components/GradientButton";
import { colors, fonts, textOnImageShadow } from "./theme";

export default function Index() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <ImageBackground
      source={require("../assets/images/bg_home.jpg")}
      resizeMode="cover"
      style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40, paddingBottom: Math.max(insets.bottom, 24) }}
    >
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(6,20,15,0.4)" }} pointerEvents="none" />
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 60, fontFamily: fonts.displayBold, width: "100%", textAlign: "center", ...textOnImageShadow }}>
        <Text style={{ color: colors.mint }}>Orb</Text>
        <Text style={{ color: colors.pink }}>groove</Text>
      </Text>
      <GradientButton label="START GAME" onPress={() => router.push("/gamemode")} style={{ marginTop: 40 }} />
      <TouchableOpacity onPress={() => router.push("/pose-test")} style={{ marginTop: 20 }}>
        <Text style={{ color: colors.mintDim, fontSize: 12, fontFamily: fonts.labelRegular, opacity: 0.5, ...textOnImageShadow }}>pose test (dev)</Text>
      </TouchableOpacity>
    </ImageBackground>
  );
}
