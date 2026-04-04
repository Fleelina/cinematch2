import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Rect, ClipPath } from 'react-native-svg';

// Güzel ve standart SVG kalp path'i (viewBox 0 0 100 100)
// Alttan yukarı dolacak şekilde tasarlandı
const HEART_PATH =
  'M50 88 C50 88 12 60 12 36 C12 22 22 14 33 14 C40 14 47 18 50 24 C53 18 60 14 67 14 C78 14 88 22 88 36 C88 60 50 88 50 88 Z';

export default function CineMatchRating({ rating, ratingCount, size = 38, id = 'default' }) {
  const gradientId = `heartGrad_${id}`;
  const clipId = `heartClip_${id}`;
  const fillPercent = rating != null ? Math.min(Math.max(rating / 10, 0), 1) : 0;

  return (
    <View style={styles.container}>
      {/* Kalp SVG */}
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor="#E50914" stopOpacity="1" />
            <Stop offset={`${fillPercent}`} stopColor="#E50914" stopOpacity="1" />
            <Stop offset={`${fillPercent}`} stopColor="#2a2a2a" stopOpacity="1" />
            <Stop offset="1" stopColor="#2a2a2a" stopOpacity="1" />
          </LinearGradient>
          <ClipPath id={clipId}>
            <Path d={HEART_PATH} />
          </ClipPath>
        </Defs>
        <Path d={HEART_PATH} fill="#2a2a2a" />
        <Rect
          x="0" y="0" width="100" height="100"
          fill={`url(#${gradientId})`}
          clipPath={`url(#${clipId})`}
        />
        <Path d={HEART_PATH} fill="none" stroke="#333" strokeWidth="2" />
      </Svg>

      {/* Puan + etiket */}
      <View style={styles.textBox}>
        <View style={styles.ratingRow}>
          <Text style={styles.ratingValue}>
            {rating != null ? rating.toFixed(1) : '—'}
          </Text>
          <Text style={styles.ratingMax}>/10</Text>
        </View>
        <Text style={styles.countText}>
          {ratingCount > 0 ? `${ratingCount} oy` : 'puan yok'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textBox: {
    gap: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  ratingValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  ratingMax: {
    color: '#555',
    fontSize: 12,
    fontWeight: '500',
  },
  countText: {
    color: '#555',
    fontSize: 11,
  },
});
