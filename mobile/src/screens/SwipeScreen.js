import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, Image, StyleSheet, ActivityIndicator,
  TouchableOpacity, Animated, PanResponder, Dimensions, Alert, LinearGradient
} from 'react-native';
import api from '../services/api';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.60;

export default function SwipeScreen({ navigation }) {
  const [movies, setMovies] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const position = useRef(new Animated.ValueXY()).current;

  useEffect(() => { fetchSuggestions(); }, []);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/movies/suggestions');
      setMovies(res.data.movies);
      setCurrentIndex(0);
      position.setValue({ x: 0, y: 0 });
    } catch (err) {
      Alert.alert('Hata', 'Filmler yuklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        position.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) triggerSwipeRight();
        else if (gestureState.dx < -SWIPE_THRESHOLD) triggerSwipeLeft();
        else if (gestureState.dy < -SWIPE_THRESHOLD) triggerSwipeUp();
        else Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    })
  ).current;

  const triggerSwipeRight = () => {
    Animated.timing(position, { toValue: { x: SCREEN_WIDTH + 100, y: 0 }, duration: 280, useNativeDriver: false }).start(() => {
      position.setValue({ x: 0, y: 0 });
      handleAdd();
    });
  };

  const triggerSwipeLeft = () => {
    Animated.timing(position, { toValue: { x: -SCREEN_WIDTH - 100, y: 0 }, duration: 280, useNativeDriver: false }).start(() => {
      position.setValue({ x: 0, y: 0 });
      setCurrentIndex((prev) => prev + 1);
    });
  };

  const triggerSwipeUp = () => {
    Animated.timing(position, { toValue: { x: 0, y: -SCREEN_HEIGHT }, duration: 280, useNativeDriver: false }).start(() => {
      position.setValue({ x: 0, y: 0 });
      handleWatchlist();
    });
  };

  const handleAdd = async () => {
    const movie = movies[currentIndex];
    setActionLoading('add');
    try {
      await api.post('/movies/add', { tmdbId: movie.tmdbId, title: movie.title, poster: movie.poster, year: movie.year });
    } catch (err) {}
    finally { setActionLoading(null); setCurrentIndex((prev) => prev + 1); }
  };

  const handleWatchlist = async () => {
    const movie = movies[currentIndex];
    setActionLoading('watchlist');
    try {
      await api.post('/movies/watchlist', { tmdbId: movie.tmdbId, title: movie.title, poster: movie.poster, year: movie.year });
    } catch (err) {}
    finally { setActionLoading(null); setCurrentIndex((prev) => prev + 1); }
  };

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-6deg', '0deg', '6deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({ inputRange: [0, SCREEN_WIDTH / 4], outputRange: [0, 1], extrapolate: 'clamp' });
  const nopeOpacity = position.x.interpolate({ inputRange: [-SCREEN_WIDTH / 4, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const watchlistOpacity = position.y.interpolate({ inputRange: [-SCREEN_HEIGHT / 6, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  const nextCardScale = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: [1, 0.94, 1],
    extrapolate: 'clamp',
  });

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color="#E50914" size="large" />
      <Text style={styles.loadingText}>Filmler yukleniyor...</Text>
    </View>
  );

  const currentMovie = movies[currentIndex];
  const nextMovie = movies[currentIndex + 1];

  if (!currentMovie) return (
    <View style={styles.center}>
      <Text style={styles.doneEmoji}>🎬</Text>
      <Text style={styles.doneText}>Hepsi bu kadar!</Text>
      <TouchableOpacity style={styles.reloadBtn} onPress={fetchSuggestions}>
        <Text style={styles.reloadBtnText}>Yeniden Yukle</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Sag ust butonlar */}
      <View style={styles.topRight}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Watchlist')}>
          <Text style={styles.iconBtnText}>📋</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={fetchSuggestions}>
          <Text style={[styles.iconBtnText, { color: '#E50914' }]}>↺</Text>
        </TouchableOpacity>
      </View>

      {/* Hint */}
      <Text style={styles.hint}>← Atla  •  Ekle →  •  ↑ Sonra İzle</Text>

      {/* Kartlar */}
      <View style={styles.cardContainer}>
        {/* 3. arka kart efekti */}
        {movies[currentIndex + 2] && (
          <View style={[styles.card, styles.card3]}>
            <Image source={{ uri: movies[currentIndex + 2].poster }} style={styles.cardImage} blurRadius={2} />
          </View>
        )}

        {/* 2. kart */}
        {nextMovie && (
          <Animated.View style={[styles.card, styles.card2, { transform: [{ scale: nextCardScale }] }]}>
            <Image source={{ uri: nextMovie.poster }} style={styles.cardImage} />
            <View style={styles.cardGradient} />
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle} numberOfLines={1}>{nextMovie.title}</Text>
            </View>
          </Animated.View>
        )}

        {/* Ana kart */}
        <Animated.View
          style={[styles.card, {
            transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }],
            shadowOpacity: 0.5,
          }]}
          {...panResponder.panHandlers}
        >
          <Image source={{ uri: currentMovie.poster }} style={styles.cardImage} />

          {/* Gradient overlay */}
          <View style={styles.cardGradient} />

          {/* Swipe etiketleri */}
          <Animated.View style={[styles.swipeBadge, styles.swipeBadgeLike, { opacity: likeOpacity }]}>
            <Text style={styles.swipeBadgeText}>EKLE</Text>
            <Text style={styles.swipeBadgeIcon}>✓</Text>
          </Animated.View>

          <Animated.View style={[styles.swipeBadge, styles.swipeBadgeNope, { opacity: nopeOpacity }]}>
            <Text style={styles.swipeBadgeText}>ATLA</Text>
            <Text style={styles.swipeBadgeIcon}>✕</Text>
          </Animated.View>

          <Animated.View style={[styles.swipeBadge, styles.swipeBadgeWatch, { opacity: watchlistOpacity }]}>
            <Text style={styles.swipeBadgeText}>SONRA</Text>
            <Text style={styles.swipeBadgeIcon}>📋</Text>
          </Animated.View>

          {/* Film bilgisi */}
          <View style={styles.cardInfo}>
            <View style={styles.cardInfoTop}>
              {currentMovie.rating && (
                <View style={styles.ratingPill}>
                  <Text style={styles.ratingPillText}>⭐ {currentMovie.rating}</Text>
                </View>
              )}
              {currentMovie.year && (
                <View style={styles.yearPill}>
                  <Text style={styles.yearPillText}>{currentMovie.year}</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardTitle}>{currentMovie.title}</Text>
            {currentMovie.overview ? (
              <Text style={styles.cardOverview} numberOfLines={2}>{currentMovie.overview}</Text>
            ) : null}

            {/* Detay butonu kart icinde */}
            <TouchableOpacity
              style={styles.detailPill}
              onPress={() => navigation.navigate('MovieDetail', { tmdbId: currentMovie.tmdbId, title: currentMovie.title })}
            >
              <Text style={styles.detailPillText}>Detaylar →</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>

      {/* Aksiyon butonlari */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, styles.nopeBtn]} onPress={triggerSwipeLeft}>
          <Text style={styles.actionIcon}>✕</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.watchlistBtn]} onPress={triggerSwipeUp} disabled={!!actionLoading}>
          {actionLoading === 'watchlist'
            ? <ActivityIndicator color="#FFD700" size="small" />
            : <Text style={[styles.actionIcon, { fontSize: 20 }]}>📋</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.likeBtn]} onPress={triggerSwipeRight} disabled={!!actionLoading}>
          {actionLoading === 'add'
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.actionIcon}>♥</Text>
          }
        </TouchableOpacity>
      </View>

      <Text style={styles.counter}>{currentIndex + 1} / {movies.length}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { color: '#888', marginTop: 14, fontSize: 14 },

  topRight: {
    position: 'absolute', top: 12, right: 16,
    flexDirection: 'row', gap: 8, zIndex: 10,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(30,30,30,0.9)', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  iconBtnText: { fontSize: 17, color: '#fff', fontWeight: 'bold' },

  hint: { color: '#333', fontSize: 11, textAlign: 'center', marginTop: 8, marginBottom: 4 },

  cardContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', marginHorizontal: 12,
  },

  card: {
    position: 'absolute',
    width: SCREEN_WIDTH - 24,
    height: CARD_HEIGHT,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  card2: {
    transform: [{ scale: 0.94 }],
    opacity: 0.85,
  },
  card3: {
    transform: [{ scale: 0.88 }],
    opacity: 0.5,
  },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  cardGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: '55%',
    backgroundColor: 'transparent',
    // Simulated gradient via shadow
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    background: 'linear-gradient(transparent, #000)',
  },

  // Swipe etiketleri
  swipeBadge: {
    position: 'absolute', top: 28,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 18,
    borderRadius: 12, borderWidth: 3,
  },
  swipeBadgeLike: {
    left: 20, borderColor: '#00E676',
    backgroundColor: 'rgba(0,230,118,0.15)',
    transform: [{ rotate: '-12deg' }],
  },
  swipeBadgeNope: {
    right: 20, borderColor: '#FF1744',
    backgroundColor: 'rgba(255,23,68,0.15)',
    transform: [{ rotate: '12deg' }],
  },
  swipeBadgeWatch: {
    alignSelf: 'center', left: '28%',
    borderColor: '#FFD600',
    backgroundColor: 'rgba(255,214,0,0.15)',
  },
  swipeBadgeText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 1 },
  swipeBadgeIcon: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  // Kart bilgisi
  cardInfo: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  cardInfoTop: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  ratingPill: {
    backgroundColor: 'rgba(255,214,0,0.2)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,214,0,0.4)',
  },
  ratingPillText: { color: '#FFD600', fontSize: 12, fontWeight: 'bold' },
  yearPill: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  yearPillText: { color: '#ccc', fontSize: 12 },
  cardTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 6, letterSpacing: 0.3 },
  cardOverview: { color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 18, marginBottom: 10 },
  detailPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(229,9,20,0.2)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(229,9,20,0.5)',
  },
  detailPillText: { color: '#E50914', fontSize: 12, fontWeight: 'bold' },

  // Aksiyon butonlari
  actions: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 16, paddingTop: 12, paddingBottom: 8,
  },
  actionBtn: {
    width: 60, height: 60, borderRadius: 30,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  nopeBtn: {
    backgroundColor: '#1a1a1a', borderWidth: 2, borderColor: '#FF1744',
    width: 54, height: 54, borderRadius: 27,
  },
  watchlistBtn: {
    backgroundColor: '#1a1a1a', borderWidth: 2, borderColor: '#FFD600',
    width: 48, height: 48, borderRadius: 24,
  },
  likeBtn: { backgroundColor: '#E50914', width: 64, height: 64, borderRadius: 32 },
  actionIcon: { fontSize: 24, color: '#fff' },

  counter: { color: '#333', fontSize: 11, textAlign: 'center', paddingBottom: 12 },

  doneEmoji: { fontSize: 64, marginBottom: 16 },
  doneText: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 24 },
  reloadBtn: { backgroundColor: '#E50914', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40 },
  reloadBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
