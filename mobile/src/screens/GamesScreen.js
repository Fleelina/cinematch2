import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const DEFAULT_BACKGROUND = require('../../assets/default-bg.png');

const GAMES = [
  {
    key: 'guess',
    title: 'İpucundan Filmi Bul',
    subtitle: 'Oyuncu, yıl ve detay ipuçlarını açarak doğru filmi tahmin et.',
    icon: 'help-circle',
    status: 'Başla',
  },
  {
    key: 'poster',
    title: 'Pixelli Poster',
    subtitle: 'Bulanık posteri adım adım netleşmeden önce tanımaya çalış.',
    icon: 'zoom-in',
    status: 'Başla',
  },
  {
    key: 'quiz',
    title: 'Film Gecesi Kapışması',
    subtitle: 'Arkadaşlarınla hızlı sorular, ortak zevkler ve eğlenceli skorlar.',
    icon: 'users',
    status: 'Yakında',
  },
];

export default function GamesScreen({ navigation }) {
  const { theme, movieTheme } = useTheme();
  const styles = createStyles(theme);
  const backgroundImage = movieTheme?.backgroundImage || DEFAULT_BACKGROUND;
  const overlayColors = movieTheme?.backgroundImage
    ? ['rgba(5,5,6,0.22)', 'rgba(5,5,6,0.68)', 'rgba(5,5,6,0.94)']
    : ['rgba(5,5,6,0.16)', 'rgba(5,5,6,0.62)', 'rgba(5,5,6,0.9)'];

  return (
    <ImageBackground source={backgroundImage} style={styles.container} resizeMode="cover">
      <LinearGradient colors={overlayColors} style={StyleSheet.absoluteFill} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.eyebrowRow}>
            <Feather name="play-circle" size={14} color={theme.primary || theme.purple} />
            <Text style={styles.eyebrow}>CINEMATCH OYUNLARI</Text>
          </View>
          <Text style={styles.title}>Oyunlar</Text>
          <Text style={styles.subtitle}>
            Zevkleri karşılaştırmak, kararsızlığı çözmek ve film gecelerini daha eğlenceli yapmak için küçük oyunlar.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Oyun Modları</Text>
          <Text style={styles.sectionHint}>{GAMES.length} planlandı</Text>
        </View>

        {GAMES.map((game) => {
          const isPlayable = game.key === 'guess' || game.key === 'poster';
          const handlePress = game.key === 'guess'
            ? () => navigation.navigate('MovieGuess')
            : game.key === 'poster'
              ? () => navigation.navigate('PosterGuess')
              : undefined;

          return (
            <Pressable
              key={game.key}
              style={[styles.gameCard, isPlayable ? styles.gameCardPlayable : styles.gameCardLocked]}
              onPress={handlePress}
              disabled={!isPlayable}
              activeOpacity={0.82}
              android_ripple={null}
            >
              <View style={[styles.gameIcon, isPlayable ? styles.gameIconPlayable : styles.gameIconLocked]}>
                <Feather name={game.icon} size={20} color={isPlayable ? '#fff' : theme.textMuted} />
              </View>
              <View style={styles.gameText}>
                <Text style={[styles.gameTitle, !isPlayable && styles.gameTitleLocked]}>{game.title}</Text>
                <Text style={[styles.gameSub, !isPlayable && styles.gameSubLocked]}>{game.subtitle}</Text>
              </View>
              <View style={[styles.statusPill, isPlayable ? styles.statusPillPlayable : styles.statusPillLocked]}>
                <Text style={[styles.statusText, isPlayable ? styles.statusTextPlayable : styles.statusTextLocked]}>
                  {game.status}
                </Text>
                {isPlayable ? <Feather name="arrow-right" size={12} color={theme.bg} /> : null}
              </View>
            </Pressable>
          );
        })}

      </ScrollView>
    </ImageBackground>
  );
}

