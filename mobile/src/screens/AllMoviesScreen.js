import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity,
  ActivityIndicator, StyleSheet, Animated, Dimensions,
} from 'react-native';
import api from '../services/api';
import { Colors, Radii } from '../theme';

const NUM_COLS = 4;
const SCREEN_W = Dimensions.get('window').width;
const GAP = 8;
const PADDING = 12;
const CARD_W = Math.floor((SCREEN_W - PADDING * 2 - GAP * (NUM_COLS - 1)) / NUM_COLS);
const CARD_H = Math.floor(CARD_W * 1.55); // poster oranı

const T = {
  bg: '#0d0d14',
  bgCard: '#13131f',
  bgElevated: '#1a1a2e',
  accent: '#6c5ce7',
  gold: '#f0b429',
  textPrimary: '#ffffff',
  textSecondary: '#8888aa',
  textMuted: '#444466',
  border: '#1e1e30',
};

function MovieCard({ item, onPress, onAdd, isAdded }) {
  const [added, setAdded] = useState(false);
  const isDone = isAdded || added;
  const scale = React.useRef(new Animated.Value(1)).current;

  const handleAdd = async () => {
    if (isDone) return;
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.3, useNativeDriver: true, speed: 50, bounciness: 12 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }),
    ]).start();
    try { await onAdd(item); } catch {}
    setAdded(true);
  };

  const rating = item.rating || item.cinematchRating;
  const iscinematch = !item.rating && item.cinematchRating;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.78} onPress={() => onPress(item)}>
      {/* Poster */}
      {item.poster
        ? <Image source={{ uri: item.poster }} style={styles.cardPoster} />
        : <View style={[styles.cardPoster, { justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ fontSize: 22 }}>🎬</Text>
          </View>
      }

      {/* Rating rozeti — sağ üst */}
      {rating ? (
        <View style={[styles.ratingBadge, iscinematch && styles.ratingBadgeCinematch]}>
          <Text style={styles.ratingText}>{iscinematch ? '❤' : '⭐'} {rating}</Text>
        </View>
      ) : null}

      {/* + / ✓ butonu — sol üst */}
      <Animated.View style={[styles.addBadge, isDone && styles.addBadgeDone, { transform: [{ scale }] }]}>
        <TouchableOpacity onPress={handleAdd} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Text style={styles.addBadgeText}>{isDone ? '✓' : '+'}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Alt bilgi */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        {item.year ? <Text style={styles.cardYear}>{item.year}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

export default function AllMoviesScreen({ route, navigation }) {
  const { endpoint, title, emoji } = route.params;
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [myMovieIds, setMyMovieIds] = useState(new Set());
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);

  useEffect(() => {
    navigation.setOptions({
      title: `${emoji}  ${title}`,
      headerStyle: {
        backgroundColor: T.bg,
        shadowColor: 'transparent',
        elevation: 0,
        borderBottomWidth: 0.5,
        borderBottomColor: T.border,
      },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: '800', fontSize: 16 },
    });
  }, [navigation, title, emoji]);

  // İlk yükleme: sayfa 1 + kendi filmlerim
  useEffect(() => {
    Promise.all([
      api.get(endpoint, { params: { page: 1 } }),
      api.get('/movies/my'),
    ])
      .then(([moviesRes, myRes]) => {
        const data = moviesRes.data?.movies || moviesRes.data || [];
        hasMoreRef.current = moviesRes.data?.hasMore ?? true;
        setMovies(data);
        const ids = new Set((myRes.data || []).map((m) => m.tmdbId));
        setMyMovieIds(ids);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [endpoint]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMoreRef.current) return;
    setLoadingMore(true);
    const nextPage = pageRef.current + 1;
    try {
      const res = await api.get(endpoint, { params: { page: nextPage } });
      const newMovies = res.data?.movies || res.data || [];
      hasMoreRef.current = res.data?.hasMore ?? newMovies.length >= 20;
      if (newMovies.length > 0) {
        pageRef.current = nextPage;
        setMovies((prev) => {
          const existingIds = new Set(prev.map((m) => m.tmdbId));
          const unique = newMovies.filter((m) => !existingIds.has(m.tmdbId));
          return [...prev, ...unique];
        });
      }
    } catch {}
    finally { setLoadingMore(false); }
  }, [endpoint, loadingMore]);

  const addMovie = async (movie) => {
    await api.post('/movies/add', {
      tmdbId: movie.tmdbId,
      title: movie.title,
      poster: movie.poster,
      year: movie.year,
    });
    setMyMovieIds((prev) => new Set([...prev, movie.tmdbId]));
  };

  const goDetail = (item) => navigation.navigate('MovieDetail', {
    tmdbId: item.tmdbId,
    title: item.title,
    poster: item.poster,
    year: item.year,
  });

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={T.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={movies}
        keyExtractor={(item) => item.tmdbId?.toString()}
        numColumns={NUM_COLS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: PADDING }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => (
          <MovieCard
            item={item}
            onPress={goDetail}
            onAdd={addMovie}
            isAdded={myMovieIds.has(item.tmdbId)}
          />
        )}
        ListFooterComponent={
          loadingMore
            ? <ActivityIndicator color={T.accent} size="small" style={{ marginVertical: 20 }} />
            : null
        }
        ListEmptyComponent={<Text style={styles.empty}>Film bulunamadı</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  // grid satırı arası boşluk
  row: { gap: GAP, marginBottom: GAP },

  // kart
  card: {
    width: CARD_W,
    backgroundColor: T.bgCard,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: T.border,
  },
  cardPoster: {
    width: CARD_W,
    height: CARD_H,
    backgroundColor: T.bgElevated,
  },
  cardInfo: {
    paddingHorizontal: 5,
    paddingTop: 5,
    paddingBottom: 7,
    gap: 2,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: T.textPrimary,
    lineHeight: 13,
  },
  cardYear: {
    fontSize: 9,
    color: T.textMuted,
    fontWeight: '500',
  },

  // rating rozeti — sağ üst köşe
  ratingBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  ratingBadgeCinematch: { backgroundColor: 'rgba(108,92,231,0.82)' },
  ratingText: { fontSize: 9, color: '#fff', fontWeight: '700' },

  // + butonu — sol üst köşe
  addBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: T.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  addBadgeDone: { backgroundColor: '#16a34a' },
  addBadgeText: { color: '#fff', fontSize: 14, lineHeight: 16, fontWeight: '800' },

  empty: { color: T.textMuted, textAlign: 'center', marginTop: 40, fontSize: 14 },
});
