import React, { useState, useCallback, useLayoutEffect, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, FlatList, TextInput, TouchableOpacity,
  Image, StyleSheet, ActivityIndicator, Alert, Pressable, Animated,
} from 'react-native';
import api from '../services/api';
import { Colors, Radii } from '../theme';

function Poster({ uri, width = 110, height = 160 }) {
  if (uri) {
    return <Image source={{ uri }} style={{ width, height, borderRadius: 10, backgroundColor: Colors.bgCard }} />;
  }
  return (
    <View style={{ width, height, borderRadius: 10, backgroundColor: Colors.bgElevated, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 28 }}>🎬</Text>
    </View>
  );
}

function SectionHeader({ emoji, title, accent, onViewAll }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <View style={[styles.sectionAccent, { backgroundColor: accent }]} />
        <Text style={styles.sectionEmoji}>{emoji}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <TouchableOpacity onPress={onViewAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.sectionViewAll}>Tümü ›</Text>
      </TouchableOpacity>
    </View>
  );
}

function MovieCard({ item, onPress, onAdd, showCinematch, isAdded }) {
  const scale = useRef(new Animated.Value(1)).current;
  const addScale = useRef(new Animated.Value(1)).current;
  const [added, setAdded] = useState(false);

  const isDone = isAdded || added;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start();
  };

  const handleAdd = () => {
    if (isDone) return;
    Animated.sequence([
      Animated.spring(addScale, { toValue: 1.4, useNativeDriver: true, speed: 50, bounciness: 10 }),
      Animated.spring(addScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }),
    ]).start();
    onAdd(item)
      .then(() => {
        setAdded(true);
        onPress({ ...item, showRatingPrompt: true });
      })
      .catch(() => {});
  };

  return (
    <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onPress(item)}
      >
        <View style={styles.cardPosterWrap}>
          <Poster uri={item.poster} width={115} height={165} />
          <View style={styles.cardOverlay} />
          {showCinematch && item.cinematchRating ? (
            <View style={styles.cinematchBadge}>
              <Text style={styles.cinematchBadgeText}>❤ {item.cinematchRating}</Text>
            </View>
          ) : item.rating ? (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingBadgeText}>⭐ {item.rating}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
      </TouchableOpacity>
      <Animated.View style={[styles.addFab, isDone && styles.addFabDone, { transform: [{ scale: addScale }] }]}>
        <TouchableOpacity onPress={handleAdd} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.addFabText}>{isDone ? '✓' : '+'}</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

function Section({ emoji, title, accent, data, loading, onPress, onAdd, showCinematch, myMovieIds, endpoint, navigation }) {
  const handleViewAll = () => {
    navigation.navigate('AllMovies', { endpoint, title, emoji, showCinematch });
  };

  if (loading) {
    return (
      <View style={styles.section}>
        <SectionHeader emoji={emoji} title={title} accent={accent} onViewAll={handleViewAll} />
        <View style={styles.skeletonRow}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.skeletonCard} />
          ))}
        </View>
      </View>
    );
  }
  if (!data || data.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionHeader emoji={emoji} title={title} accent={accent} onViewAll={handleViewAll} />
      <FlatList
        data={data}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.tmdbId?.toString()}
        contentContainerStyle={{ paddingLeft: 16, paddingRight: 8 }}
        renderItem={({ item }) => (
          <MovieCard item={item} onPress={onPress} onAdd={onAdd} showCinematch={showCinematch} isAdded={myMovieIds?.has(item.tmdbId)} />
        )}
      />
    </View>
  );
}

