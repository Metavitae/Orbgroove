import { Text, View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GradientButton } from "./components/GradientButton";
import { colors } from "./theme";

export default function Index() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg, paddingHorizontal: 40, paddingBottom: Math.max(insets.bottom, 24) }}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 60, fontWeight: "700", width: "100%", textAlign: "center" }}>
        <Text style={{ color: colors.mint }}>Orb</Text>
        <Text style={{ color: colors.pink }}>groove</Text>
      </Text>
      <GradientButton label="START GAME" onPress={() => router.push("/gamemode")} style={{ marginTop: 40 }} />
      <TouchableOpacity onPress={() => router.push("/pose-test")} style={{ marginTop: 20 }}>
        <Text style={{ color: colors.mintDim, fontSize: 12, opacity: 0.5 }}>pose test (dev)</Text>
      </TouchableOpacity>
    </View>
  );
}
