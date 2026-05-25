// src/components/ThemePicker.js
import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Modal, Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { movieThemeList } from '../themes/movieThemes';
import { Radii } from '../theme';

export default function ThemePicker({ visible, onClose }) {
  const { theme, isDark, setThemeMode, setMovieTheme, activeMovieThemeId } = useTheme();
  const s = createStyles(theme);

  const handleSelect = async (id) => {
    await setMovieTheme(id === activeMovieThemeId ? null : id);
    onClose();
  };

  const handleDefaultModeSelect = async (mode) => {
    if (activeMovieThemeId && mode === 'light') return;
    if (activeMovieThemeId) await setMovieTheme(null);
    await setThemeMode(mode);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose} />

      <View style={s.sheet}>
        {/* Handle */}
        <View style={s.handle} />

        {/* Başlık */}
        <View style={s.header}>
          <Text style={s.title}>Tema Seç</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Feather name="x" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Default Temalar */}
          <ThemeCard
            emoji="🎬"
            name="Default Koyu"
            description="Cinematch klasik koyu tema"
            gradient={['#050506', '#0B0B10']}
            active={activeMovieThemeId === null && isDark}
            onPress={() => handleDefaultModeSelect('dark')}
            theme={theme}
          />
          <ThemeCard
            emoji="☀"
            name="Default Aydınlık"
            description={activeMovieThemeId ? 'Aydınlık mod sadece Default temada' : 'Cinematch klasik aydınlık tema'}
            gradient={['#ffffff', '#f8f9fa', '#e9ecef']}
            active={activeMovieThemeId === null && !isDark}
            disabled={activeMovieThemeId !== null}
            onPress={() => handleDefaultModeSelect('light')}
            theme={theme}
            accentColor="#8a46ff"
          />

          {/* Divider */}
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>Film Temaları</Text>
            <View style={s.dividerLine} />
          </View>

          {/* Film Temaları */}
          {movieThemeList.map((mt) => (
            <ThemeCard
              key={mt.id}
              id={mt.id}
              emoji={mt.emoji}
              name={mt.name}
              description={`${mt.name} teması`}
              gradient={mt.gradient}
              active={activeMovieThemeId === mt.id}
              onPress={() => handleSelect(mt.id)}
              theme={theme}
              accentColor={mt.colors.primary}
            />
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

function ThemeCard({ emoji, name, description, gradient, active, disabled, onPress, theme, accentColor }) {
  const accent = accentColor || theme.purple;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        cardStyles.card,
        {
          backgroundColor: theme.glass,
          borderColor: active ? accent : theme.border,
          borderWidth: active ? 1.5 : 1,
          opacity: disabled ? 0.42 : 1,
        },
      ]}
      activeOpacity={0.7}
    >
      {/* Renk preview */}
      <View style={[cardStyles.preview, { backgroundColor: gradient[1] }]}>
        <View style={[cardStyles.previewDot, { backgroundColor: gradient[0] }]} />
        <View style={[cardStyles.previewDot, { backgroundColor: accent, opacity: 0.8 }]} />
        <View style={[cardStyles.previewDot, { backgroundColor: gradient[2] || gradient[1] }]} />
      </View>

      {/* Info */}
      <View style={cardStyles.info}>
        <Text style={cardStyles.emoji}>{emoji}</Text>
        <View>
          <Text style={[cardStyles.name, { color: theme.textPrimary }]}>{name}</Text>
          <Text style={[cardStyles.desc, { color: theme.textMuted }]}>{description}</Text>
        </View>
      </View>

      {/* Aktif işareti */}
      {active && (
        <View style={[cardStyles.check, { backgroundColor: accent }]}>
          <Feather name="check" size={12} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  preview: {
    width: 52,
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
    gap: 2,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  info: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  emoji: { fontSize: 22 },
  name: { fontSize: 15, fontWeight: '700' },
  desc: { fontSize: 12, marginTop: 2 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const createStyles = (theme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: theme.bgSoft,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderColor: theme.border,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.textPrimary,
    letterSpacing: -0.4,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.glass,
    borderWidth: 1,
    borderColor: theme.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 14,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.border,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
