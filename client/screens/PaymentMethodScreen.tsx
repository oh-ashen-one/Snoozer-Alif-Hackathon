import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import {
  PaymentMethod,
  PaymentInfo,
  savePaymentInfo,
  getPaymentInfo,
} from '@/utils/payments';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface PaymentOption {
  id: PaymentMethod;
  label: string;
  subtitle: string;
  icon: string;
  color: string;
  featured?: boolean;
  fieldLabel?: string;
  fieldPlaceholder?: string;
  fieldKey?: keyof PaymentInfo;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: 'apple_cash',
    label: 'iMessage / Apple Cash',
    subtitle: 'Just text your buddy the money',
    icon: '💬',
    color: Colors.green,
    featured: true,
    fieldLabel: "Buddy's phone number",
    fieldPlaceholder: '+1 (555) 123-4567',
    fieldKey: 'phoneNumber',
  },
  {
    id: 'venmo',
    label: 'Venmo',
    subtitle: 'Pay via Venmo app',
    icon: '💵',
    color: '#008CFF',
    fieldLabel: "Buddy's Venmo username",
    fieldPlaceholder: '@username',
    fieldKey: 'venmoUsername',
  },
  {
    id: 'paypal',
    label: 'PayPal',
    subtitle: 'Pay via PayPal.me',
    icon: '💳',
    color: '#003087',
    fieldLabel: "Buddy's PayPal.me username",
    fieldPlaceholder: 'username',
    fieldKey: 'paypalUsername',
  },
  {
    id: 'cashapp',
    label: 'Cash App',
    subtitle: 'Pay via Cash App',
    icon: '💵',
    color: '#00D632',
    fieldLabel: "Buddy's $cashtag",
    fieldPlaceholder: '$cashtag',
    fieldKey: 'cashTag',
  },
];

