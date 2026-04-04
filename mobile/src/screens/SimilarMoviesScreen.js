import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity,
  ActivityIndicator, Animated, PanResponder, Dimensions, Alert,
} from 'react-native';
import api from '../services/api';

const { width: SW, height: SH } = Dimensions.get('window');
const CARD_W = SW - 40;
const CARD_H = SH * 0.72;
const SWIPE_THRESHOLD = SW * 0.28;

function SwipeCard({ movie, onSwipeLeft, onSwipeRight, isTop }) {
  const pan = useRef(new Animated.ValueXY()).current;
  const rotate = pan.x.interpolate({
    inputRange: [-SW / 2, 0, SW / 2],
    outputRange: ['-12deg', '0deg', '12deg'],
    extrapolate: 'clamp',
  });
  const likeOpacity = pan.x.interpolate({ inputRange: [0, SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
  const nopeOpacity = pan.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isTop,
      onMoveShouldSetPanResponder: () => isTop,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_THRESHOLD) {
          Animated.timing(pan, { toValue: { x: SW * 1.5, y: g.dy }, duration: 280, useNativeDriver: false }).start(onSwipeRight);
        } else if (g.dx < -SWIPE_THRESHOLD) {
          Animated.timing(pan, { toValue: { x: -SW * 1.5, y: g.dy }, duration: 280, useNativeDriver: false }).start(onSwipeLeft);
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  const cardStyle = {
    transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }],
  };

  return (
    <Animated.View style={[styles.card, cardStyle]} {...responder.panHandlers}>
      {/* Backdrop / Poster */}
      <Image
        source={{ uri: movie.backdrop || movie.poster }}
        style={styles.cardBg}
        resizeMode="cover"
      />
      <View style={styles.cardGradient} />

      {/* LIKE / NOPE etiketleri */}
      <Animated.View style={[styles.badge, styles.badgeLike, { opacity: likeOpacity }]}>
        <Text style={styles.badgeTextLike}>İZLE</Text>
      </Animated.View>
      <Animated.View style={[styles.badge, styles.badgeNope, { opacity: nopeOpacity }]}>
        <Text style={styles.badgeTextNope}>GEÇ</Text>
      </Animated.View>

      {/* Film bilgileri */}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>{movie.title}</Text>
        <View style={styles.cardMeta}>
          {movie.year ? <Text style={styles.metaChip}>{movie.year}</Text> : null}
          {movie.rating && parseFloat(movie.rating) > 0
            ? <Text style={styles.metaChipImdb}>⭐ {movie.rating}</Text>
            : null}
          {movie.cinematchRating
            ? <Text style={styles.metaChipCm}>❤️ {movie.cinematchRating}</Text>
            : null}
        </View>
        {movie.director
          ? <Text style={styles.cardDirector}>🎬 {movie.director}</Text>
          : null}
        {movie.cast?.length > 0
          ? <Text style={styles.cardCast}>🎭 {movie.cast.join(' • ')}</Text>
          : null}
        {movie.addedByCount > 0
          ? <Text style={styles.cardAdded}>👥 {movie.addedByCount} kişi CineMatch'te izledi</Text>
          : null}
        {movie.overview
          ? <Text style={styles.cardOverview} numberOfLines={4}>{movie.overview}</Text>
          : null}
      </View>
    </Animated.View>
  );
}

export default function SimilarMoviesScreen({ navigation }) {
  const [movies, setMovies] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/movies/suggestions')
      .then((r) => setMovies(r.data.movies || r.data))
      .catch(() => Alert.alert('Hata', 'Filmler yüklenemedi'))
      .finally(() => setLoading(false));
  }, []);

  const current = movies[index];
  const next = movies[index + 1];

  const handleSwipeRight = async () => {
    // Daha sonra izle listesine ekle
    const m = movies[index];
    setSaving(true);
    try {
      await api.post('/movies/watchlist', {
        tmdbId: m.tmdbId,
        title: m.title,
        poster: m.poster,
        year: m.year ? parseInt(m.year) : null,
      });
    } catch (_) {}
    setSaving(false);
    setIndex((i) => i + 1);
  };

  const handleSwipeLeft = () => {
    setIndex((i) => i + 1);
  };

  const handleBtnRight = () => handleSwipeRight();
  const handleBtnLeft = () => handleSwipeLeft();

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color="#E50914" size="large" />
      <Text style={styles.loadingText}>Senin için filmler hazırlanıyor...</Text>
    </View>
  );

  if (!current) return (
    <View style={styles.center}>
      <Text style={styles.doneEmoji}>🎬</Text>
      <Text style={styles.doneTitle}>Hepsi bu kadar!</Text>
      <Text style={styles.doneSubtitle}>Şimdilik gösterecek film kalmadı.</Text>
      <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.doneBtnText}>Geri Dön</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sana Özel</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Watchlist')} style={styles.watchlistBtn}>
          <Text style={styles.watchlistBtnText}>📋 Liste</Text>
        </TouchableOpacity>
      </View>

      {/* Kart yığını */}
      <View style={styles.deckArea}>
        {/* Alttaki kart (sabit, hafif küçük) */}
        {next && (
          <View style={[styles.card, styles.cardBehind]}>
            <Image source={{ uri: next.backdrop || next.poster }} style={styles.cardBg} resizeMode="cover" />
            <View style={styles.cardGradient} />
          </View>
        )}
        {/* Üstteki kart (swipe edilebilir) */}
        <SwipeCard
          key={index}
          movie={current}
          isTop={true}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
        />
      </View>

      {/* Detay butonu */}
      <TouchableOpacity
        style={styles.detailBtn}
        onPress={() => navigation.navigate('MovieDetail', { tmdbId: current.tmdbId, title: current.title })}
      >
        <Text style={styles.detailBtnText}>Detayları Gör</Text>
      </TouchableOpacity>

      {/* Aksiyon butonları */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnNope} onPress={handleBtnLeft}>
          <Text style={styles.btnNopeText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.hint}>
          <Text style={styles.hintText}>← Geç   İzle →</Text>
        </View>
        <TouchableOpacity style={[styles.btnLike, saving && { opacity: 0.5 }]} onPress={handleBtnRight} disabled={saving}>
          <Text style={styles.btnLikeText}>♥</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  loadingText: { color: '#555', fontSize: 14, marginTop: 8 },
  doneEmoji: { fontSize: 56, marginBottom: 4 },
  doneTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  doneSubtitle: { color: '#555', fontSize: 14, textAlign: 'center' },
  doneBtn: { marginTop: 16, backgroundColor: '#E50914', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 54, paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn: { padding: 8 },
  backBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  watchlistBtn: {
    backgroundColor: '#1c1c1c', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#333',
  },
  watchlistBtnText: { color: '#ccc', fontSize: 13, fontWeight: '600' },

  deckArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  card: {
    position: 'absolute',
    width: CARD_W,
    height: CARD_H,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1c1c1c',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  cardBehind: {
    position: 'absolute',
    transform: [{ scale: 0.95 }, { translateY: 14 }],
    opacity: 0.6,
  },
  cardBg: { position: 'absolute', width: '100%', height: '100%' },
  cardGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '100%',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },

  badge: {
    position: 'absolute', top: 48, borderWidth: 3, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  badgeLike: { right: 24, borderColor: '#E50914', transform: [{ rotate: '12deg' }] },
  badgeNope: { left: 24, borderColor: '#555', transform: [{ rotate: '-12deg' }] },
  badgeTextLike: { color: '#E50914', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  badgeTextNope: { color: '#555', fontSize: 22, fontWeight: '900', letterSpacing: 2 },

  cardContent: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.72)',
    gap: 5,
  },
  cardTitle: { color: '#fff', fontSize: 22, fontWeight: '800', lineHeight: 28 },
  cardMeta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  metaChip: {
    backgroundColor: '#2a2a2a', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    color: '#aaa', fontSize: 12, fontWeight: '600',
  },
  metaChipImdb: {
    backgroundColor: '#2a1f00', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    color: '#FFD700', fontSize: 12, fontWeight: '700',
  },
  metaChipCm: {
    backgroundColor: '#2a0a0e', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    color: '#E50914', fontSize: 12, fontWeight: '700',
  },
  cardDirector: { color: '#ccc', fontSize: 12 },
  cardCast: { color: '#aaa', fontSize: 12 },
  cardAdded: { color: '#888', fontSize: 11 },
  cardOverview: { color: '#bbb', fontSize: 13, lineHeight: 19, marginTop: 4 },

  detailBtn: {
    alignSelf: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  detailBtnText: { color: '#ccc', fontSize: 13, fontWeight: '600' },

  actions: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 20, paddingBottom: 36, paddingHorizontal: 32,
  },
  btnNope: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#1c1c1c', borderWidth: 2, borderColor: '#444',
    justifyContent: 'center', alignItems: 'center',
  },
  btnNopeText: { color: '#666', fontSize: 26, fontWeight: '700' },
  hint: { flex: 1, alignItems: 'center' },
  hintText: { color: '#333', fontSize: 11 },
  btnLike: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#E50914', borderWidth: 2, borderColor: '#E50914',
    justifyContent: 'center', alignItems: 'center',
  },
  btnLikeText: { color: '#fff', fontSize: 26, fontWeight: '700' },
});
