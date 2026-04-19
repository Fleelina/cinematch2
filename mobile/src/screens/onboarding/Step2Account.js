import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, Animated, ScrollView, Alert,
} from 'react-native';
import { Colors, Radii, Shadows } from '../../theme';
import OnboardingProgress from '../../components/OnboardingProgress';
import { useOnboarding } from '../../context/OnboardingContext';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function Step2Account({ navigation }) {
  const { data, update } = useOnboarding();
  const [email, setEmail] = useState(data.email);
  const [password, setPassword] = useState(data.password);
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused] = useState(null);
  const btnScale = useRef(new Animated.Value(1)).current;

  const emailOk = isValidEmail(email);
  const passOk = password.length >= 6;
  const canNext = emailOk && passOk;

  const handleNext = () => {
    if (!emailOk) { Alert.alert('Geçersiz e-posta', 'Lütfen geçerli bir e-posta gir.'); return; }
    if (!passOk) { Alert.alert('Şifre çok kısa', 'En az 6 karakter olmalı.'); return; }
    update({ email, password });
    navigation.navigate('Step3Profile');
  };

  const animatePress = (v) =>
    Animated.spring(btnScale, { toValue: v, useNativeDriver: true, speed: 40 }).start();

  const strengthScore = password.length === 0 ? 0
    : password.length < 6 ? 1
    : password.length < 10 ? 2
    : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3;

  const strengthColors = ['transparent', '#ff3b30', Colors.gold, Colors.green, Colors.green];
  const strengthLabels = ['', 'Çok zayıf', 'Zayıf', 'İyi', 'Güçlü'];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <OnboardingProgress step={2} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableBack onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Hesabını{'\n'}oluştur</Text>
        <Text style={styles.subtitle}>Giriş bilgilerin güvende kalacak.</Text>

        {/* Email */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>E-posta</Text>
          <View style={[styles.inputWrap, focused === 'email' && styles.inputWrapFocused, emailOk && email && styles.inputWrapOk]}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="kullanici@email.com"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
            />
            {emailOk && <Text style={styles.checkMark}>✓</Text>}
          </View>
        </View>

        {/* Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Şifre</Text>
          <View style={[styles.inputWrap, focused === 'password' && styles.inputWrapFocused, passOk && styles.inputWrapOk]}>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="En az 6 karakter"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry={!showPass}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
            />
            <Pressable onPress={() => setShowPass((v) => !v)} style={styles.eyeBtn}>
              <Text style={{ fontSize: 16 }}>{showPass ? '🙈' : '👁'}</Text>
            </Pressable>
          </View>

          {/* Güç göstergesi */}
          {password.length > 0 && (
            <View>
              <View style={styles.strengthTrack}>
                {[1, 2, 3, 4].map((s) => (
                  <View
                    key={s}
                    style={[
                      styles.strengthSeg,
                      { backgroundColor: s <= strengthScore ? strengthColors[strengthScore] : Colors.border },
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.strengthLabel, { color: strengthColors[strengthScore] }]}>
                {strengthLabels[strengthScore]}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <Pressable
            style={[styles.nextBtn, !canNext && styles.nextBtnDisabled]}
            onPress={handleNext}
            onPressIn={() => animatePress(0.97)}
            onPressOut={() => animatePress(1)}
            disabled={!canNext}
          >
            <Text style={styles.nextBtnText}>Devam Et →</Text>
          </Pressable>
        </Animated.View>
        <Text style={styles.stepInfo}>2 / 5</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

function TouchableBack({ onPress }) {
  return (
    <Pressable onPress={onPress} style={{ marginBottom: 24, alignSelf: 'flex-start' }}>
      <Text style={{ color: Colors.red, fontWeight: '600', fontSize: 14 }}>← Geri</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  body: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8, color: Colors.textPrimary, lineHeight: 38, marginBottom: 10 },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginBottom: 32 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: Colors.textMuted, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgInput, borderRadius: Radii.md,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 16,
  },
  inputWrapFocused: { borderColor: Colors.red, backgroundColor: Colors.redDim },
  inputWrapOk: { borderColor: Colors.green, backgroundColor: Colors.greenDim },
  input: { flex: 1, color: Colors.textPrimary, fontSize: 15, paddingVertical: 16 },
  checkMark: { color: Colors.green, fontWeight: '800', fontSize: 16 },
  eyeBtn: { padding: 4 },
  strengthTrack: { flexDirection: 'row', gap: 4, marginTop: 10, marginBottom: 4 },
  strengthSeg: { flex: 1, height: 3, borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: '600' },
  footer: { padding: 24, paddingBottom: 36 },
  nextBtn: { backgroundColor: Colors.red, borderRadius: Radii.md, padding: 17, alignItems: 'center', marginBottom: 12, ...Shadows.red },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },
  stepInfo: { color: Colors.textMuted, fontSize: 11, textAlign: 'center' },
});
