import React from "react";
import {
  StyleSheet,
  Pressable,
  ViewStyle,
  StyleProp,
  Platform,
  ActivityIndicator,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Colors, BorderRadius } from "@/constants/theme";

type ButtonVariant = "primary" | "secondary" | "danger" | "success";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  icon?: React.ReactNode;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const VARIANT_STYLES = {
  primary: {
    backgroundColor: Colors.orange,
    shadowColor: Colors.orange,
    textColor: Colors.text,
    hasShadow: true,
  },
  secondary: {
    backgroundColor: "transparent",
    shadowColor: "transparent",
    textColor: Colors.textSecondary,
    hasShadow: false,
  },
  danger: {
    backgroundColor: Colors.red,
    shadowColor: Colors.red,
    textColor: Colors.text,
    hasShadow: true,
  },
  success: {
    backgroundColor: Colors.green,
    shadowColor: Colors.green,
    textColor: Colors.text,
    hasShadow: true,
  },
} as const;

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  icon,
  loading = false,
  style,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const variantConfig = VARIANT_STYLES[variant];
  const isDisabled = disabled || loading;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    if (!isDisabled) {
      scale.value = withSpring(0.98, springConfig);
      opacity.value = withSpring(0.9, springConfig);
    }
  };

  const handlePressOut = () => {
    if (!isDisabled) {
      scale.value = withSpring(1, springConfig);
      opacity.value = withSpring(1, springConfig);
    }
  };

  const buttonStyles = [
    styles.button,
    {
      backgroundColor: variantConfig.backgroundColor,
      shadowColor: variantConfig.shadowColor,
    },
    variant === "secondary" && styles.secondaryBorder,
    variantConfig.hasShadow && styles.shadow,
    isDisabled && styles.disabled,
    style,
  ];

  return (
    <AnimatedPressable
      onPress={isDisabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[buttonStyles, animatedStyle]}
    >
      {loading ? (
        <ActivityIndicator color={variantConfig.textColor} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <ThemedText style={[styles.text, { color: variantConfig.textColor }]}>
            {title}
          </ThemedText>
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: BorderRadius.md,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  secondaryBorder: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  shadow: {
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
      },
      android: {
        elevation: 8,
      },
      web: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
      },
    }),
  },
  disabled: {
    opacity: 0.4,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontWeight: "600",
    fontSize: 16,
  },
});
