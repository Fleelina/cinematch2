import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, Animated, ActivityIndicator, Alert,
} from 'react-native';
import { Colors, Radii, Shadows } from '../../theme';
import OnboardingProgress from '../../components/OnboardingProgress';
import { useOnboarding } from '../../context/OnboardingContext';
import api from '../../services/api';

export default function Step1Username({ navigation }) {
  const { data, update } = useOnboarding();
  const [username, setUsername] = useState(data.username);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState(null); // 'ok' | 'taken' | null
  const btnScale = useRef(new Animated.Value(1)).current;
  const checkTimer = useRef(null);

  const onChangeText = (val) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_.]/g, '');
    setUsername(clean);
    setStatus(null);

    if (checkTimer.current) clearTimeout(checkTimer.current);
    if (clean.length >= 3) {
      checkTimer.current = setTimeout(() => checkUsername(clean), 600);
    }
  };

  const checkUsername = async (val) => {
    setChecking(true);
    try {
      const res = await api.get(`/users/check-username?username=${val}`);
      setStatus(res.data.available ? 'ok' : 'taken');
    } catch {
      setStatus(null);
    } finally {
      setChecking(false);
    }
  };

  const handleNext = () => {
    if (username.length < 3) { Alert.alert('Çok kısa', 'En az 3 karakter olmalı.'); return; }
    if (status === 'taken') { Alert.alert('Kullanımda', 'Bu kullanıcı adı alınmış.'); return; }
    update({ username });
    navigation.navigate('Step2Account');
  };

  const animatePress = (v) =>
    Animated.spring(btnScale, { toValue: v, useNativeDriver: true, speed: 40 }).start();

  const borderColor = status === 'ok'
    ? Colors.green
    : status === 'taken'
    ? '#ff3b30'
    : username.length > 0
    ? Colors.red
    : Colors.border;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.bgAccent} pointerEvents="none" />
      <OnboardingProgress step={1} />

      <View style={styles.body}>
        <Text style={styles.eyebrow}>CineMatch'e Hoş Geldin 🎬</Text>
        <Text style={styles.title}>Kullanıcı adın{'\n'}ne olsun?</Text>
        <Text style={styles.subtitle}>
          Bu ad profilinde görünecek. Sonradan değiştirebilirsin.
        </Text>

        <View style={styles.inputWrap}>
          <Text style={styles.atSign}>@</Text>
          <TextInput
            style={[styles.input, { borderColor }]}
            value={username}
            onChangeText={onChangeText}
            placeholder="kullanici_adi"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoFocus
            maxLength={24}
          />
          <View style={styles.statusIcon}>
            {checking
              ? <ActivityIndicator size="small" color={Colors.red} />
              : status === 'ok'
              ? <Text style={{ color: Colors.green, fontWeight: '800' }}>✓</Text>
              : status === 'taken'
              ? <Text style={{ color: '#ff3b30', fontWeight: '800' }}>✕</Text>
              : null
            }
          </View>
        </View>

        {status === 'taken' && (
          <Text style={styles.errorMsg}>Bu kullanıcı adı zaten alınmış.</Text>
        )}
        {status === 'ok' && (
          <Text style={styles.successMsg}>@{username} kullanılabilir ✓</Text>
        )}
        <Text style={styles.hint}>Sadece harf, rakam, nokta ve alt çizgi</Text>
      </View>

      <View style={styles.footer}>
        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <Pressable
            style={[styles.nextBtn, (!username || status === 'taken') && styles.nextBtnDisabled]}
            onPress={handleNext}
            onPressIn={() => animatePress(0.97)}
            onPressOut={() => animatePress(1)}
            disabled={!username || status === 'taken'}
          >
            <Text style={styles.nextBtnText}>Devam Et →</Text>
          </Pressable>
        </Animated.View>
        <Text style={styles.stepInfo}>1 / 5</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  bgAccent: {
    position: 'absolute', top: -60, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: Colors.redGlow, opacity: 0.5,
  },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 32 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 3, color: Colors.red, textTransform: 'uppercase', marginBottom: 12 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8, color: Colors.textPrimary, lineHeight: 38, marginBottom: 10 },
  subtitle: { fontSize: 14, color: Colors.textMuted, lineHeight: 20, marginBottom: 36 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgInput,
    borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, marginBottom: 10,
  },
  atSign: { color: Colors.textSecondary, fontSize: 18, fontWeight: '600', marginRight: 6 },
  input: {
    flex: 1, color: Colors.textPrimary, fontSize: 18,
    paddingVertical: 16, fontWeight: '600',
    borderWidth: 0, backgroundColor: 'transparent',
  },
  statusIcon: { width: 24, alignItems: 'center' },
  errorMsg: { color: '#ff3b30', fontSize: 12, marginBottom: 6 },
  successMsg: { color: Colors.green, fontSize: 12, marginBottom: 6 },
  hint: { fontSize: 11, color: Colors.textMuted },
  footer: { padding: 24, paddingBottom: 36 },
  nextBtn: {
    backgroundColor: Colors.red, borderRadius: Radii.md,
    padding: 17, alignItems: 'center', marginBottom: 12, ...Shadows.red,
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },
  stepInfo: { color: Colors.textMuted, fontSize: 11, textAlign: 'center' },
});
