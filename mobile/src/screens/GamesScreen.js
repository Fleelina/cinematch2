import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Image, ImageBackground, ActivityIndicator, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

const DEFAULT_BACKGROUND = require('../../assets/default-bg.png');
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RECOMMENDATION_CARD_WIDTH = SCREEN_WIDTH - 76;

const SCORE_LABELS = {
  tension: 'Gerilim',
  emotion: 'Duygu',
  mindBending: 'Zihin',
  pace: 'Tempo',
  atmosphere: 'Atmosfer',
};

const GAMES = [
  {
    key: 'guess',
    title: 'Filmi Tahmin Et',
    subtitle: 'İpuçları, oyuncular ve küçük detaylarla filmi bul.',
    icon: 'help-circle',
    status: 'Başla',
  },
  {
    key: 'poster',
    title: 'Posterden Tahmin Et',
    subtitle: 'Zoomlu poster parçasından filmi bul, yanlışta görüntü açılsın.',
    icon: 'zoom-in',
    status: 'Başla',
  },
  {
    key: 'quiz',
    title: 'Film Gecesi Quizi',
    subtitle: 'Film geceleri ve grup eşleşmeleri için hızlı turlar.',
    icon: 'users',
    status: 'Yakında',
  },
];

export default function GamesScreen({ navigation }) {
  const { theme, movieTheme } = useTheme();
  const [dailyTaste, setDailyTaste] = useState(null);
  const [dailyResult, setDailyResult] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loadingDaily, setLoadingDaily] = useState(true);
  const [answering, setAnswering] = useState(false);
  const styles = createStyles(theme);
  const backgroundImage = movieTheme?.backgroundImage || DEFAULT_BACKGROUND;
  const overlayColors = movieTheme?.backgroundImage
    ? ['rgba(5,5,6,0.22)', 'rgba(5,5,6,0.68)', 'rgba(5,5,6,0.94)']
    : ['rgba(5,5,6,0.16)', 'rgba(5,5,6,0.62)', 'rgba(5,5,6,0.9)'];

  useEffect(() => {
    let mounted = true;
    setLoadingDaily(true);
    api.get('/games/daily-taste')
      .then((res) => {
        if (mounted) {
          setDailyTaste(res.data);
          setDailyResult(res.data?.result || null);
          if (res.data?.result?.answers) {
            const savedAnswers = {};
            res.data.result.answers.forEach((answer) => {
              savedAnswers[answer.questionId] = answer.choiceKey;
            });
            setSelectedAnswers(savedAnswers);
          }
        }
      })
      .catch(() => {
        if (mounted) setDailyTaste(null);
      })
      .finally(() => {
        if (mounted) setLoadingDaily(false);
      });
    return () => { mounted = false; };
  }, []);

  const selectDailyAnswer = (questionId, choiceKey) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: choiceKey }));
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const submitDailyTaste = async () => {
    if (answering) return;
    setAnswering(true);
    try {
      const res = await api.post('/games/daily-taste/answer', { answers: selectedAnswers });
      setDailyResult(res.data);
    } catch {
      setDailyResult({
        insight: 'Cevap gönderilemedi. Birazdan tekrar dene.',
      });
    } finally {
      setAnswering(false);
    }
  };

  const questions = dailyTaste?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const canSubmit = questions.length > 0 && questions.every((question) => selectedAnswers[question.id]);

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

        <View style={styles.featuredCard}>
          {!dailyResult ? (
            <View style={styles.featuredIcon}>
              <Feather name="star" size={20} color={theme.bg} />
            </View>
          ) : null}
          <View style={styles.featuredBody}>
            <Text style={styles.featuredTitle}>Günün Zevk Testi</Text>
            {loadingDaily ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={theme.primary || theme.purple} />
                <Text style={styles.featuredSub}>Soru hazırlanıyor...</Text>
              </View>
            ) : questions.length > 0 ? (
              <>
                <View style={styles.progressRow}>
                  {questions.map((question, index) => (
                    <View
                      key={question.id}
                      style={[
                        styles.progressDot,
                        selectedAnswers[question.id] && styles.progressDotDone,
                        index === currentQuestionIndex && styles.progressDotActive,
                      ]}
                    />
                  ))}
                </View>

                {currentQuestion ? (
                  <View style={styles.questionBlock}>
                    <Text style={styles.questionCount}>
                      {currentQuestionIndex + 1} / {questions.length}
                    </Text>
                    <Text style={styles.questionText}>{currentQuestion.question}</Text>
                    <View style={styles.optionList}>
                      {currentQuestion.options.map((option) => {
                        const selected = selectedAnswers[currentQuestion.id] === option.key;
                        return (
                          <Pressable
                            key={option.key}
                            style={[styles.optionButton, selected && styles.optionButtonSelected]}
                            onPress={() => selectDailyAnswer(currentQuestion.id, option.key)}
                            disabled={answering}
                          >
                            <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                              {option.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                <View style={styles.stepActions}>
                  <Pressable
                    style={[styles.stepButton, currentQuestionIndex === 0 && styles.stepButtonDisabled]}
                    onPress={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentQuestionIndex === 0}
                  >
                    <Text style={styles.stepButtonText}>Geri</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.stepButton,
                      (!selectedAnswers[currentQuestion?.id] || currentQuestionIndex >= questions.length - 1) && styles.stepButtonDisabled,
                    ]}
                    onPress={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                    disabled={!selectedAnswers[currentQuestion?.id] || currentQuestionIndex >= questions.length - 1}
                  >
                    <Text style={styles.stepButtonText}>İleri</Text>
                  </Pressable>
                </View>

                <Pressable
                  style={[styles.submitButton, (!canSubmit || answering) && styles.submitButtonDisabled]}
                  onPress={submitDailyTaste}
                  disabled={!canSubmit || answering}
                >
                  <Text style={styles.submitButtonText}>{answering ? 'Hesaplanıyor...' : 'Sonucu Göster'}</Text>
                </Pressable>
                {dailyResult?.insight ? (
                  <View style={styles.resultBox}>
                    {dailyResult.recommendations?.length > 0 ? (
                      <View style={styles.recommendationSection}>
                        <Text style={styles.resultTitle}>{dailyResult.title || 'Sonuç'}</Text>
                        <Text style={styles.recommendationHeading}>Bugün sana iyi gidecek 3 film</Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          snapToInterval={RECOMMENDATION_CARD_WIDTH + 12}
                          decelerationRate="fast"
                          disableIntervalMomentum
                          contentContainerStyle={styles.recommendationList}
                        >
                        {dailyResult.recommendations.map((movie) => (
                          <Pressable key={movie.tmdbId} style={styles.recommendationItem}>
                            {movie.poster ? (
                              <Image source={{ uri: movie.poster }} style={styles.recommendationPoster} />
                            ) : (
                              <View style={styles.recommendationPosterFallback}>
                                <Feather name="film" size={18} color={theme.textMuted} />
                              </View>
                            )}
                            <View style={styles.recommendationInfo}>
                              <Text style={styles.recommendationTitle} numberOfLines={2}>{movie.title}</Text>
                              <View style={styles.recommendationMetaRow}>
                                {movie.year ? <Text style={styles.recommendationMeta}>{movie.year}</Text> : null}
                                {movie.rating ? <Text style={styles.recommendationRating}>IMDb {movie.rating}</Text> : null}
                              </View>
                            </View>
                          </Pressable>
                        ))}
                        </ScrollView>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={styles.featuredSub}>Günün sorusu yüklenemedi.</Text>
            )}
          </View>
          {!dailyResult ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{`${Object.keys(selectedAnswers).length}/5`}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Oyun Modları</Text>
          <Text style={styles.sectionHint}>{GAMES.length} planlandı</Text>
        </View>

        {GAMES.map((game) => (
          <Pressable
            key={game.key}
            style={styles.gameCard}
            onPress={
              game.key === 'guess'
                ? () => navigation.navigate('MovieGuess')
                : game.key === 'poster'
                  ? () => navigation.navigate('PosterGuess')
                  : undefined
            }
          >
            <View style={styles.gameIcon}>
              <Feather name={game.icon} size={20} color={theme.primary || theme.purple} />
            </View>
            <View style={styles.gameText}>
              <Text style={styles.gameTitle}>{game.title}</Text>
              <Text style={styles.gameSub}>{game.subtitle}</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusText}>{game.status}</Text>
            </View>
          </Pressable>
        ))}

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
    featuredCard: {
      minHeight: 118,
      borderRadius: 24,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
      backgroundColor: theme.glassStrong || theme.glass,
      borderWidth: 1,
      borderColor: accentBorder,
      marginBottom: 26,
    },
    featuredIcon: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featuredBody: {
      flex: 1,
      minWidth: 0,
    },
    featuredTitle: {
      color: theme.textPrimary,
      fontSize: 17,
      fontWeight: '900',
    },
    featuredSub: {
      color: theme.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 5,
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 6,
    },
    optionList: {
      gap: 8,
      marginTop: 12,
    },
    progressRow: {
      flexDirection: 'row',
      gap: 7,
      marginTop: 14,
      marginBottom: 4,
    },
    progressDot: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.border,
    },
    progressDotActive: {
      backgroundColor: accent,
    },
    progressDotDone: {
      backgroundColor: accentSoft,
      borderWidth: 1,
      borderColor: accentBorder,
    },
    questionBlock: {
      marginTop: 16,
    },
    questionCount: {
      color: accent,
      fontSize: 11,
      fontWeight: '900',
      marginBottom: 6,
    },
    questionText: {
      color: theme.textPrimary,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '900',
    },
    optionButton: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: theme.glass,
      borderWidth: 1,
      borderColor: theme.border,
    },
    optionButtonSelected: {
      backgroundColor: accentSoft,
      borderColor: accentBorder,
    },
    optionText: {
      color: theme.textSecondary,
      fontSize: 12,
      fontWeight: '800',
    },
    optionTextSelected: {
      color: accent,
    },
    stepActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
    },
    stepButton: {
      flex: 1,
      height: 36,
      borderRadius: 14,
      backgroundColor: theme.glass,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepButtonDisabled: {
      opacity: 0.35,
    },
    stepButtonText: {
      color: theme.textPrimary,
      fontSize: 12,
      fontWeight: '900',
    },
    resultBox: {
      marginTop: 12,
    },
    resultTitle: {
      color: accent,
      fontSize: 12,
      fontWeight: '900',
      marginBottom: 4,
    },
    resultText: {
      color: theme.textPrimary,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '600',
    },
    submitButton: {
      marginTop: 14,
      height: 42,
      borderRadius: 16,
      backgroundColor: accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.45,
    },
    submitButtonText: {
      color: theme.bg,
      fontSize: 13,
      fontWeight: '900',
    },
    recommendationSection: {
      marginTop: 0,
    },
    recommendationHeading: {
      color: theme.textPrimary,
      fontSize: 18,
      fontWeight: '900',
      marginBottom: 12,
    },
    recommendationList: {
      gap: 12,
      paddingRight: 2,
    },
    recommendationItem: {
      width: RECOMMENDATION_CARD_WIDTH,
      padding: 14,
      borderRadius: 22,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: 'rgba(0,0,0,0.26)',
      borderWidth: 1,
      borderColor: theme.border,
    },
    recommendationPoster: {
      width: 104,
      height: 150,
      borderRadius: 17,
      backgroundColor: theme.bgSoft,
    },
    recommendationPosterFallback: {
      width: 104,
      height: 150,
      borderRadius: 17,
      backgroundColor: theme.bgSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recommendationInfo: {
      flex: 1,
      minWidth: 0,
    },
    recommendationTitle: {
      color: theme.textPrimary,
      fontSize: 18,
      fontWeight: '900',
      lineHeight: 23,
    },
    recommendationMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 8,
    },
    recommendationMeta: {
      color: theme.textMuted,
      fontSize: 13,
      fontWeight: '700',
    },
    recommendationRating: {
      color: theme.gold,
      fontSize: 13,
      fontWeight: '900',
    },
    scoreStrip: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 7,
      marginTop: 12,
    },
    scorePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: accentSoft,
      borderWidth: 1,
      borderColor: accentBorder,
    },
    scoreValue: {
      color: accent,
      fontSize: 11,
      fontWeight: '900',
    },
    scoreLabel: {
      color: theme.textSecondary,
      fontSize: 10,
      fontWeight: '800',
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: accentSoft,
      borderWidth: 1,
      borderColor: accentBorder,
    },
    badgeText: {
      color: accent,
      fontSize: 11,
      fontWeight: '900',
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
      backgroundColor: theme.glass,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 12,
    },
    gameIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: accentSoft,
      borderWidth: 1,
      borderColor: accentBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gameText: {
      flex: 1,
    },
    gameTitle: {
      color: theme.textPrimary,
      fontSize: 15,
      fontWeight: '900',
    },
    gameSub: {
      color: theme.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 3,
    },
    statusPill: {
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      borderColor: theme.border,
    },
    statusText: {
      color: theme.textMuted,
      fontSize: 10,
      fontWeight: '900',
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