function createStyles(theme) {
  const accent = theme.primary || theme.purple || '#9b5cff';
  const accentSoft = theme.primarySoft || theme.purpleSoft || 'rgba(155,92,255,0.15)';
  const accentBorder = theme.primaryBorder || theme.purpleBorder || theme.border;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    content: {
      paddingHorizontal: 22,
      paddingTop: 64,
      paddingBottom: 110,
    },
    header: {
      marginBottom: 24,
    },
    eyebrowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    eyebrow: {
      color: accent,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.6,
    },
    title: {
      color: theme.textPrimary,
      fontSize: 42,
      fontWeight: '900',
      letterSpacing: -1.2,
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 8,
      maxWidth: 320,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      color: theme.textPrimary,
      fontSize: 18,
      fontWeight: '900',
    },
    sectionHint: {
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: '700',
    },
    gameCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 13,
      padding: 15,
      borderRadius: 18,
      borderWidth: 1,
      marginBottom: 12,
    },
    gameCardPlayable: {
      backgroundColor: theme.glassStrong || theme.glass,
      borderColor: accentBorder,
    },
    gameCardLocked: {
      backgroundColor: 'rgba(255,255,255,0.035)',
      borderColor: theme.border,
      opacity: 0.68,
    },
    gameIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gameIconPlayable: {
      backgroundColor: accent,
      borderColor: 'transparent',
    },
    gameIconLocked: {
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderColor: theme.border,
    },
    gameText: {
      flex: 1,
    },
    gameTitle: {
      color: theme.textPrimary,
      fontSize: 15,
      fontWeight: '900',
    },
    gameTitleLocked: {
      color: theme.textSecondary,
    },
    gameSub: {
      color: theme.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 3,
    },
    gameSubLocked: {
      color: theme.textMuted,
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
    },
    statusPillPlayable: {
      backgroundColor: accent,
      borderColor: accent,
    },
    statusPillLocked: {
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderColor: theme.border,
    },
    statusText: {
      fontSize: 10,
      fontWeight: '900',
    },
    statusTextPlayable: {
      color: theme.bg,
    },
    statusTextLocked: {
      color: theme.textMuted,
    },
    guessPanel: {
      marginTop: 16,
      padding: 16,
      borderRadius: 22,
      backgroundColor: theme.glassStrong || theme.glass,
      borderWidth: 1,
      borderColor: accentBorder,
    },
    guessHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 14,
    },
    guessEyebrow: {
      color: accent,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.2,
    },
    guessTitle: {
      color: theme.textPrimary,
      fontSize: 18,
      fontWeight: '900',
      marginTop: 3,
    },
    guessNewButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: accentSoft,
      borderWidth: 1,
      borderColor: accentBorder,
    },
    guessNewButtonText: {
      color: accent,
      fontSize: 12,
      fontWeight: '900',
    },
    hintList: {
      gap: 9,
    },
    hintItem: {
      flexDirection: 'row',
      gap: 10,
      padding: 12,
      borderRadius: 14,
      backgroundColor: 'rgba(0,0,0,0.20)',
      borderWidth: 1,
      borderColor: theme.border,
    },
    hintIndex: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: accentSoft,
      color: accent,
      textAlign: 'center',
      lineHeight: 22,
      fontSize: 11,
      fontWeight: '900',
    },
    hintText: {
      flex: 1,
      color: theme.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '700',
    },
    guessPoster: {
      width: '100%',
      height: 180,
      borderRadius: 16,
      marginTop: 12,
      backgroundColor: theme.bgSoft,
    },
    guessInput: {
      height: 46,
      borderRadius: 16,
      paddingHorizontal: 14,
      marginTop: 14,
      color: theme.textPrimary,
      backgroundColor: 'rgba(0,0,0,0.24)',
      borderWidth: 1,
      borderColor: theme.border,
      fontSize: 14,
      fontWeight: '700',
    },
    guessActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 10,
    },
    guessActionButton: {
      flex: 1,
      height: 42,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.glass,
      borderWidth: 1,
      borderColor: theme.border,
    },
    guessActionButtonPrimary: {
      flex: 1,
      height: 42,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: accent,
    },
    guessActionText: {
      color: theme.textPrimary,
      fontSize: 13,
      fontWeight: '900',
    },
    guessActionPrimaryText: {
      color: theme.bg,
      fontSize: 13,
      fontWeight: '900',
    },
    guessResultBox: {
      marginTop: 12,
      padding: 13,
      borderRadius: 16,
      backgroundColor: 'rgba(0,0,0,0.24)',
      borderWidth: 1,
      borderColor: theme.border,
    },
    guessResultBoxSuccess: {
      borderColor: accentBorder,
      backgroundColor: accentSoft,
    },
    guessResultTitle: {
      color: theme.textPrimary,
      fontSize: 14,
      fontWeight: '900',
    },
    guessScore: {
      color: accent,
      fontSize: 13,
      fontWeight: '900',
      marginTop: 8,
    },
    guessAnswerPoster: {
      width: '100%',
      height: 220,
      borderRadius: 16,
      marginTop: 12,
      backgroundColor: theme.bgSoft,
    },
    guessAnswerTitle: {
      color: theme.textPrimary,
      fontSize: 18,
      fontWeight: '900',
      marginTop: 10,
    },
    guessAnswerMeta: {
      color: theme.textSecondary,
      fontSize: 12,
      fontWeight: '800',
      marginTop: 4,
    },
  });
}
