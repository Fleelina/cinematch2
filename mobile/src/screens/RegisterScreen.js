import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  Animated, Pressable, ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Colors, Radii, Shadows } from '../theme';

const STEPS = [
  { key: 'name', label: 'Adın', placeholder: 'Melih', keyboardType: 'default', secure: false },
  { key: 'email', label: 'E-posta', placeholder: 'kullanici@email.com', keyboardType: 'email-address', secure: false },
  { key: 'password', label: 'Şifre', placeholder: 'En az 6 karakter', keyboardType: 'default', secure: true },
];

export default function RegisterScreen({ navigation }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [focusedField, setFocusedField] = useState(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const btnScale = useRef(new Animated.Value(1)).current;

  const animatePress = (v) =>
    Animated.spring(btnScale, { toValue: v, useNativeDriver: true, speed: 40 }).start();

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password) {
      Alert.alert('Eksik bilgi', 'Tüm alanlar zorunludur.');
      return;
    }
    if (form.password.length < 6) {
      Alert.alert('Şifre çok kısa', 'En az 6 karakter olmalı.');
      return;
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
    } catch (err) {
      Alert.alert('Kayıt hatası', err.response?.data?.error || 'Kayıt başarısız oldu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: Colors.bg }}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.bgAccent} pointerEvents="none" />

        {/* Geri butonu */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Giriş</Text>
        </TouchableOpacity>

        {/* Başlık */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>CineMatch</Text>
          <Text style={styles.title}>Hesap oluştur</Text>
          <Text style={styles.subtitle}>Film zevkini paylaşacak insanları bul</Text>
        </View>

        {/* Adım göstergesi */}
        <View style={styles.stepRow}>
          {STEPS.map((s, i) => (
            <View
              key={s.key}
              style={[styles.stepDot, form[s.key] && styles.stepDotFilled]}
            />
          ))}
        </View>

        {/* Form alanları */}
        <View style={styles.form}>
          {STEPS.map((step) => (
            <View key={step.key} style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{step.label}</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === step.key && styles.inputFocused,
                  form[step.key] && styles.inputFilled,
                ]}
                placeholder={step.placeholder}
                placeholderTextColor={Colors.textMuted}
                value={form[step.key]}
                onChangeText={(v) => setForm((prev) => ({ ...prev, [step.key]: v }))}
                keyboardType={step.keyboardType}
                autoCapitalize={step.key === 'name' ? 'words' : 'none'}
                secureTextEntry={step.secure}
                onFocus={() => setFocusedField(step.key)}
                onBlur={() => setFocusedField(null)}
              />
              {/* Dolu ise tik */}
              {form[step.key] ? (
                <View style={styles.checkIcon}>
                  <Text style={styles.checkIconText}>✓</Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>

        {/* Kayıt butonu */}
        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
            onPress={handleRegister}
            onPressIn={() => animatePress(0.97)}
            onPressOut={() => animatePress(1)}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>Kayıt Ol</Text>
            }
          </Pressable>
        </Animated.View>

        {/* Giriş linki */}
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginLink}>
            Zaten hesabın var mı?{' '}
            <Text style={styles.loginLinkBold}>Giriş yap</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.bg,
    padding: 24,
    justifyContent: 'center',
  },
  bgAccent: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: Colors.redGlow,
    opacity: 0.4,
  },
  backBtn: { alignSelf: 'flex-start', marginBottom: 32 },
  backBtnText: { color: Colors.red, fontSize: 14, fontWeight: '600' },

  header: { marginBottom: 28 },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 5,
    color: Colors.red,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: { fontSize: 13, color: Colors.textMuted },

  stepRow: { flexDirection: 'row', gap: 6, marginBottom: 28 },
  stepDot: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  stepDotFilled: { backgroundColor: Colors.red },

  form: { gap: 0, marginBottom: 24 },
  inputGroup: { marginBottom: 18, position: 'relative' },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: 7,
  },
  input: {
    backgroundColor: Colors.bgInput,
    color: Colors.textPrimary,
    borderRadius: Radii.md,
    padding: 16,
    paddingRight: 44,
    fontSize: 15,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  inputFocused: {
    borderColor: Colors.red,
    backgroundColor: Colors.redDim,
  },
  inputFilled: {
    borderColor: Colors.green,
    backgroundColor: Colors.greenDim,
  },
  checkIcon: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIconText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  primaryBtn: {
    backgroundColor: Colors.red,
    borderRadius: Radii.md,
    padding: 17,
    alignItems: 'center',
    marginBottom: 20,
    ...Shadows.red,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },

  loginLink: { color: Colors.textSecondary, textAlign: 'center', fontSize: 14 },
  loginLinkBold: { color: Colors.red, fontWeight: '700' },
});
