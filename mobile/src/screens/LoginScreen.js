import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'Email ve şifre zorunludur');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error;
      const network = err.message;
      Alert.alert(
        'Giriş Hatası',
        msg
          ? `Sunucu: ${msg} (${status})`
          : `Ağ hatası: ${network}\n\nAPI: ${err.config?.baseURL || '?'}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <Text style={styles.logo}>🎬 CineMatch</Text>
      <Text style={styles.subtitle}>Film zevkine göre arkadaş bul</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Şifre"
        placeholderTextColor="#888"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Giriş Yap</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>Hesabın yok mu? <Text style={styles.linkBold}>Kayıt ol</Text></Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', justifyContent: 'center', padding: 24 },
  logo: { fontSize: 36, fontWeight: 'bold', color: '#E50914', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: '#888', textAlign: 'center', marginBottom: 40, fontSize: 15 },
  input: {
    backgroundColor: '#1c1c1c', color: '#fff', borderRadius: 12,
    padding: 14, marginBottom: 14, fontSize: 15, borderWidth: 1, borderColor: '#333'
  },
  button: {
    backgroundColor: '#E50914', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 8
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  link: { color: '#888', textAlign: 'center', marginTop: 20 },
  linkBold: { color: '#E50914', fontWeight: 'bold' },
});
