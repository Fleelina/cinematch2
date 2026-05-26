import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  Image, ImageBackground, ActivityIndicator, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import * as ImageManipulator from 'expo-image-manipulator';

const DEFAULT_BACKGROUND = require('../../assets/default-bg.png');
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const POSTER_WIDTH = Math.min(SCREEN_WIDTH - 72, 306);
const POSTER_HEIGHT = Math.round(POSTER_WIDTH * 1.5);

// Pixelation seviyeleri: stageIndex 0 = en pixelli, sonuncusu = tam net
// Küçük sayı = daha blocky/pixelli
const PIXEL_STEPS = [12, 24, 48, 96, null]; // null = tam çözünürlük

function PosterPixelated({ round, theme }) {
  const stageIndex = round?.stageIndex ?? 0;
  const maxStages = round?.maxStages ?? 5;
  const targetSize = PIXEL_STEPS[Math.min(stageIndex, PIXEL_STEPS.length - 1)];
  const isFullRes = targetSize === null || stageIndex >= maxStages - 1;

  const [pixelatedUri, setPixelatedUri] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!round?.poster) return;
    if (isFullRes) {
      setPixelatedUri(null);
      return;
    }
    let cancelled = false;
    setProcessing(true);
    setPixelatedUri(null);
    (async () => {
      try {
        // 1. Adım: görseli çok küçük boyuta küçült (pixelation efekti burada oluşur)
        const small = await ImageManipulator.manipulateAsync(
          round.poster,
          [{ resize: { width: targetSize } }],
          { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
        );
        // 2. Adım: tekrar poster boyutuna büyüt (blocky piksel görünümü)
        const big = await ImageManipulator.manipulateAsync(
          small.uri,
          [{ resize: { width: POSTER_WIDTH, height: POSTER_HEIGHT } }],
          { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
        );
        if (!cancelled) setPixelatedUri(big.uri);
      } catch (e) {
        if (!cancelled) setPixelatedUri(round.poster); // hata olursa orijinali göster
      } finally {
        if (!cancelled) setProcessing(false);
      }
    })();
    return () => { cancelled = true; };
  }, [round?.poster, stageIndex]);

  const displayUri = isFullRes ? round.poster : pixelatedUri;

  return (
    <View style={stylesPoster.cropFrame}>
      {processing && !displayUri ? (
        <View style={stylesPoster.loadingOverlay}>
          <ActivityIndicator color={theme.primary || theme.purple} />
        </View>
      ) : displayUri ? (
        <Image
          source={{ uri: displayUri }}
          resizeMode="cover"
          style={[stylesPoster.cropImage, { width: POSTER_WIDTH, height: POSTER_HEIGHT, left: 0, top: 0 }]}
        />
      ) : null}
    </View>
  );
}

