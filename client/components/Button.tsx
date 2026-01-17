import React, { ReactNode } from "react";
import { StyleSheet, Pressable, ViewStyle, StyleProp, Platform } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Colors, BorderRadius, Spacing } from "@/constants/theme";

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger';

interface ButtonProps {
  onPress?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  variant?: ButtonVariant;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const getVariantStyles = (variant: ButtonVariant) => {
  switch (variant) {
    case 'success':
      return {
        backgroundColor: Colors.green,
        shadowColor: Colors.green,
      };
    case 'danger':
      return {
        backgroundColor: Colors.red,
        shadowColor: Colors.red,
      };
    case 'secondary':
      return {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: 'transparent',
      };
    case 'primary':
    default:
      return {
        backgroundColor: Colors.orange,
        shadowColor: Colors.orange,
      };
  }
};

export function Button({
  onPress,
  children,
  style,
  disabled = false,
  variant = 'primary',
}: ButtonProps) {
  const scale = useSharedValue(1);
  const variantStyles = getVariantStyles(variant);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.97, springConfig);
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withSpring(1, springConfig);
    }
  };

  const isSecondary = variant === 'secondary';

  return (
    <AnimatedPressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        styles.button,
        variantStyles,
        !isSecondary && styles.buttonShadow,
        {
          opacity: disabled ? 0.5 : 1,
        },
        style,
        animatedStyle,
      ]}
    >
      <ThemedText style={[
        styles.buttonText,
        isSecondary && styles.secondaryText,
      ]}>
        {children}
      </ThemedText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  buttonShadow: {
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
  buttonText: {
    fontWeight: "600",
    fontSize: 16,
    color: Colors.bgCard,
  },
  secondaryText: {
    color: Colors.text,
  },
});