export default function PaymentMethodScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('apple_cash');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [venmoUsername, setVenmoUsername] = useState('');
  const [paypalUsername, setPaypalUsername] = useState('');
  const [cashTag, setCashTag] = useState('');

  useEffect(() => {
    loadExistingInfo();
  }, []);

  const loadExistingInfo = async () => {
    const info = await getPaymentInfo();
    if (info) {
      setSelectedMethod(info.method);
      if (info.phoneNumber) setPhoneNumber(info.phoneNumber);
      if (info.venmoUsername) setVenmoUsername(info.venmoUsername);
      if (info.paypalUsername) setPaypalUsername(info.paypalUsername);
      if (info.cashTag) setCashTag(info.cashTag);
    }
  };

  const handleSelectMethod = useCallback((method: PaymentMethod) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMethod(method);
  }, []);

  const handleSave = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const info: PaymentInfo = {
      method: selectedMethod,
      phoneNumber: phoneNumber || undefined,
      venmoUsername: venmoUsername || undefined,
      paypalUsername: paypalUsername || undefined,
      cashTag: cashTag || undefined,
    };

    await savePaymentInfo(info);
    navigation.goBack();
  }, [selectedMethod, phoneNumber, venmoUsername, paypalUsername, cashTag, navigation]);

  const getFieldValue = (fieldKey: keyof PaymentInfo | undefined): string => {
    switch (fieldKey) {
      case 'phoneNumber':
        return phoneNumber;
      case 'venmoUsername':
        return venmoUsername;
      case 'paypalUsername':
        return paypalUsername;
      case 'cashTag':
        return cashTag;
      default:
        return '';
    }
  };

  const setFieldValue = (fieldKey: keyof PaymentInfo | undefined, value: string) => {
    switch (fieldKey) {
      case 'phoneNumber':
        setPhoneNumber(value);
        break;
      case 'venmoUsername':
        setVenmoUsername(value);
        break;
      case 'paypalUsername':
        setPaypalUsername(value);
        break;
      case 'cashTag':
        setCashTag(value);
        break;
    }
  };

  const selectedOption = PAYMENT_OPTIONS.find(opt => opt.id === selectedMethod);
  const canSave = selectedOption?.fieldKey ? getFieldValue(selectedOption.fieldKey).length > 0 : true;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BackgroundGlow color="orange" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText style={styles.title}>How do you want to settle up?</ThemedText>
          <ThemedText style={styles.subtitle}>
            Choose how you'll send money when you lose
          </ThemedText>
        </View>

        {/* Featured option - Apple Cash */}
        {PAYMENT_OPTIONS.filter(opt => opt.featured).map(option => (
          <Pressable
            key={option.id}
            style={[
              styles.optionCard,
              styles.featuredCard,
              selectedMethod === option.id && {
                borderColor: option.color,
                backgroundColor: `${option.color}10`,
              },
            ]}
            onPress={() => handleSelectMethod(option.id)}
          >
            <View style={styles.optionHeader}>
              <View style={[styles.optionIcon, { backgroundColor: `${option.color}20` }]}>
                <Text style={{ fontSize: 24 }}>{option.icon}</Text>
              </View>
              <View style={styles.optionText}>
                <ThemedText style={styles.optionLabel}>{option.label}</ThemedText>
                <ThemedText style={styles.optionSubtitle}>{option.subtitle}</ThemedText>
              </View>
              <View
                style={[
                  styles.radioOuter,
                  selectedMethod === option.id && { borderColor: option.color },
                ]}
              >
                {selectedMethod === option.id && (
                  <View style={[styles.radioInner, { backgroundColor: option.color }]} />
                )}
              </View>
            </View>

            {selectedMethod === option.id && option.fieldKey && (
              <View style={styles.fieldContainer}>
                <ThemedText style={styles.fieldLabel}>{option.fieldLabel}</ThemedText>
                <TextInput
                  style={styles.textInput}
                  value={getFieldValue(option.fieldKey)}
                  onChangeText={(text) => setFieldValue(option.fieldKey, text)}
                  placeholder={option.fieldPlaceholder}
                  placeholderTextColor={Colors.textMuted}
                  keyboardType={option.id === 'apple_cash' ? 'phone-pad' : 'default'}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}
          </Pressable>
        ))}

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <ThemedText style={styles.dividerText}>or use another app</ThemedText>
          <View style={styles.dividerLine} />
        </View>

        {/* Other options */}
        {PAYMENT_OPTIONS.filter(opt => !opt.featured).map(option => (
          <Pressable
            key={option.id}
            style={[
              styles.optionCard,
              selectedMethod === option.id && {
                borderColor: option.color,
                backgroundColor: `${option.color}10`,
              },
            ]}
            onPress={() => handleSelectMethod(option.id)}
          >
            <View style={styles.optionHeader}>
              <View style={[styles.optionIcon, { backgroundColor: `${option.color}20` }]}>
                <Text style={{ fontSize: 20 }}>{option.icon}</Text>
              </View>
              <View style={styles.optionText}>
                <ThemedText style={styles.optionLabel}>{option.label}</ThemedText>
                <ThemedText style={styles.optionSubtitle}>{option.subtitle}</ThemedText>
              </View>
              <View
                style={[
                  styles.radioOuter,
                  selectedMethod === option.id && { borderColor: option.color },
                ]}
              >
                {selectedMethod === option.id && (
                  <View style={[styles.radioInner, { backgroundColor: option.color }]} />
                )}
              </View>
            </View>

            {selectedMethod === option.id && option.fieldKey && (
              <View style={styles.fieldContainer}>
                <ThemedText style={styles.fieldLabel}>{option.fieldLabel}</ThemedText>
                <TextInput
                  style={styles.textInput}
                  value={getFieldValue(option.fieldKey)}
                  onChangeText={(text) => setFieldValue(option.fieldKey, text)}
                  placeholder={option.fieldPlaceholder}
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomCta, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
        >
          <ThemedText style={styles.saveButtonText}>Save Payment Method</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  optionCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 12,
  },
  featuredCard: {
    borderWidth: 2,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  fieldContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 14,
    color: Colors.textMuted,
    marginHorizontal: 16,
  },
  bottomCta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.bg,
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saveButton: {
    backgroundColor: Colors.orange,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: Colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
});
