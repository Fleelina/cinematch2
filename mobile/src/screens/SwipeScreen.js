import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, Image, StyleSheet, ActivityIndicator,
  TouchableOpacity, Animated, PanResponder, Dimensions,
  Alert, Pressable,
} from 'react-native';
import api from '../services/api';
import { Colors, Radii, Shadows } from '../theme';

const { width: SW, height: SH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SW * 0.25;
const CARD_H = SH * 0.58;

let prefetchedMovies = [];
let isFetching = false;

async function prefetchMovies(onDone) {
  if (isFetching) return;
  isFetching = true;
  try {
    const res = await api.get('/movies/suggestions');
    prefetchedMovies = res.data.movies || [];
    if (onDone) onDone();
  } catch {
    prefetchedMovies = [];
  } finally {
    isFetching = false;
  }
}

export default function SwipeScreen({ navigation }) {
  const [movies, setMovies] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const position = useRef(new Animated.ValueXY()).current;

  useEffect(() => { loadMovies(); }, []);

  useEffect(() => {
    const remaining = movies.length - currentIndex;
    if (remaining === 5 && !isFetching) prefetchMovies();
    if (remaining === 0 && prefetchedMovies.length > 0) {
      setMovies(prefetchedMovies);
      prefetchedMovies = [];
      setCurrentIndex(0);
      position.setValue({ x: 0, y: 0 });
      prefetchMovies();
    } else if (remaining === 0 && !isFetching) {
      // prefetch henüz bitmedi, bitince otomatik yükle
      prefetchMovies(() => loadMovies());
    }
  }, [currentIndex, movies.length]);

  const loadMovies = async () => {
    setLoading(true);
    if (prefetchedMovies.length > 0) {
      setMovies(prefetchedMovies);
      prefetchedMovies = [];
      setLoading(false);
      position.setValue({ x: 0, y: 0 });
      prefetchMovies();
      return;
    }
    try {
      const res = await api.get('/movies/suggestions');
      setMovies(res.data.movies || []);
      setCurrentIndex(0);
      position.setValue({ x: 0, y: 0 });
      prefetchMovies();
    } catch {
      Alert.alert('Hata', 'Filmler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (prefetchedMovies.length > 0) {
      setMovies(prefetchedMovies);
      prefetchedMovies = [];
      setCurrentIndex(0);
      position.setValue({ x: 0, y: 0 });
      setRefreshing(false);
      prefetchMovies();
      return;
    }
    try {
      const res = await api.get('/movies/suggestions');
      setMovies(res.data.movies || []);
      setCurrentIndex(0);
      position.setValue({ x: 0, y: 0 });
      prefetchMovies();
    } catch {
      Alert.alert('Hata', 'Yüklenemedi');
    } finally {
      setRefreshing(false);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => position.setValue({ x: g.dx, y: g.dy }),
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_THRESHOLD) triggerSwipeRight();
        else if (g.dx < -SWIPE_THRESHOLD) triggerSwipeLeft();
        else if (g.dy < -SWIPE_THRESHOLD) triggerSwipeUp();
        else Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    })
  ).current;

  const triggerSwipeRight = () => {
    Animated.timing(position, {
      toValue: { x: SW + 100, y: 0 }, duration: 260, useNativeDriver: false,
    }).start(() => { position.setValue({ x: 0, y: 0 }); handleAdd(); });
  };

  const triggerSwipeLeft = () => {
    Animated.timing(position, {
      toValue: { x: -SW - 100, y: 0 }, duration: 260, useNativeDriver: false,
    }).start(() => { position.setValue({ x: 0, y: 0 }); setCurrentIndex((p) => p + 1); });
  };

  const triggerSwipeUp = () => {
    Animated.timing(position, {
      toValue: { x: 0, y: -SH }, duration: 260, useNativeDriver: false,
    }).start(() => { position.setValue({ x: 0, y: 0 }); handleWatchlist(); });
  };

  const handleAdd = async () => {
    const movie = movies[currentIndex];
    setActionLoading('add');
    position.setValue({ x: 0, y: 0 });
    setCurrentIndex((p) => p + 1);
    try {
      await api.post('/movies/add', {
        tmdbId: movie.tmdbId, title: movie.title, poster: movie.poster, year: movie.year,
      });
    } catch { /* sessizce geç */ }
    finally { setActionLoading(null); }
  };

  const handleWatchlist = async () => {
    const movie = movies[currentIndex];
    setActionLoading('watchlist');
    position.setValue({ x: 0, y: 0 });
    setCurrentIndex((p) => p + 1);
    try {
      await api.post('/movies/watchlist', {
        tmdbId: movie.tmdbId, title: movie.title, poster: movie.poster, year: movie.year,
      });
    } catch { /* sessizce geç */ }
    finally { setActionLoading(null); }
  };

  // Interpolations
  const rotate = position.x.interpolate({
    inputRange: [-SW / 2, 0, SW / 2], outputRange: ['-6deg', '0deg', '6deg'], extrapolate: 'clamp',
  });
  const likeOpacity = position.x.interpolate({ inputRange: [0, SW / 4], outputRange: [0, 1], extrapolate: 'clamp' });
  const nopeOpacity = position.x.interpolate({ inputRange: [-SW / 4, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const watchOpacity = position.y.interpolate({ inputRange: [-SH / 6, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const nextScale = position.x.interpolate({
    inputRange: [-SW, 0, SW], outputRange: [1, 0.93, 1], extrapolate: 'clamp',
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.red} size="large" />
        <Text style={styles.loadingText}>Filmler yükleniyor...</Text>
      </View>
    );
  }

  const current = movies[currentIndex];
  const next = movies[currentIndex + 1];
  const third = movies[currentIndex + 2];

  if (!current) {
    return (
      <View style={styles.center}>
        <Text style={styles.doneEmoji}>🎬</Text>
        <Text style={styles.doneTitle}>Yeni filmler hazırlanıyor</Text>
        <Text style={styles.doneSub}>Biraz bekle, kuyruk doluyor...</Text>
        <ActivityIndicator color={Colors.red} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLogo}>CineMatch</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('Watchlist')}
          >
            <Text style={styles.headerBtnText}>📋</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerBtn, { borderColor: Colors.redBorder }]}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            {refreshing
              ? <ActivityIndicator color={Colors.red} size="small" />
              : <Text style={[styles.headerBtnText, { color: Colors.red }]}>↺</Text>
            }
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.hint}>← Atla  ·  Ekle →  ·  ↑ Sonra İzle</Text>

      {/* Kartlar */}
      <View style={styles.cardArea}>
        {/* 3. kart (en arka) */}
        {third && (
          <View style={[styles.card, styles.cardThird]}>
            <Image source={{ uri: third.poster }} style={styles.cardImage} blurRadius={3} />
          </View>
        )}

        {/* 2. kart */}
        {next && (
          <Animated.View style={[styles.card, styles.cardSecond, { transform: [{ scale: nextScale }] }]}>
            <Image source={{ uri: next.poster }} style={styles.cardImage} />
            <View style={styles.cardGradient} />
            <View style={styles.cardFooter}>
              <Text style={styles.nextCardTitle} numberOfLines={1}>{next.title}</Text>
            </View>
          </Animated.View>
        )}

        {/* 1. kart (aktif) */}
        <Animated.View
          style={[styles.card, {
            transform: [
              { translateX: position.x },
              { translateY: position.y },
              { rotate },
            ],
          }]}
          {...panResponder.panHandlers}
        >
          <Image source={{ uri: current.poster }} style={styles.cardImage} />
          <View style={styles.cardGradient} />

          {/* Swipe badge'leri */}
          <Animated.View style={[styles.badge, styles.badgeLike, { opacity: likeOpacity }]}>
            <Text style={styles.badgeLikeText}>EKLE ♥</Text>
          </Animated.View>
          <Animated.View style={[styles.badge, styles.badgeNope, { opacity: nopeOpacity }]}>
            <Text style={styles.badgeNopeText}>ATLA ✕</Text>
          </Animated.View>
          <Animated.View style={[styles.badge, styles.badgeWatch, { opacity: watchOpacity }]}>
            <Text style={styles.badgeWatchText}>SONRA ⊕</Text>
          </Animated.View>

          {/* Kart bilgileri */}
          <View style={styles.cardFooter}>
            <View style={styles.pillRow}>
              {current.rating && (
                <View style={[styles.pill, styles.pillRating]}>
                  <Text style={styles.pillRatingText}>⭐ {current.rating}</Text>
                </View>
              )}
              {current.year && (
                <View style={[styles.pill, styles.pillYear]}>
                  <Text style={styles.pillYearText}>{current.year}</Text>
                </View>
              )}
              {current.genre && (
                <View style={[styles.pill, styles.pillGenre]}>
                  <Text style={styles.pillGenreText}>{current.genre}</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardTitle}>{current.title}</Text>
            {current.overview ? (
              <Text style={styles.cardOverview} numberOfLines={2}>{current.overview}</Text>
            ) : null}
            <TouchableOpacity
              style={styles.detailBtn}
              onPress={() => navigation.navigate('MovieDetail', {
                tmdbId: current.tmdbId, title: current.title,
              })}
            >
              <Text style={styles.detailBtnText}>Detaylar →</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>

      {/* Aksiyon butonları */}
      <View style={styles.actions}>
        <ActionButton
          onPress={triggerSwipeLeft}
          style={styles.skipBtn}
          icon="✕"
          iconStyle={{ color: '#ff2840', fontSize: 20 }}
        />
        <ActionButton
          onPress={triggerSwipeUp}
          style={styles.watchlistBtn}
          loading={actionLoading === 'watchlist'}
          icon="⊕"
          iconStyle={{ color: Colors.gold, fontSize: 22 }}
        />
        <ActionButton
          onPress={triggerSwipeRight}
          style={styles.addBtn}
          loading={actionLoading === 'add'}
          icon="♥"
          iconStyle={{ color: '#fff', fontSize: 26 }}
        />
      </View>

      <Text style={styles.counter}>{currentIndex + 1} / {movies.length}</Text>
    </View>
  );
}

function ActionButton({ onPress, style, loading, icon, iconStyle }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        style={[styles.actionBtn, style]}
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, speed: 50 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start()}
      >
        {loading
          ? <ActivityIndicator color={iconStyle.color} size="small" />
          : <Text style={iconStyle}>{icon}</Text>
        }
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: {
    flex: 1, backgroundColor: Colors.bg,
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  loadingText: { color: Colors.textMuted, marginTop: 14, fontSize: 13 },
  doneEmoji: { fontSize: 60, marginBottom: 16 },
  doneTitle: { color: Colors.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: 6 },
  doneSub: { color: Colors.textSecondary, fontSize: 13 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 14,
  },
  headerLogo: {
    fontSize: 11, fontWeight: '700', letterSpacing: 4,
    color: Colors.red, textTransform: 'uppercase',
  },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.bgCard, borderWidth: 0.5, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  headerBtnText: { fontSize: 15, color: Colors.textSecondary },

  hint: {
    color: Colors.textHint, fontSize: 10, textAlign: 'center',
    marginTop: 6, letterSpacing: 0.5,
  },

  // Kartlar
  cardArea: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 14, marginTop: 4,
  },
  card: {
    position: 'absolute',
    width: SW - 28,
    height: CARD_H,
    borderRadius: Radii.xl,
    overflow: 'hidden',
    backgroundColor: Colors.bgCard,
    ...Shadows.card,
  },
  cardSecond: {
    transform: [{ scale: 0.93 }],
    opacity: 0.75,
  },
  cardThird: {
    transform: [{ scale: 0.86 }],
    opacity: 0.4,
  },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '58%',
    backgroundColor: 'rgba(0,0,0,0.01)',
    borderBottomLeftRadius: Radii.xl, borderBottomRightRadius: Radii.xl,
  },

  // Swipe badge'leri
  badge: {
    position: 'absolute', top: 26, flexDirection: 'row',
    paddingVertical: 7, paddingHorizontal: 16,
    borderRadius: Radii.sm, borderWidth: 2,
  },
  badgeLike: {
    left: 18, borderColor: Colors.green,
    backgroundColor: Colors.greenDim, transform: [{ rotate: '-10deg' }],
  },
  badgeLikeText: { color: Colors.green, fontWeight: '900', fontSize: 14, letterSpacing: 1.5 },
  badgeNope: {
    right: 18, borderColor: '#ff2840',
    backgroundColor: 'rgba(255,40,64,0.12)', transform: [{ rotate: '10deg' }],
  },
  badgeNopeText: { color: '#ff2840', fontWeight: '900', fontSize: 14, letterSpacing: 1.5 },
  badgeWatch: {
    alignSelf: 'center', left: '25%', borderColor: Colors.gold,
    backgroundColor: Colors.goldDim,
  },
  badgeWatchText: { color: Colors.gold, fontWeight: '900', fontSize: 14, letterSpacing: 1.5 },

  // Kart footer
  cardFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 18,
    backgroundColor: 'rgba(5,5,12,0.75)',
    borderBottomLeftRadius: Radii.xl, borderBottomRightRadius: Radii.xl,
  },
  nextCardTitle: {
    color: Colors.textSecondary, fontSize: 16, fontWeight: '700',
  },
  pillRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  pill: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: Radii.pill },
  pillRating: { backgroundColor: Colors.goldDim, borderWidth: 0.5, borderColor: 'rgba(240,180,41,0.4)' },
  pillRatingText: { color: Colors.gold, fontSize: 11, fontWeight: '700' },
  pillYear: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)' },
  pillYearText: { color: Colors.textSecondary, fontSize: 11 },
  pillGenre: { backgroundColor: Colors.redDim, borderWidth: 0.5, borderColor: Colors.redBorder },
  pillGenreText: { color: Colors.red, fontSize: 11, fontWeight: '600' },
  cardTitle: {
    color: Colors.textPrimary, fontSize: 21, fontWeight: '800',
    marginBottom: 5, letterSpacing: -0.3,
  },
  cardOverview: {
    color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 17, marginBottom: 10,
  },
  detailBtn: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.redDim,
    borderRadius: Radii.pill,
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 0.5, borderColor: Colors.redBorder,
  },
  detailBtnText: { color: Colors.red, fontSize: 11, fontWeight: '700' },

  // Aksiyon butonları
  actions: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 14, paddingTop: 10, paddingBottom: 6,
  },
  actionBtn: {
    borderRadius: Radii.pill, justifyContent: 'center', alignItems: 'center',
  },
  skipBtn: {
    width: 52, height: 52,
    backgroundColor: Colors.bgCard,
    borderWidth: 1.5, borderColor: 'rgba(255,40,64,0.35)',
  },
  watchlistBtn: {
    width: 46, height: 46,
    backgroundColor: Colors.bgCard,
    borderWidth: 1.5, borderColor: Colors.goldDim,
  },
  addBtn: {
    width: 68, height: 68,
    backgroundColor: Colors.red,
    ...Shadows.red,
  },
  counter: {
    color: Colors.textHint, fontSize: 10, textAlign: 'center', paddingBottom: 10,
  },
});