function SearchResultRow({ item, onDetail, onAdd, isAdded }) {
  const [added, setAdded] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  const isDone = isAdded || added;

  const handleAdd = async () => {
    if (isDone) return;
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.35, useNativeDriver: true, speed: 50, bounciness: 10 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }),
    ]).start();
    try { await onAdd(item); } catch {}
    setAdded(true);
  };

  return (
    <View style={styles.resultRow}>
      <TouchableOpacity onPress={() => onDetail(item)}>
        <Image source={{ uri: item.poster }} style={{ width: 40, height: 58, borderRadius: 8, backgroundColor: Colors.bgCard }} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.resultInfo} onPress={() => onDetail(item)}>
        <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
        {item.year ? <Text style={styles.resultYear}>{item.year}</Text> : null}
      </TouchableOpacity>
      <Animated.View style={[styles.addBtn, isDone && styles.addBtnDone, { transform: [{ scale }] }]}>
        <TouchableOpacity onPress={handleAdd} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.addBtnText}>{isDone ? '✓' : '+'}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export default function DiscoverScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const [myMovieIds, setMyMovieIds] = useState(new Set());

  const [trending, setTrending] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [classics, setClassics] = useState([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [loadingTopRated, setLoadingTopRated] = useState(true);
  const [loadingClassics, setLoadingClassics] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity style={styles.headerActionBtn} onPress={() => navigation.navigate('Watchlist')}>
          <Text style={styles.headerActionIcon}>📋</Text>
          <Text style={styles.headerActionText}>Sonra İzle</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    api.get('/movies/my')
      .then((r) => {
        const ids = new Set((r.data || []).map((m) => m.tmdbId));
        setMyMovieIds(ids);
      })
      .catch(() => {});

    api.get('/movies/trending')
      .then((r) => setTrending(r.data?.movies || r.data || []))
      .catch(() => {})
      .finally(() => setLoadingTrending(false));

    api.get('/movies/suggestions')
      .then((r) => setSuggestions((r.data?.movies || r.data || []).slice(0, 15)))
      .catch(() => {})
      .finally(() => setLoadingSuggestions(false));

    api.get('/movies/top-rated-cinematch')
      .then((r) => setTopRated(r.data?.movies || r.data || []))
      .catch(() => {})
      .finally(() => setLoadingTopRated(false));

    api.get('/movies/classics')
      .then((r) => setClassics(r.data?.movies || r.data || []))
      .catch(() => {})
      .finally(() => setLoadingClassics(false));
  }, []);

  const searchMovies = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await api.get(`/movies/search?query=${encodeURIComponent(query)}`);
      setSearchResults(res.data);
    } catch {
      Alert.alert('Hata', 'Arama başarısız');
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSearchResults([]);
  };

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
    showRatingPrompt: item.showRatingPrompt || false,
  });

  const showSearch = query.length > 0 || searchResults.length > 0 || searching;

  return (
    <View style={styles.container}>
      {/* Search bar — her zaman üstte */}
      <View style={[styles.searchRow, searchFocused && styles.searchRowFocused]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Film ara ve profiline ekle..."
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={searchMovies}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
        <Pressable style={styles.searchBtn} onPress={searchMovies}>
          <Text style={styles.searchBtnText}>Ara</Text>
        </Pressable>
      </View>

      {/* Arama sonuçları */}
      {showSearch ? (
        <View style={styles.resultsBox}>
          {searching ? (
            <ActivityIndicator color={Colors.red} style={{ padding: 16 }} />
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.tmdbId.toString()}
              style={{ maxHeight: 260 }}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.resultSep} />}
              ListEmptyComponent={
                query.length > 0 && !searching ? (
                  <Text style={styles.noResult}>Sonuç bulunamadı</Text>
                ) : null
              }
              renderItem={({ item }) => <SearchResultRow item={item} onDetail={goDetail} onAdd={addMovie} isAdded={myMovieIds.has(item.tmdbId)} />}
            />
          )}
        </View>
      ) : (
        /* Kategoriler */
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          <Section
            emoji="✨"
            title="Sana Özel"
            accent={Colors.red}
            data={suggestions}
            loading={loadingSuggestions}
            onPress={goDetail}
            onAdd={addMovie}
            myMovieIds={myMovieIds}
            endpoint="/movies/suggestions"
            navigation={navigation}
          />
          <Section
            emoji="🔥"
            title="Haftanın En Popülerleri"
            accent="#f97316"
            data={trending}
            loading={loadingTrending}
            onPress={goDetail}
            onAdd={addMovie}
            myMovieIds={myMovieIds}
            endpoint="/movies/trending"
            navigation={navigation}
          />
          <Section
            emoji="❤️"
            title="CinemaMatch En Yüksek Puanlılar"
            accent="#e11d48"
            data={topRated}
            loading={loadingTopRated}
            onPress={goDetail}
            onAdd={addMovie}
            showCinematch
            myMovieIds={myMovieIds}
            endpoint="/movies/top-rated-cinematch"
            navigation={navigation}
          />
          <Section
            emoji="🎞️"
            title="Klasikler"
            accent="#6366f1"
            data={classics}
            loading={loadingClassics}
            onPress={goDetail}
            onAdd={addMovie}
            myMovieIds={myMovieIds}
            endpoint="/movies/classics"
            navigation={navigation}
          />
        </ScrollView>
      )}
    </View>
  );
}

