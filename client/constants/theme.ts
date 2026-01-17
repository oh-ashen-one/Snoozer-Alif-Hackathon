import { Platform } from "react-native";

export const Colors = {
  bg: '#0C0A09',
  bgCard: '#141211',
  bgElevated: '#1C1917',
  border: '#292524',
  text: '#FAFAF9',
  textSecondary: '#A8A29E',
  textMuted: '#78716C',
  orange: '#FB923C',
  green: '#22C55E',
  red: '#EF4444',
  
  light: {
    text: "#FAFAF9",
    buttonText: "#141211",
    tabIconDefault: "#78716C",
    tabIconSelected: "#FB923C",
    link: "#FB923C",
    backgroundRoot: "#0C0A09",
    backgroundDefault: "#141211",
    backgroundSecondary: "#1C1917",
    backgroundTertiary: "#292524",
  },
  dark: {
    text: "#FAFAF9",
    buttonText: "#141211",
    tabIconDefault: "#78716C",
    tabIconSelected: "#FB923C",
    link: "#FB923C",
    backgroundRoot: "#0C0A09",
    backgroundDefault: "#141211",
    backgroundSecondary: "#1C1917",
    backgroundTertiary: "#292524",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
  inputHeight: 48,
  buttonHeight: 56,
};

export const BorderRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 16,
  xl: 20,
  pill: 100,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500" as const,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
