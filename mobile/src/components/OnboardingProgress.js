import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme';

const STEP_LABELS = ['Kullanıcı Adı', 'Hesap', 'Profil', 'Fotoğraf', 'Filmler'];
const TOTAL = STEP_LABELS.length;

export default function OnboardingProgress({ step }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Adım <Text style={styles.current}>{step}</Text> / {TOTAL}
      </Text>
      <View style={styles.track}>
        {Array.from({ length: TOTAL }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              i < step ? styles.segmentFilled : styles.segmentEmpty,
              i < TOTAL - 1 && { marginRight: 4 },
            ]}
          />
        ))}
      </View>
      <Text style={styles.stepName}>{STEP_LABELS[step - 1]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  label: { fontSize: 11, color: Colors.textMuted, marginBottom: 8, fontWeight: '600' },
  current: { color: Colors.red, fontWeight: '800' },
  track: { flexDirection: 'row', marginBottom: 6 },
  segment: { flex: 1, height: 3, borderRadius: 2 },
  segmentFilled: { backgroundColor: Colors.red },
  segmentEmpty: { backgroundColor: Colors.border },
  stepName: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
});
