import { LinearGradient } from "expo-linear-gradient";
import { Text, TouchableOpacity, StyleProp, ViewStyle } from "react-native";
import { colors, fonts } from "../theme";

export function GradientButton({
  label,
  subtitle,
  onPress,
  style,
}: {
  label: string;
  subtitle?: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={style}>
      <LinearGradient
        colors={colors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 999,
          paddingVertical: 18,
          paddingHorizontal: 48,
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius: 12,
          elevation: 6,
        }}
      >
        <Text style={{ color: colors.darkText, fontSize: 16, fontFamily: fonts.labelBold, letterSpacing: 3 }}>{label}</Text>
        {subtitle && <Text style={{ color: colors.darkText, fontSize: 12, fontFamily: fonts.labelRegular, marginTop: 4, opacity: 0.7 }}>{subtitle}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
}
