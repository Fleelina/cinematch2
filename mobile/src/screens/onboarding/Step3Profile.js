import React, { useState, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView,
  Animated, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Radii, Shadows } from '../../theme';
import OnboardingProgress from '../../components/OnboardingProgress';
import { useOnboarding } from '../../context/OnboardingContext';

const GENDERS = [
  { key: 'male', label: 'Erkek', emoji: '👨' },
  { key: 'female', label: 'Kadın', emoji: '👩' },
];

function calcAge(date) {
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const m = today.getMonth() - date.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age--;
  return age;
}

export default function Step3Profile({ navigation }) {
  const { data, update } = useOnboarding();
  const [gender, setGender] = useState(data.gender);
  const [birthDate, setBirthDate] = useState(data.birthDate || new Date(2000, 0, 1));
  const [showPicker, setShowPicker] = useState(false);
  const btnScale = useRef(new Animated.Value(1)).current;

  const age = calcAge(birthDate);
  const canNext = gender && age >= 13 && age <= 100;

  const handleNext = () => {
    update({ gender, birthDate, age });
    navigation.navigate('Step4Photo');
  };

  const animatePress = (v) =>
    Animated.spring(btnScale, { toValue: v, useNativeDriver: true, speed: 40 }).start();

  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 13);
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 100);

  return (
    <View style={styles.container}>
      <OnboardingProgress step={3} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Geri</Text>
        </Pressable>

        <Text style={styles.title}>Seni biraz{'\n'}tanıyalım</Text>
        <Text style={styles.subtitle}>Bu bilgiler seni daha iyi eşleştirmemizi sağlar.</Text>

        {/* Cinsiyet */}
        <Text style={styles.sectionLabel}>Cinsiyetin</Text>
        <View style={styles.genderRow}>
          {GENDERS.map((g) => (
            <Pressable
              key={g.key}
              style={[styles.genderCard, gender === g.key && styles.genderCardActive]}
              onPress={() => setGender(g.key)}
            >
              <Text style={styles.genderEmoji}>{g.emoji}</Text>
              <Text style={[styles.genderLabel, gender === g.key && styles.genderLabelActive]}>
                {g.label}
              </Text>
              {gender === g.key && (
                <View style={styles.genderCheck}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>✓</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {/* Doğum Tarihi */}
        <Text style={styles.sectionLabel}>Doğum Tarihin</Text>
        <Pressable style={styles.datePicker} onPress={() => setShowPicker(true)}>
          <Text style={styles.dateEmoji}>📅</Text>
          <View>
            <Text style={styles.dateValue}>
              {birthDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
            {age >= 13 && age <= 100 && (
              <Text style={styles.dateAge}>{age} yaşında</Text>
            )}
          </View>
          <Text style={styles.dateArrow}>›</Text>
        </Pressable>

        {age < 13 && (
          <Text style={styles.ageError}>CineMatch'i kullanmak için en az 13 yaşında olmalısın.</Text>
        )}

        {showPicker && (
          <DateTimePicker
            value={birthDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={maxDate}
            minimumDate={minDate}
            onChange={(event, date) => {
              setShowPicker(Platform.OS === 'ios');
              if (date) setBirthDate(date);
            }}
            themeVariant="dark"
          />
        )}
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
        <Text style={styles.stepInfo}>3 / 5</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  body: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 },
  backBtn: { alignSelf: 'flex-start', marginBottom: 24 },
  backBtnText: { color: Colors.red, fontWeight: '600', fontSize: 14 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8, color: Colors.textPrimary, lineHeight: 38, marginBottom: 10 },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginBottom: 32 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: Colors.textMuted, marginBottom: 12 },

  genderRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  genderCard: {
    flex: 1, alignItems: 'center', paddingVertical: 24, borderRadius: Radii.lg,
    backgroundColor: Colors.bgCard, borderWidth: 1.5, borderColor: Colors.border,
    position: 'relative',
  },
  genderCardActive: { borderColor: Colors.red, backgroundColor: Colors.redDim },
  genderEmoji: { fontSize: 36, marginBottom: 10 },
  genderLabel: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary },
  genderLabelActive: { color: Colors.textPrimary },
  genderCheck: {
    position: 'absolute', top: 10, right: 10,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.red, justifyContent: 'center', alignItems: 'center',
  },

  datePicker: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.bgCard, borderRadius: Radii.md,
    borderWidth: 1, borderColor: Colors.border, padding: 16,
    marginBottom: 12,
  },
  dateEmoji: { fontSize: 24 },
  dateValue: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  dateAge: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  dateArrow: { marginLeft: 'auto', color: Colors.textMuted, fontSize: 20 },
  ageError: { color: '#ff3b30', fontSize: 12 },

  footer: { padding: 24, paddingBottom: 36 },
  nextBtn: { backgroundColor: Colors.red, borderRadius: Radii.md, padding: 17, alignItems: 'center', marginBottom: 12, ...Shadows.red },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },
  stepInfo: { color: Colors.textMuted, fontSize: 11, textAlign: 'center' },
});
