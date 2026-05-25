import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  Image, ImageBackground, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

const DEFAULT_BACKGROUND = require('../../assets/default-bg.png');

export default function MovieGuessScreen({ navigation }) {
  const { theme, movieTheme } = useTheme();
  const styles = createStyles(theme);
  const backgroundImage = movieTheme?.backgroundImage || DEFAULT_BACKGROUND;
  const overlayColors = movieTheme?.backgroundImage
    ? ['rgba(5,5,6,0.22)', 'rgba(5,5,6,0.68)', 'rgba(5,5,6,0.94)']
    : ['rgba(5,5,6,0.16)', 'rgba(5,5,6,0.62)', 'rgba(5,5,6,0.9)'];

  const [guessRound, setGuessRound] = useState(null);
  const [guessText, setGuessText] = useState('');
  const [guessResult, setGuessResult] = useState(null);
  const [guessLoading, setGuessLoading] = useState(false);
  const [wrongGuesses, setWrongGuesses] = useState(0);

  const startMovieGuess = async () => {
    if (guessLoading) return;
    setGuessLoading(true);
    setGuessResult(null);
    setGuessText('');
    setWrongGuesses(0);
    try {
      const res = await api.post('/games/movie-guess/start');
      setGuessRound(res.data);
    } catch {
      setGuessResult({ message: 'Oyun başlatılamadı. Birazdan tekrar dene.' });
    } finally {
      setGuessLoading(false);
    }
  };

  const revealMovieGuessHint = async () => {
    if (!guessRound || guessLoading) return;
    setGuessLoading(true);
    try {
      const res = await api.post('/games/movie-guess/reveal', {
        roundId: guessRound.roundId,
        visibleHints: guessRound.visibleHints,
      });
      setGuessRound(res.data);
    } finally {
      setGuessLoading(false);
    }
  };

  const submitMovieGuess = async () => {
    if (!guessRound || !guessText.trim() || guessLoading) return;
    setGuessLoading(true);
    try {
      const res = await api.post('/games/movie-guess/guess', {
        roundId: guessRound.roundId,
        guess: guessText,
        visibleHints: guessRound.visibleHints,
        wrongGuesses,
      });
      setGuessResult(res.data);
      if (!res.data.correct) setWrongGuesses((prev) => prev + 1);
    } finally {
      setGuessLoading(false);
    }
  };

  return (
    <ImageBackground source={backgroundImage} style={styles.container} resizeMode="cover">
      <LinearGradient colors={overlayColors} style={StyleSheet.absoluteFill} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="chevron-left" size={24} color={theme.textPrimary} />
          </Pressable>
          <Text style={styles.topTitle}>Filmi Tahmin Et</Text>
          <View style={{ width: 42 }} />
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>OYUN MODU</Text>
          <Text style={styles.title}>İpuçlarından filmi bul</Text>
          <Text style={styles.subtitle}>
            Film senin listenden seçilir. İpuçlarını az kullanırsan daha yüksek puan alırsın.
          </Text>
        </View>

        {!guessRound && !guessLoading ? (
          <Pressable style={styles.startButton} onPress={startMovieGuess}>
            <Text style={styles.startButtonText}>Başla</Text>
          </Pressable>
        ) : null}

        {guessLoading && !guessRound ? (
          <ActivityIndicator color={theme.primary || theme.purple} style={{ paddingVertical: 32 }} />
        ) : null}

        {guessRound ? (
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <View>
                <Text style={styles.panelEyebrow}>
                  {guessRound.source === 'user_movies' ? 'SENİN FİLMLERİNDEN' : 'POPÜLER FİLMLERDEN'}
                </Text>
                <Text style={styles.panelTitle}>Tahmin turu</Text>
              </View>
              <Pressable style={styles.smallButton} onPress={startMovieGuess}>
                <Text style={styles.smallButtonText}>Yeni</Text>
              </Pressable>
            </View>

            <View style={styles.hintList}>
              {guessRound.hints.map((hint, index) => (
                <View key={`${hint}-${index}`} style={styles.hintItem}>
                  <Text style={styles.hintIndex}>{index + 1}</Text>
                  <Text style={styles.hintText}>{hint}</Text>
                </View>
              ))}
            </View>

            {guessRound.poster ? (
              <Image source={{ uri: guessRound.poster }} style={styles.posterHint} />
            ) : null}

            {!guessResult?.correct ? (
              <>
                <TextInput
                  value={guessText}
                  onChangeText={setGuessText}
                  placeholder="Film adını yaz..."
                  placeholderTextColor={theme.textMuted}
                  style={styles.input}
                  returnKeyType="send"
                  onSubmitEditing={submitMovieGuess}
                />
                <View style={styles.actions}>
                  <Pressable
                    style={[styles.secondaryButton, guessRound.visibleHints >= guessRound.maxHints && styles.disabled]}
                    onPress={revealMovieGuessHint}
                    disabled={guessRound.visibleHints >= guessRound.maxHints || guessLoading}
                  >
                    <Text style={styles.secondaryButtonText}>İpucu Aç</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.primaryButton, !guessText.trim() && styles.disabled]}
                    onPress={submitMovieGuess}
                    disabled={!guessText.trim() || guessLoading}
                  >
                    <Text style={styles.primaryButtonText}>Tahmin Et</Text>
                  </Pressable>
                </View>
              </>
            ) : null}

            {guessResult ? (
              <View style={[styles.resultBox, guessResult.correct && styles.resultBoxSuccess]}>
                <Text style={styles.resultTitle}>{guessResult.message}</Text>
                {guessResult.correct ? (
                  <>
                    <Text style={styles.score}>Skor: {guessResult.score}</Text>
                    {guessResult.answer?.poster ? (
                      <Image source={{ uri: guessResult.answer.poster }} style={styles.answerPoster} />
                    ) : null}
                    <Text style={styles.answerTitle}>{guessResult.answer?.title}</Text>
                    <Text style={styles.answerMeta}>
                      {guessResult.answer?.year || 'Film'}{guessResult.answer?.rating ? ` • IMDb ${guessResult.answer.rating}` : ''}
                    </Text>
                  </>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </ImageBackground>
  );
}

function createStyles(theme) {
  const accent = theme.primary || theme.purple || '#9b5cff';
  const accentSoft = theme.primarySoft || theme.purpleSoft || 'rgba(155,92,255,0.15)';
  const accentBorder = theme.primaryBorder || theme.purpleBorder || theme.border;

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    content: { paddingHorizontal: 22, paddingTop: 54, paddingBottom: 70 },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.glass,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topTitle: { color: theme.textPrimary, fontSize: 16, fontWeight: '900' },
    hero: { marginBottom: 24 },
    eyebrow: { color: accent, fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
    title: { color: theme.textPrimary, fontSize: 36, fontWeight: '900', letterSpacing: -1, marginTop: 8 },
    subtitle: { color: theme.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 9 },
    startButton: {
      height: 52,
      borderRadius: 18,
      backgroundColor: accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    startButtonText: { color: theme.bg, fontSize: 15, fontWeight: '900' },
    panel: {
      padding: 16,
      borderRadius: 24,
      backgroundColor: theme.glassStrong || theme.glass,
      borderWidth: 1,
      borderColor: accentBorder,
    },
    panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
    panelEyebrow: { color: accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
    panelTitle: { color: theme.textPrimary, fontSize: 20, fontWeight: '900', marginTop: 3 },
    smallButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: accentSoft,
      borderWidth: 1,
      borderColor: accentBorder,
    },
    smallButtonText: { color: accent, fontSize: 12, fontWeight: '900' },
    hintList: { gap: 9 },
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
    hintText: { flex: 1, color: theme.textSecondary, fontSize: 12, lineHeight: 18, fontWeight: '700' },
    posterHint: { width: '100%', height: 180, borderRadius: 16, marginTop: 12, backgroundColor: theme.bgSoft },
    input: {
      height: 48,
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
    actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
    secondaryButton: {
      flex: 1,
      height: 44,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.glass,
      borderWidth: 1,
      borderColor: theme.border,
    },
    primaryButton: {
      flex: 1,
      height: 44,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: accent,
    },
    disabled: { opacity: 0.45 },
    secondaryButtonText: { color: theme.textPrimary, fontSize: 13, fontWeight: '900' },
    primaryButtonText: { color: theme.bg, fontSize: 13, fontWeight: '900' },
    resultBox: {
      marginTop: 12,
      padding: 13,
      borderRadius: 16,
      backgroundColor: 'rgba(0,0,0,0.24)',
      borderWidth: 1,
      borderColor: theme.border,
    },
    resultBoxSuccess: { borderColor: accentBorder, backgroundColor: accentSoft },
    resultTitle: { color: theme.textPrimary, fontSize: 14, fontWeight: '900' },
    score: { color: accent, fontSize: 13, fontWeight: '900', marginTop: 8 },
    answerPoster: { width: '100%', height: 230, borderRadius: 16, marginTop: 12, backgroundColor: theme.bgSoft },
    answerTitle: { color: theme.textPrimary, fontSize: 20, fontWeight: '900', marginTop: 10 },
    answerMeta: { color: theme.textSecondary, fontSize: 12, fontWeight: '800', marginTop: 4 },
  });
}
