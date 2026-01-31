import { Colors } from "@/constants/theme";

export function useTheme() {
  const theme = Colors.dark;
  const isDark = true;

  return {
    theme,
    isDark,
  };
}
