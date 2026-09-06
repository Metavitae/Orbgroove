import { Text, TouchableOpacity, StyleProp, ViewStyle } from "react-native";
import { colors } from "../theme";

export function OutlineButton({
  label,
  subtitle,
  onPress,
  style,
  plain,
}: {
  label: string;
  subtitle?: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  /** Renders label as plain text (no uppercase/letter-spacing) — for free-form
   * strings like player names, which can overflow the shouty default style. */
  plain?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        { borderWidth: 1.5, borderColor: colors.cyan, borderRadius: 16, padding: 16, alignItems: "center" },
        style,
      ]}
    >
      <Text
        style={
          plain
            ? { color: colors.mint, fontSize: 14, fontWeight: "600" }
            : { color: colors.mint, fontSize: 16, fontWeight: "700", letterSpacing: 3, textTransform: "uppercase" }
        }
      >
        {label}
      </Text>
      {subtitle && <Text style={{ color: colors.mintDim, fontSize: 11, marginTop: 4, opacity: 0.85 }}>{subtitle}</Text>}
    </TouchableOpacity>
  );
}
