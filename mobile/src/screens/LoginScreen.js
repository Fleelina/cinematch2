import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  Animated, Pressable,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Colors, Radii, Shadows } from '../theme';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const { login } = useAuth();

  const btnScale = useRef(new Animated.Value(1)).current;

  const animatePress = (toValue) =>
    Animated.spring(btnScale, { toValue, useNativeDriver: true, speed: 40 }).start();

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Eksik bilgi', 'E-posta ve şifre zorunludur.'); return; }
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      Alert.alert('Giriş hatası', err.response?.data?.error || 'E-posta veya şifre hatalı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.bgAccent} pointerEvents="none" />

      <View style={styles.logoArea}>
        <Text style={styles.logoEyebrow}>CineMatch</Text>
        <Text style={styles.logoTitle}>Film zevkine{'\n'}göre bağlan.</Text>
        <Text style={styles.logoSub}>Ortak filmler · Gerçek bağlantılar</Text>
      </View>

      <View style={styles.form}>
        <InputField
          label="E-posta"
          placeholder="kullanici@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          focused={focusedField === 'email'}
          onFocus={() => setFocusedField('email')}
          onBlur={() => setFocusedField(null)}
        />
        <InputField
          label="Şifre"
          placeholder="Şifreniz"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          focused={focusedField === 'password'}
          onFocus={() => setFocusedField('password')}
          onBlur={() => setFocusedField(null)}
        />

        <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: 8 }}>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
            onPress={handleLogin}
            onPressIn={() => animatePress(0.97)}
            onPressOut={() => animatePress(1)}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>Giriş Yap</Text>
            }
          </Pressable>
        </Animated.View>
      </View>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>veya</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Onboarding'e yönlendir */}
      <TouchableOpacity onPress={() => navigation.navigate('Onboarding')}>
        <Text style={styles.registerLink}>
          Hesabın yok mu?{' '}
          <Text style={styles.registerLinkBold}>Kayıt ol</Text>
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

function InputField({ label, focused, ...props }) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, focused && styles.inputFocused]}
        placeholderTextColor={Colors.textMuted}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', padding: 24 },
  bgAccent: { position: 'absolute', top: -80, right: -80, width: 260, height: 260, borderRadius: 130, backgroundColor: Colors.redGlow, opacity: 0.5 },
  logoArea: { marginBottom: 40 },
  logoEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 5, color: Colors.red, textTransform: 'uppercase', marginBottom: 10 },
  logoTitle: { fontSize: 36, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -1, lineHeight: 40, marginBottom: 10 },
  logoSub: { fontSize: 13, color: Colors.textMuted, letterSpacing: 0.5 },
  form: { gap: 0 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: Colors.textMuted, marginBottom: 7 },
  input: { backgroundColor: Colors.bgInput, color: Colors.textPrimary, borderRadius: Radii.md, padding: 16, fontSize: 15, borderWidth: 0.5, borderColor: Colors.border },
  inputFocused: { borderColor: Colors.red, backgroundColor: Colors.redDim },
  primaryBtn: { backgroundColor: Colors.red, borderRadius: Radii.md, padding: 17, alignItems: 'center', ...Shadows.red },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: Colors.border },
  dividerText: { fontSize: 12, color: Colors.textMuted },
  registerLink: { color: Colors.textSecondary, textAlign: 'center', fontSize: 14 },
  registerLinkBold: { color: Colors.red, fontWeight: '700' },
});