// Fotoğraf temasından alınan token'lar
const T = {
  bg: '#0d0d14',
  bgCard: '#13131f',
  bgElevated: '#1a1a2e',
  bgInput: 'rgba(255,255,255,0.04)',
  accent: '#6c5ce7',
  accentDim: 'rgba(108,92,231,0.15)',
  accentBorder: 'rgba(108,92,231,0.4)',
  accentSecondary: '#a29bfe',
  gold: '#f0b429',
  textPrimary: '#ffffff',
  textSecondary: '#8888aa',
  textMuted: '#444466',
  border: '#1e1e30',
  borderLight: '#2a2a40',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  headerActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginRight: 16, backgroundColor: T.accentDim,
    borderRadius: Radii.pill, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: T.accentBorder,
  },
  headerActionIcon: { fontSize: 13 },
  headerActionText: { color: T.accentSecondary, fontSize: 12, fontWeight: '700' },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12, marginBottom: 12,
    backgroundColor: T.bgInput, borderRadius: Radii.md,
    borderWidth: 1, borderColor: T.border,
    paddingLeft: 12, paddingRight: 6, paddingVertical: 4,
  },
  searchRowFocused: { borderColor: T.accent, backgroundColor: T.accentDim },
  searchIcon: { fontSize: 14, color: T.textMuted },
  searchInput: { flex: 1, color: T.textPrimary, fontSize: 14, paddingVertical: 10 },
  clearBtn: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: T.bgElevated, justifyContent: 'center', alignItems: 'center',
  },
  clearBtnText: { fontSize: 10, color: T.textSecondary },
  searchBtn: {
    backgroundColor: T.accent, borderRadius: Radii.md - 2,
    paddingHorizontal: 14, paddingVertical: 8,
    shadowColor: T.accent, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  resultsBox: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: T.bgCard, borderRadius: Radii.lg,
    borderWidth: 1, borderColor: T.border, overflow: 'hidden',
  },
  resultRow: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10 },
  resultInfo: { flex: 1 },
  resultTitle: { fontSize: 13, fontWeight: '600', color: T.textPrimary },
  resultYear: { fontSize: 11, color: T.textMuted, marginTop: 2 },
  resultSep: { height: 0.5, backgroundColor: T.border, marginHorizontal: 10 },
  addBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: T.accent, justifyContent: 'center', alignItems: 'center',
  },
  addBtnDone: {
    backgroundColor: '#16a34a',
  },
  addBtnText: { color: '#fff', fontSize: 20, lineHeight: 22, fontWeight: '700' },
  noResult: { color: T.textMuted, fontSize: 13, textAlign: 'center', padding: 20 },

  section: { marginTop: 24 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 12, paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionAccent: { width: 3, height: 18, borderRadius: 2 },
  sectionEmoji: { fontSize: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: T.textPrimary, letterSpacing: -0.3 },
  sectionViewAll: { fontSize: 12, color: T.accentSecondary, fontWeight: '600' },

  card: { width: 115, marginRight: 10, position: 'relative' },
  cardPosterWrap: {
    borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: T.border,
  },
  cardOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 60, borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
    backgroundColor: 'rgba(13,13,20,0.55)',
  },
  cardTitle: {
    color: T.textSecondary, fontSize: 11, fontWeight: '600',
    marginTop: 7, lineHeight: 15,
  },
  ratingBadge: {
    position: 'absolute', top: 7, left: 7,
    backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 6,
    paddingHorizontal: 5, paddingVertical: 2,
    flexDirection: 'row', alignItems: 'center', gap: 2,
  },
  ratingBadgeText: { color: T.gold, fontSize: 10, fontWeight: '700' },
  cinematchBadge: {
    position: 'absolute', top: 7, left: 7,
    backgroundColor: 'rgba(108,92,231,0.85)', borderRadius: 6,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  cinematchBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  addFab: {
    position: 'absolute', top: 7, right: 7,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: T.accent, justifyContent: 'center', alignItems: 'center',
    shadowColor: T.accent, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 6, elevation: 5,
  },
  addFabDone: { backgroundColor: '#16a34a' },
  addFabText: { color: '#fff', fontSize: 16, lineHeight: 18, fontWeight: '700' },

  skeletonRow: { flexDirection: 'row', paddingLeft: 16, gap: 10 },
  skeletonCard: { width: 115, height: 165, borderRadius: 12, backgroundColor: T.bgElevated },
});
