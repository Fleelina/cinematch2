import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet, ImageBackground,
  ActivityIndicator, TouchableOpacity, FlatList, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';
import CineMatchRating from '../components/CineMatchRating';
import { useTheme } from '../context/ThemeContext';

const DEFAULT_BACKGROUND = require('../../assets/default-bg.png');

const DEFAULT_T = {
  bg: '#0f0f0f',
  bgSoft: '#1c1c1c',
  glass: 'rgba(255,255,255,0.06)',
  glassStrong: '#181818',
  border: '#242424',
  borderSoft: '#2e2e2e',
  red: '#E50914',
  redSoft: '#5a0a0f',
  text: '#ffffff',
  textSoft: '#bbbbbb',
  textMuted: '#888888',
  gold: '#FFD700',
  link: '#1d9bf0',
};

let styles = createStyles(DEFAULT_T);

// Skeleton placeholder kutusu
function Skeleton({ width, height, borderRadius = 8, style, T = DEFAULT_T }) {
  return (
    <View style={[
      { width, height, borderRadius, backgroundColor: T.glassStrong },
      style,
    ]} />
  );
}

function MovieDetailSkeleton({ T }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'transparent' }}>
      {/* Backdrop */}
      <Skeleton width="100%" height={220} borderRadius={0} T={T} />
      <View style={{ padding: 16, marginTop: -20 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', gap: 14, marginBottom: 16 }}>
          <Skeleton width={110} height={160} borderRadius={12} style={{ marginTop: -40 }} T={T} />
          <View style={{ flex: 1, paddingTop: 8, gap: 8 }}>
            <Skeleton width="90%" height={20} T={T} />
            <Skeleton width="60%" height={14} T={T} />
            <Skeleton width="50%" height={14} T={T} />
            <Skeleton width="70%" height={14} T={T} />
          </View>
        </View>
        {/* Buton */}
        <Skeleton width="100%" height={48} borderRadius={12} style={{ marginBottom: 8 }} T={T} />
        <Skeleton width="60%" height={12} borderRadius={6} style={{ alignSelf: 'center', marginBottom: 20 }} T={T} />
        {/* Puan kutusu */}
        <Skeleton width="100%" height={90} borderRadius={14} style={{ marginBottom: 20 }} T={T} />
        {/* Türler */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {[80, 60, 70].map((w, i) => <Skeleton key={i} width={w} height={28} borderRadius={20} T={T} />)}
        </View>
        {/* Overview */}
        <Skeleton width="40%" height={18} style={{ marginBottom: 10 }} T={T} />
        <Skeleton width="100%" height={14} style={{ marginBottom: 6 }} T={T} />
        <Skeleton width="100%" height={14} style={{ marginBottom: 6 }} T={T} />
        <Skeleton width="80%" height={14} T={T} />
      </View>
    </ScrollView>
  );
}

export default function MovieDetailScreen({ route, navigation }) {
  const { tmdbId, title, poster: initialPoster, year: initialYear, showRatingPrompt, forceIsAdded } = route.params;
  const { theme: themeColors, movieTheme, isDark } = useTheme();
  const T = useMemo(() => ({
    bg: themeColors.bg,
    bgSoft: themeColors.bgSoft,
    glass: themeColors.glass,
    glassStrong: themeColors.glassStrong || themeColors.glass,
    border: themeColors.border,
    borderSoft: themeColors.borderSoft,
    red: themeColors.red || '#E50914',
    redSoft: themeColors.redSoft || 'rgba(255,59,85,0.14)',
    text: themeColors.textPrimary,
    textSoft: themeColors.textSecondary,
    textMuted: themeColors.textMuted,
    gold: themeColors.gold || '#FFD700',
    link: themeColors.primary || themeColors.purple || '#1d9bf0',
  }), [themeColors]);
  styles = useMemo(() => createStyles(T), [T]);
  const useMovieBackgroundImage = isDark && movieTheme?.id !== 'dune' && movieTheme?.backgroundImage;
  const backgroundImage = useMovieBackgroundImage ? movieTheme.backgroundImage : (isDark && !movieTheme ? DEFAULT_BACKGROUND : null);
  const gradientColors = useMovieBackgroundImage
    ? ['rgba(5,5,6,0.18)', 'rgba(5,5,6,0.62)', 'rgba(5,5,6,0.92)']
    : (movieTheme?.gradient || (isDark
        ? ['#050506', '#0B0B10', '#050506']
        : ['#d7dce5', '#c8d0dc', '#b8c2d0']));
  const scrollRef = useRef(null);
  const ratingRef = useRef(null);
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [overviewTranslated, setOverviewTranslated] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState(null);

  const fetchDetail = async () => {
    try {
      const res = await api.get(`/movies/detail/${tmdbId}`);
      const data = res.data;
      if (forceIsAdded) data.isAdded = true;
      setMovie(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDetail(); }, [tmdbId]);

  // Film yüklenince watchlist durumunu sync et
  useEffect(() => {
    if (movie) setInWatchlist(!!movie.isInWatchlist);
  }, [movie]);

  useEffect(() => {
    if (showRatingPrompt && movie && !movie.userRating) {
      setTimeout(() => {
        ratingRef.current?.measureLayout(
          scrollRef.current,
          (_, y) => scrollRef.current?.scrollTo({ y: y - 20, animated: true }),
          () => {}
        );
      }, 400);
    }
  }, [showRatingPrompt, movie]);

  const handleWatchlist = async () => {
    if (inWatchlist) return;
    setWatchlistLoading(true);
    try {
      await api.post('/movies/watchlist', {
        tmdbId: movie.tmdbId,
        title: movie.title,
        poster: movie.poster,
        year: movie.year,
      });
      setInWatchlist(true);
    } catch (err) {
      Alert.alert('Hata', err.response?.data?.error || 'Eklenemedi');
    } finally {
      setWatchlistLoading(false);
    }
  };

  const handleToggle = async () => {
    if (!movie) return;
    setActionLoading(true);
    try {
      if (movie.isAdded) {
        const res = await api.delete(`/movies/remove/${tmdbId}`);
        setMovie(prev => ({ ...prev, isAdded: false, addedByCount: res.data.addedByCount }));
      } else {
        const res = await api.post('/movies/add', {
          tmdbId: movie.tmdbId,
          title: movie.title,
          poster: movie.poster,
          year: movie.year,
        });
        setMovie(prev => ({ ...prev, isAdded: true, addedByCount: res.data.addedByCount }));
        // Watchlist'teyse otomatik kaldır
        if (inWatchlist) {
          try { await api.delete(`/movies/watchlist/${movie.tmdbId}`); } catch {}
          setInWatchlist(false);
        }
      }
    } catch (err) {
      Alert.alert('Hata', 'İşlem başarısız');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRate = async (score) => {
    if (!movie.isAdded) {
      Alert.alert('Uyarı', 'Puan vermek için önce filmi profiline ekle!');
      return;
    }
    
    // Optimistic update: UI'ı hemen güncelle
    const previousRating = movie.userRating;
    const previousCinematchRating = movie.cinematchRating;
    const previousRatingCount = movie.ratingCount;
    
    setMovie(prev => ({
      ...prev,
      userRating: score,
    }));
    
    // Spinner kısa göster
    setRatingLoading(true);
    
    try {
      const res = await api.post(`/movies/rate/${tmdbId}`, { rating: score });
      // Server cevabı ile güncelle
      setMovie(prev => ({
        ...prev,
        cinematchRating: res.data.cinematchRating,
        ratingCount: res.data.ratingCount,
      }));
    } catch (err) {
      // Hata olursa geri al
      setMovie(prev => ({
        ...prev,
        userRating: previousRating,
        cinematchRating: previousCinematchRating,
        ratingCount: previousRatingCount,
      }));
      Alert.alert('Hata', err.response?.data?.error || 'Puan verilemedi');
    } finally {
      setRatingLoading(false);
    }
  };

  const handleTranslate = async () => {
    // Geri al
    if (overviewTranslated) {
      setOverviewTranslated(false);
      return;
    }
    // Zaten çevrilmişse tekrar istek atma
    if (translatedText) {
      setOverviewTranslated(true);
      return;
    }
    // TMDB'den gelen TR varsa direkt kullan
    if (movie.overviewTr) {
      setTranslatedText(movie.overviewTr);
      setOverviewTranslated(true);
      return;
    }
    // Yoksa backend'e çeviri isteği at
    setTranslating(true);
    try {
      const res = await api.post('/movies/translate', { text: movie.overview });
      setTranslatedText(res.data.translated);
      setOverviewTranslated(true);
    } catch (err) {
      Alert.alert('Hata', 'Çeviri yapılamadı');
    } finally {
      setTranslating(false);
    }
  };

  if (loading) {
    // initialPoster varsa hemen poster+başlık göster, arka planda yüklensin
    if (initialPoster) {
      return (
        <ThemeShell backgroundImage={backgroundImage} gradientColors={gradientColors}>
        <ScrollView style={{ flex: 1, backgroundColor: 'transparent' }}>
          <View style={{ width: '100%', height: 220, backgroundColor: T.bgSoft }} />
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>← Geri</Text>
          </TouchableOpacity>
          <View style={{ padding: 16, marginTop: -20 }}>
            <View style={{ flexDirection: 'row', gap: 14, marginBottom: 16 }}>
              <Image
                source={{ uri: initialPoster }}
                style={[styles.poster, { marginTop: -40 }]}
              />
              <View style={{ flex: 1, paddingTop: 8, gap: 8 }}>
                <Text style={styles.title}>{title}</Text>
                {initialYear && <Text style={styles.meta}>{initialYear}</Text>}
                <View style={{ width: 80, height: 12, borderRadius: 6, backgroundColor: T.glassStrong }} />
                <View style={{ width: 100, height: 12, borderRadius: 6, backgroundColor: T.glassStrong }} />
              </View>
            </View>
            <View style={{ width: '100%', height: 48, borderRadius: 12, backgroundColor: T.glassStrong, marginBottom: 20 }} />
            <View style={{ width: '100%', height: 90, borderRadius: 14, backgroundColor: T.glassStrong }} />
          </View>
        </ScrollView>
        </ThemeShell>
      );
    }
    return (
      <ThemeShell backgroundImage={backgroundImage} gradientColors={gradientColors}>
        <MovieDetailSkeleton T={T} />
      </ThemeShell>
    );
  }

  if (!movie) return (
    <ThemeShell backgroundImage={backgroundImage} gradientColors={gradientColors}>
      <View style={styles.center}><Text style={styles.errorText}>Film bilgisi yüklenemedi</Text></View>
    </ThemeShell>
  );

  return (
    <ThemeShell backgroundImage={backgroundImage} gradientColors={gradientColors}>
    <ScrollView ref={scrollRef} style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Backdrop */}
      {movie.backdrop
        ? <Image source={{ uri: movie.backdrop }} style={styles.backdrop} />
        : <View style={styles.backdropPlaceholder} />
      }

      {/* Geri butonu */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>← Geri</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Poster + Temel Bilgi */}
        <View style={styles.header}>
          {movie.poster
            ? <Image source={{ uri: movie.poster }} style={styles.poster} />
            : <View style={styles.posterPlaceholder}><Text style={{ fontSize: 40 }}>🎬</Text></View>
          }
          <View style={styles.headerInfo}>
            <Text style={styles.title}>{movie.title}</Text>
            <Text style={styles.meta}>{movie.year} • {movie.runtime} dk</Text>
            <View style={styles.ratingRow}>
              <Text style={styles.star}>⭐</Text>
              <Text style={styles.imdbRating}>{movie.rating} / 10</Text>
              <Text style={styles.imdbLabel}>IMDb</Text>
            </View>
            {movie.director && movie.directorId && (
              <TouchableOpacity onPress={() => navigation.push('Person', { personId: movie.directorId, name: movie.director })}>
                <Text style={styles.director}>🎬 <Text style={styles.directorLink}>{movie.director}</Text></Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Ekle / Çıkar + Daha Sonra İzle */}
        <TouchableOpacity
          style={[styles.toggleBtn, movie.isAdded && styles.toggleBtnAdded]}
          onPress={handleToggle}
          disabled={actionLoading}
        >
          {actionLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.toggleBtnText}>
                {movie.isAdded ? '✓ Koleksiyonumdan Çıkar' : '+ Koleksiyonuma Ekle'}
              </Text>
          }
        </TouchableOpacity>
        {!movie.isAdded && (
          <TouchableOpacity
            style={[styles.watchlistBtn, inWatchlist && styles.watchlistBtnDone]}
            onPress={handleWatchlist}
            disabled={watchlistLoading || inWatchlist}
          >
            {watchlistLoading
              ? <ActivityIndicator color="#ccc" size="small" />
              : <Text style={styles.watchlistBtnText}>{inWatchlist ? '⏱ İzle listeme eklendi' : '⏱ İzle listeme ekle'}</Text>
            }
          </TouchableOpacity>
        )}
        <Text style={styles.addedByText}>
          {movie.addedByCount > 0
            ? `${movie.addedByCount} kişi tarafından eklendi`
            : 'Henüz kimse eklemedi, ilk sen ol!'}
        </Text>

        {/* CineMatch Puanı */}
        <View ref={ratingRef} style={[styles.cinematchBox, showRatingPrompt && !movie.userRating && styles.cinematchBoxHighlight]}>
          {/* Üst satır: kalp + puan + oy sayısı */}
          <View style={styles.cinematchTop}>
            <CineMatchRating
              rating={movie.cinematchRating}
              ratingCount={movie.ratingCount}
              size={38}
              id={String(movie.tmdbId)}
            />
            <View style={styles.cinematchDivider} />
            <View style={styles.myRatingBox}>
              <Text style={styles.myRatingLabel}>Senin puanın</Text>
              {ratingLoading
                ? <ActivityIndicator color={T.red} size="small" />
                : <Text style={styles.myRatingValue}>
                    {movie.userRating ? movie.userRating : '—'}
                  </Text>
              }
            </View>
          </View>

          {/* Puan butonları — ince yatay şerit */}
          <View style={styles.scoreRow}>
            {[1,2,3,4,5,6,7,8,9,10].map((score) => {
              const isActive = movie.userRating === score;
              const isPast = movie.userRating && score < movie.userRating;
              return (
                <TouchableOpacity
                  key={score}
                  style={[
                    styles.scoreBtn,
                    isActive && styles.scoreBtnActive,
                    isPast && styles.scoreBtnPast,
                  ]}
                  onPress={() => handleRate(score)}
                  disabled={ratingLoading}
                >
                  <Text style={[
                    styles.scoreBtnText,
                    (isActive || isPast) && styles.scoreBtnTextActive,
                  ]}>
                    {score}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Türler */}
        {movie.genres?.length > 0 && (
          <View style={styles.genreRow}>
            {movie.genres.map((g, i) => (
              <View key={i} style={styles.genreTag}>
                <Text style={styles.genreText}>{g}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Özet */}
        {movie.overview ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Konu</Text>
            <Text style={styles.overview}>
              {overviewTranslated ? translatedText : movie.overview}
            </Text>
            <TouchableOpacity
              style={styles.translateBtn}
              onPress={handleTranslate}
              disabled={translating}
            >
              {translating
                ? <ActivityIndicator size="small" color={T.link} />
                : <Text style={styles.translateBtnText}>
                    {overviewTranslated ? '🌐 Show original' : '🌐 Türkçeye çevir'}
                  </Text>
              }
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Oyuncular */}
        {movie.cast?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Oyuncular</Text>
            <FlatList
              data={movie.cast}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.castCard}
                  onPress={() => navigation.push('Person', { personId: item.personId, name: item.name })}
                >
                  {item.photo
                    ? <Image source={{ uri: item.photo }} style={styles.castPhoto} />
                    : <View style={styles.castPhotoPlaceholder}><Text style={{ fontSize: 24 }}>👤</Text></View>
                  }
                  <Text style={styles.castName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.castCharacter} numberOfLines={1}>{item.character}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        <View style={{ height: 32 }} />
      </View>
    </ScrollView>
    </ThemeShell>
  );
}

function ThemeShell({ children, backgroundImage, gradientColors }) {
  const content = <LinearGradient colors={gradientColors} style={styles.shell}>{children}</LinearGradient>;
  if (!backgroundImage) return <View style={styles.shell}>{content}</View>;
  return (
    <ImageBackground source={backgroundImage} style={styles.shell} resizeMode="cover">
      {content}
    </ImageBackground>
  );
}

function createStyles(T) {
  return StyleSheet.create({
  shell: { flex: 1 },
  container: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: T.text, fontSize: 16 },
  backdrop: { width: '100%', height: 220 },
  backdropPlaceholder: { width: '100%', height: 220, backgroundColor: T.bgSoft },
  backBtn: {
    position: 'absolute', top: 44, left: 16,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  backBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  content: { padding: 16, marginTop: -20 },
  header: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  poster: { width: 110, height: 160, borderRadius: 12, marginTop: -40 },
  posterPlaceholder: {
    width: 110, height: 160, borderRadius: 12, marginTop: -40,
    backgroundColor: T.bgSoft, justifyContent: 'center', alignItems: 'center'
  },
  headerInfo: { flex: 1, paddingTop: 8 },
  title: { color: T.text, fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  originalTitle: { color: T.textMuted, fontSize: 13, marginBottom: 6, fontStyle: 'italic' },
  meta: { color: T.textSoft, fontSize: 13, marginBottom: 6 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  star: { fontSize: 14 },
  imdbRating: { color: T.gold, fontWeight: 'bold', fontSize: 14 },
  imdbLabel: { color: T.textMuted, fontSize: 11 },
  director: { color: T.textSoft, fontSize: 13 },
  directorLink: { color: T.red, fontWeight: '600', textDecorationLine: 'underline' },
  toggleBtn: {
    backgroundColor: T.red, borderRadius: 12, padding: 14,
    alignItems: 'center', marginBottom: 8,
  },
  toggleBtnAdded: { backgroundColor: T.glassStrong, borderWidth: 1, borderColor: T.border },
  toggleBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  watchlistBtn: {
    borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 8,
    borderWidth: 1, borderColor: T.border, backgroundColor: 'transparent',
  },
  watchlistBtnDone: { borderColor: T.borderSoft, opacity: 0.6 },
  watchlistBtnText: { color: T.textSoft, fontWeight: '600', fontSize: 14 },
  addedByText: { color: T.textMuted, fontSize: 12, textAlign: 'center', marginBottom: 20 },

  // CineMatch Puanı
  cinematchBox: {
    backgroundColor: T.glassStrong,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: T.border,
    gap: 10,
  },
  cinematchBoxHighlight: {
    borderColor: T.red,
    borderWidth: 1.5,
    shadowColor: T.red,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  cinematchTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cinematchDivider: {
    width: 1,
    height: 32,
    backgroundColor: T.borderSoft,
    marginHorizontal: 14,
  },
  myRatingBox: {
    flex: 1,
    alignItems: 'flex-end',
  },
  myRatingLabel: {
    color: T.textMuted,
    fontSize: 11,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  myRatingValue: {
    color: T.text,
    fontSize: 22,
    fontWeight: '700',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreBtn: {
    flex: 1,
    marginHorizontal: 1.5,
    height: 30,
    borderRadius: 6,
    backgroundColor: T.glass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreBtnActive: {
    backgroundColor: T.red,
  },
  scoreBtnPast: {
    backgroundColor: T.redSoft,
  },
  scoreBtnText: { color: T.textMuted, fontSize: 11, fontWeight: '700' },
  scoreBtnTextActive: { color: '#fff' },

  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  genreTag: {
    backgroundColor: T.glass, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: T.border
  },
  genreText: { color: T.textSoft, fontSize: 12 },
  section: { marginBottom: 24 },
  sectionTitle: { color: T.text, fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  overview: { color: T.textSoft, fontSize: 14, lineHeight: 22 },
  translateBtn: { marginTop: 8, alignSelf: 'flex-start', paddingVertical: 4 },
  translateBtnText: { color: T.link, fontSize: 13, fontWeight: '600' },
  castCard: { width: 90, marginRight: 12, alignItems: 'center' },
  castPhoto: { width: 70, height: 100, borderRadius: 10, marginBottom: 6 },
  castPhotoPlaceholder: {
    width: 70, height: 100, borderRadius: 10, marginBottom: 6,
    backgroundColor: T.bgSoft, justifyContent: 'center', alignItems: 'center'
  },
  castName: { color: T.text, fontSize: 11, textAlign: 'center', fontWeight: '600' },
  castCharacter: { color: T.textMuted, fontSize: 10, textAlign: 'center' },
});
}
