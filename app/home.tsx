import { Text, View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function Index() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1A0A2E", paddingHorizontal: 40 }}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: "#C9963A", fontSize: 60, fontWeight: "600", letterSpacing: 6, width: "100%", textAlign: "center" }}>ORBGROOVE</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: "#F0E6FF", fontSize: 16, marginTop: 8, fontStyle: "italic", width: "100%", textAlign: "center" }}>How Do You Dance?</Text>
      <TouchableOpacity onPress={() => router.push("/gamemode")} style={{ marginTop: 60, backgroundColor: "#C9963A", paddingHorizontal: 48, paddingVertical: 18 }}>
        <Text style={{ color: "#1A0A2E", fontSize: 16, letterSpacing: 4, fontWeight: "700" }}>START GAME</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push("/pose-test")} style={{ marginTop: 20 }}>
        <Text style={{ color: "#F0E6FF", fontSize: 12, opacity: 0.5 }}>pose test (dev)</Text>
      </TouchableOpacity>
    </View>
  );
}
