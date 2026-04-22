import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, StyleSheet, Platform } from 'react-native';
import { Colors, Radii } from '../theme';

const ICONS = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

const ACCENT = {
  success: Colors.green,
  error: Colors.red,
  info: Colors.gold,
};

export default function Toast({ visible, message, type = 'success', duration = 2800, onHide }) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 18,
          stiffness: 200,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -100,
            duration: 260,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }),
        ]).start(() => onHide?.());
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  const accent = ACCENT[type];

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY }], opacity },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.toast, { borderColor: accent + '40' }]}>
        {/* Sol accent bar */}
        <View style={[styles.accentBar, { backgroundColor: accent }]} />

        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: accent + '20' }]}>
          <Text style={[styles.icon, { color: accent }]}>{ICONS[type]}</Text>
        </View>

        {/* Mesaj */}
        <Text style={styles.message} numberOfLines={2}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 36,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 16,
  },
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  icon: {
    fontSize: 14,
    fontWeight: '800',
  },
  message: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: 14,
    paddingRight: 14,
    lineHeight: 18,
  },
});
