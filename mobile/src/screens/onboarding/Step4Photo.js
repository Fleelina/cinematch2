import React, { useState, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, Image,
  ActivityIndicator, Animated, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Radii, Shadows } from '../../theme';
import OnboardingProgress from '../../components/OnboardingProgress';
import { useOnboarding } from '../../context/OnboardingContext';
import api from '../../services/api';

export default function Step4Photo({ navigation }) {
  const { data, update } = useOnboarding();
  const [avatar, setAvatar] = useState(data.avatar);
  const [uploading, setUploading] = useState(false);
  const btnScale = useRef(new Animated.Value(1)).current;

  const animatePress = (v) =>
    Animated.spring(btnScale, { toValue: v, useNativeDriver: true, speed: 40 }).start();

  const pickPhoto = async (source) => {
    let result;
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('İzin gerekli'); return; }
      result = await ImagePicker.launchCameraAsync({
        allowsEditing: true, aspect: [1, 1], quality: 0.4, base64: true,
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('İzin gerekli'); return; }
      result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true, aspect: [1, 1], quality: 0.4, base64: true,
      });
    }

    if (!result.canceled && result.assets[0]) {
      await uploadPhoto(result.assets[0]);
    }
  };

  const uploadPhoto = async (asset) => {
    setUploading(true);
    try {
      const mimeType = asset.mimeType || 'image/jpeg';
      // Onboarding sırasında token yok, public endpoint kullan
      const res = await api.post('/upload/avatar/public', {
        base64: `data:${mimeType};base64,${asset.base64}`,
        mimeType,
      });
      setAvatar(res.data.url);
      update({ avatar: res.data.url, avatarType: 'upload' });
    } catch (err) {
      const msg = err.response?.data?.error || 'Fotoğraf yüklenemedi. Tekrar dene.';
      Alert.alert('Hata', msg);
    } finally {
      setUploading(false);
    }
  };

  const handleNext = () => navigation.navigate('Step5Movies');
  const handleSkip = () => {
    update({ avatar: null, avatarType: null });
    navigation.navigate('Step5Movies');
  };

  return (
    <View style={styles.container}>
      <OnboardingProgress step={4} />
      <View style={styles.body}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Geri</Text>
        </Pressable>

        <Text style={styles.title}>Profil{'\n'}fotoğrafın</Text>
        <Text style={styles.subtitle}>
          Fotoğraflı profiller %3x daha fazla eşleşme alır.
        </Text>

        <Pressable style={styles.avatarWrap} onPress={() => pickPhoto('gallery')}>
          {uploading ? (
            <View style={styles.avatarPlaceholder}>
              <ActivityIndicator color={Colors.red} size="large" />
              <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 8 }}>Yükleniyor...</Text>
            </View>
          ) : avatar ? (
            <>
              <Image source={{ uri: avatar }} style={styles.avatarImg} />
              <View style={styles.avatarEditBadge}>
                <Text style={{ fontSize: 14 }}>✏️</Text>
              </View>
            </>
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderEmoji}>📸</Text>
              <Text style={styles.avatarPlaceholderText}>Fotoğraf ekle</Text>
            </View>
          )}
        </Pressable>

        {!uploading && (
          <View style={styles.optionsRow}>
            <Pressable style={styles.optionBtn} onPress={() => pickPhoto('gallery')}>
              <Text style={styles.optionEmoji}>🖼</Text>
              <Text style={styles.optionLabel}>Galeri</Text>
            </Pressable>
            <Pressable style={styles.optionBtn} onPress={() => pickPhoto('camera')}>
              <Text style={styles.optionEmoji}>📷</Text>
              <Text style={styles.optionLabel}>Kamera</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <Pressable
            style={[styles.nextBtn, !avatar && styles.nextBtnOutline]}
            onPress={avatar ? handleNext : handleSkip}
            onPressIn={() => animatePress(0.97)}
            onPressOut={() => animatePress(1)}
            disabled={uploading}
          >
            <Text style={[styles.nextBtnText, !avatar && styles.nextBtnTextOutline]}>
              {avatar ? 'Devam Et →' : 'Şimdilik Atla'}
            </Text>
          </Pressable>
        </Animated.View>
        {avatar && (
          <Pressable onPress={handleSkip}>
            <Text style={styles.skipText}>Fotoğraf olmadan devam et</Text>
          </Pressable>
        )}
        <Text style={styles.stepInfo}>4 / 5</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 24, alignItems: 'center' },
  backBtn: { alignSelf: 'flex-start', marginBottom: 24 },
  backBtnText: { color: Colors.red, fontWeight: '600', fontSize: 14 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8, color: Colors.textPrimary, lineHeight: 38, marginBottom: 10, alignSelf: 'flex-start' },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginBottom: 36, alignSelf: 'flex-start', lineHeight: 20 },
  avatarWrap: { position: 'relative', marginBottom: 28 },
  avatarImg: { width: 160, height: 160, borderRadius: 80, borderWidth: 3, borderColor: Colors.red },
  avatarPlaceholder: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: Colors.bgCard, borderWidth: 2,
    borderColor: Colors.border, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarPlaceholderEmoji: { fontSize: 40, marginBottom: 8 },
  avatarPlaceholderText: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' },
  avatarEditBadge: {
    position: 'absolute', bottom: 4, right: 4,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.bgElevated, borderWidth: 2, borderColor: Colors.bg,
    justifyContent: 'center', alignItems: 'center',
  },
  optionsRow: { flexDirection: 'row', gap: 16 },
  optionBtn: { flex: 1, alignItems: 'center', paddingVertical: 20, backgroundColor: Colors.bgCard, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.border },
  optionEmoji: { fontSize: 28, marginBottom: 8 },
  optionLabel: { color: Colors.textSecondary, fontWeight: '600', fontSize: 13 },
  footer: { padding: 24, paddingBottom: 36 },
  nextBtn: { backgroundColor: Colors.red, borderRadius: Radii.md, padding: 17, alignItems: 'center', marginBottom: 12, ...Shadows.red },
  nextBtnOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.border, shadowOpacity: 0 },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },
  nextBtnTextOutline: { color: Colors.textSecondary },
  skipText: { color: Colors.textMuted, textAlign: 'center', fontSize: 13, marginBottom: 12 },
  stepInfo: { color: Colors.textMuted, fontSize: 11, textAlign: 'center' },
});