export default function PosterGuessScreen({ navigation }) {
  const { theme, movieTheme } = useTheme();
  const screenStyles = createStyles(theme);
  const backgroundImage = movieTheme?.backgroundImage || DEFAULT_BACKGROUND;
  const overlayColors = movieTheme?.backgroundImage
    ? ['rgba(5,5,6,0.22)', 'rgba(5,5,6,0.68)', 'rgba(5,5,6,0.94)']
    : ['rgba(5,5,6,0.16)', 'rgba(5,5,6,0.62)', 'rgba(5,5,6,0.9)'];

  const [round, setRound] = useState(null);
  const [guessText, setGuessText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [source, setSource] = useState('user_movies');

  const startPosterGuess = async () => {
    if (loading) return;
    setLoading(true);
    setResult(null);
    setGuessText('');
    setWrongGuesses(0);
    try {
      const res = await api.post('/games/poster-guess/start', { source });
      setRound(res.data);
    } catch {
      setResult({ message: 'Oyun başlatılamadı. Birazdan tekrar dene.' });
    } finally {
      setLoading(false);
    }
  };

  const submitPosterGuess = async () => {
    if (!round || !guessText.trim() || loading || result?.revealed) return;
    setLoading(true);
    try {
      const res = await api.post('/games/poster-guess/guess', {
        roundId: round.roundId,
        guess: guessText,
        stageIndex: round.stageIndex,
        wrongGuesses,
        source: round.source,
      });
      setResult(res.data);
      setRound(res.data.round);
      setGuessText('');
      if (!res.data.correct) setWrongGuesses((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const revealNextPosterStage = async () => {
    if (!round || loading || result?.revealed) return;
    setLoading(true);
    try {
      const res = await api.post('/games/poster-guess/reveal', {
        roundId: round.roundId,
        stageIndex: round.stageIndex,
        source: round.source,
      });
      setResult(res.data);
      setRound(res.data.round);
      setWrongGuesses((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const revealed = Boolean(result?.revealed);
  const stageNumber = (round?.stageIndex ?? 0) + 1;

  return (
    <ImageBackground source={backgroundImage} style={screenStyles.container} resizeMode="cover">
      <LinearGradient colors={overlayColors} style={StyleSheet.absoluteFill} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={screenStyles.content}>
        <View style={screenStyles.topBar}>
          <Pressable style={screenStyles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="chevron-left" size={24} color={theme.textPrimary} />
          </Pressable>
          <Text style={screenStyles.topTitle}>Posterden Tahmin Et</Text>
          <View style={{ width: 42 }} />
        </View>

        <View style={screenStyles.hero}>
          <Text style={screenStyles.eyebrow}>POSTER OYUNU</Text>
          <Text style={screenStyles.title}>Pixelli posterden filmi bul</Text>
          <Text style={screenStyles.subtitle}>
            İlk turda poster çok pixelli görünür. Yanıldıkça görüntü netleşir, skor düşer.
          </Text>
        </View>

        <View style={screenStyles.sourceSwitch}>
          <Pressable
            style={[screenStyles.sourceButton, source === 'user_movies' && screenStyles.sourceButtonActive]}
            onPress={() => setSource('user_movies')}
            disabled={loading}
          >
            <Feather name="film" size={15} color={source === 'user_movies' ? theme.bg : theme.textSecondary} />
            <Text style={[screenStyles.sourceButtonText, source === 'user_movies' && screenStyles.sourceButtonTextActive]}>
              Kendi filmlerim
            </Text>
          </Pressable>
          <Pressable
            style={[screenStyles.sourceButton, source === 'trending' && screenStyles.sourceButtonActive]}
            onPress={() => setSource('trending')}
            disabled={loading}
          >
            <Feather name="trending-up" size={15} color={source === 'trending' ? theme.bg : theme.textSecondary} />
            <Text style={[screenStyles.sourceButtonText, source === 'trending' && screenStyles.sourceButtonTextActive]}>
              Populer filmler
            </Text>
          </Pressable>
        </View>

        {!round && !loading ? (
          <Pressable style={screenStyles.startButton} onPress={startPosterGuess}>
            <Text style={screenStyles.startButtonText}>Başla</Text>
          </Pressable>
        ) : null}

        {loading && !round ? (
          <ActivityIndicator color={theme.primary || theme.purple} style={{ paddingVertical: 32 }} />
        ) : null}

        {round ? (
          <View style={screenStyles.panel}>
            <View style={screenStyles.panelHeader}>
              <View>
                <Text style={screenStyles.panelEyebrow}>
                  {round.source === 'user_movies' ? 'SENİN FİLMLERİNDEN' : 'POPÜLER FİLMLERDEN'}
                </Text>
                <Text style={screenStyles.panelTitle}>{round.stage.label}</Text>
              </View>
              <Pressable style={screenStyles.smallButton} onPress={startPosterGuess}>
                <Text style={screenStyles.smallButtonText}>Yeni</Text>
              </Pressable>
            </View>

            <View style={screenStyles.progressRow}>
              {Array.from({ length: round.maxStages }).map((_, index) => (
                <View
                  key={index}
                  style={[
                    screenStyles.progressDot,
                    index <= round.stageIndex && screenStyles.progressDotActive,
                  ]}
                />
              ))}
            </View>

            <View style={screenStyles.posterWrap}>
              <PosterPixelated round={round} theme={theme} />
            </View>

            <View style={screenStyles.stageInfo}>
              <Text style={screenStyles.stageCount}>
                Aşama {stageNumber}/{round.maxStages} · {stageNumber >= round.maxStages ? 'Tam görüntü' : `${PIXEL_STEPS[Math.min(round.stageIndex, PIXEL_STEPS.length - 2)]}px piksel`}
              </Text>
              <Text style={screenStyles.stageHint}>{round.stage.hint}</Text>
            </View>

            {!revealed ? (
              <>
                <TextInput
                  value={guessText}
                  onChangeText={setGuessText}
                  placeholder="Film adını yaz..."
                  placeholderTextColor={theme.textMuted}
                  style={screenStyles.input}
                  returnKeyType="send"
                  onSubmitEditing={submitPosterGuess}
                />
                <Pressable
                  style={[screenStyles.primaryButton, (!guessText.trim() || loading) && screenStyles.disabled]}
                  onPress={submitPosterGuess}
                  disabled={!guessText.trim() || loading}
                >
                  <Text style={screenStyles.primaryButtonText}>{loading ? 'Kontrol ediliyor...' : 'Tahmin Et'}</Text>
                </Pressable>
                <Pressable
                  style={[screenStyles.revealButton, loading && screenStyles.disabled]}
                  onPress={revealNextPosterStage}
                  disabled={loading}
                >
                  <Feather name="eye" size={14} color={theme.textPrimary} />
                  <Text style={screenStyles.revealButtonText}>Biraz daha aç</Text>
                </Pressable>
              </>
            ) : null}

            {result ? (
              <View style={[screenStyles.resultBox, result.correct && screenStyles.resultBoxSuccess]}>
                <Text style={screenStyles.resultTitle}>{result.message}</Text>
                {result.correct ? <Text style={screenStyles.score}>Skor: {result.score}</Text> : null}
                {result.answer ? (
                  <>
                    <Image source={{ uri: result.answer.poster }} style={screenStyles.answerPoster} />
                    <Text style={screenStyles.answerTitle}>{result.answer.title}</Text>
                    <Text style={screenStyles.answerMeta}>
                      {result.answer.year || 'Film'}{result.answer.rating ? ` · IMDb ${result.answer.rating}` : ''}
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

const stylesPoster = StyleSheet.create({
  cropFrame: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  cropImage: {
    position: 'absolute',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
  },
});

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
    title: { color: theme.textPrimary, fontSize: 34, fontWeight: '900', letterSpacing: -1, marginTop: 8 },
    subtitle: { color: theme.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 9 },
    sourceSwitch: {
      flexDirection: 'row',
      gap: 10,
      padding: 4,
      borderRadius: 18,
      backgroundColor: 'rgba(0,0,0,0.22)',
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 16,
    },
    sourceButton: {
      flex: 1,
      height: 42,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      backgroundColor: theme.glass,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    sourceButtonActive: {
      backgroundColor: accent,
      borderColor: accentBorder,
    },
    sourceButtonText: {
      color: theme.textSecondary,
      fontSize: 12,
      fontWeight: '900',
    },
    sourceButtonTextActive: {
      color: theme.bg,
    },
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
    progressRow: { flexDirection: 'row', gap: 7, marginBottom: 14 },
    progressDot: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.border,
    },
    progressDotActive: {
      backgroundColor: accent,
    },
    posterWrap: {
      alignItems: 'center',
      paddingVertical: 6,
    },
    stageInfo: {
      marginTop: 12,
      padding: 12,
      borderRadius: 15,
      backgroundColor: 'rgba(0,0,0,0.22)',
      borderWidth: 1,
      borderColor: theme.border,
    },
    stageCount: { color: accent, fontSize: 12, fontWeight: '900' },
    stageHint: { color: theme.textSecondary, fontSize: 12, lineHeight: 18, fontWeight: '700', marginTop: 5 },
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
    primaryButton: {
      height: 44,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: accent,
      marginTop: 10,
    },
    disabled: { opacity: 0.45 },
    primaryButtonText: { color: theme.bg, fontSize: 13, fontWeight: '900' },
    revealButton: {
      height: 42,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      borderColor: theme.border,
      marginTop: 9,
    },
    revealButtonText: { color: theme.textPrimary, fontSize: 13, fontWeight: '900' },
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
    answerPoster: { width: '100%', height: 420, borderRadius: 18, marginTop: 12, backgroundColor: theme.bgSoft },
    answerTitle: { color: theme.textPrimary, fontSize: 20, fontWeight: '900', marginTop: 10 },
    answerMeta: { color: theme.textSecondary, fontSize: 12, fontWeight: '800', marginTop: 4 },
  });
}
