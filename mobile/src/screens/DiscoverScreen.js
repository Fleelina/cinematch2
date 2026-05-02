import React, { useState, useLayoutEffect, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, ScrollView, FlatList, TextInput, TouchableOpacity,
  Image, StyleSheet, ActivityIndicator, Animated,
} from 'react-native';
import api from '../services/api';
import { Colors, Radii } from '../theme';

const T = {
  bg: '#08080f',
  bgCard: '#0f0f1a',
  bgElevated: '#161624',
  bgInput: 'rgba(255,255,255,0.05)',
  textPrimary: '#ffffff',
  textSecondary: '#8888aa',
  textMuted: '#44445a',
  border: '#1a1a2a',
};

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

  const handleAdd = () => {
    if (isDone) return;
    Animated.sequence([
      Animated.spring(addScale, { toValue: 1.4, useNativeDriver: true, speed: 50, bounciness: 10 }),
      Animated.spring(addScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }),
    ]).start();
    onAdd(item).then(() => { setAdded(true); onPress({ ...item, showRatingPrompt: true }); }).catch(() => {});
  };

  return (
    <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={() => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 50, bounciness: 4 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start()}
        onPress={() => onPress(item)}
      >
        <View style={styles.cardPosterWrap}>
          {item.poster
            ? <Image source={{ uri: item.poster }} style={styles.cardImage} />
            : <View style={[styles.cardImage, styles.cardImageFallback]}><Text style={{ fontSize: 28 }}>🎬</Text></View>
          }
          {showCinematch && item.cinematchRating ? (
            <View style={styles.cinematchBadge}><Text style={styles.cinematchBadgeText}>❤ {item.cinematchRating}</Text></View>
          ) : item.rating ? (
            <View style={styles.ratingBadge}><Text style={styles.ratingBadgeText}>⭐ {item.rating}</Text></View>
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
  if (loading) {
    return (
      <View style={styles.section}>
        <SectionHeader emoji={emoji} title={title} accent={accent} onViewAll={() => {}} />
        <View style={styles.skeletonRow}>
          {[1, 2, 3].map((i) => <View key={i} style={styles.skeletonCard} />)}
        </View>
      </View>
    );
  }
  if (!data || data.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionHeader
        emoji={emoji} title={title} accent={accent}
        onViewAll={() => navigation.navigate('AllMovies', { endpoint, title, emoji, showCinematch })}
      />
      <FlatList
        data={data} horizontal showsHorizontalScrollIndicator={false}
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
        {item.poster
          ? <Image source={{ uri: item.poster }} style={styles.resultPoster} />
          : <View style={[styles.resultPoster, { backgroundColor: T.bgElevated, justifyContent: 'center', alignItems: 'center' }]}><Text>🎬</Text></View>
        }
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
  const debounceRef = useRef(null);

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
          <Text style={styles.headerActionIcon}>⏱</Text>
          <Text style={styles.headerActionText}>Sonra İzle</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // Her focus'ta myMovieIds refresh — MovieDetail'den dönünce tik güncellenir
  useFocusEffect(useCallback(() => {
    api.get('/movies/my')
      .then((r) => setMyMovieIds(new Set((r.data || []).map((m) => m.tmdbId))))
      .catch(() => {});
  }, []));

  useEffect(() => {
    api.get('/movies/trending')
      .then((r) => setTrending(r.data?.movies || r.data || []))
      .catch(() => {}).finally(() => setLoadingTrending(false));
    api.get('/movies/suggestions')
      .then((r) => setSuggestions((r.data?.movies || r.data || []).slice(0, 15)))
      .catch(() => {}).finally(() => setLoadingSuggestions(false));
    api.get('/movies/top-rated-cinematch')
      .then((r) => setTopRated(r.data?.movies || r.data || []))
      .catch(() => {}).finally(() => setLoadingTopRated(false));
    api.get('/movies/classics')
      .then((r) => setClassics(r.data?.movies || r.data || []))
      .catch(() => {}).finally(() => setLoadingClassics(false));
  }, []);

  const handleQueryChange = (text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/movies/search?query=${encodeURIComponent(text.trim())}`);
        setSearchResults(res.data || []);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 300);
  };

  const clearSearch = () => {
    setQuery('');
    setSearchResults([]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };

  const addMovie = async (movie) => {
    await api.post('/movies/add', { tmdbId: movie.tmdbId, title: movie.title, poster: movie.poster, year: movie.year });
    setMyMovieIds((prev) => new Set([...prev, movie.tmdbId]));
  };

  const goDetail = (item) => navigation.navigate('MovieDetail', {
    tmdbId: item.tmdbId, title: item.title, poster: item.poster, year: item.year,
    showRatingPrompt: item.showRatingPrompt || false,
  });

  const showSearch = query.length > 0;

  return (
    <View style={styles.container}>

      {/* ── Search bar — daima mount'ta, remount yok ── */}
      <View style={[styles.searchRow, searchFocused && styles.searchRowFocused]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Film ara ve profiline ekle..."
          placeholderTextColor={T.textMuted}
          value={query}
          onChangeText={handleQueryChange}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Arama sonuçları ── */}
      {showSearch && (
        <FlatList
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          data={searchResults}
          keyExtractor={(item) => item.tmdbId.toString()}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.resultSep} />}
          ListHeaderComponent={searching ? <ActivityIndicator color={Colors.red} style={{ padding: 20 }} /> : null}
          ListEmptyComponent={!searching ? <Text style={styles.noResult}>Sonuç bulunamadı</Text> : null}
          renderItem={({ item }) => (
            <SearchResultRow item={item} onDetail={goDetail} onAdd={addMovie} isAdded={myMovieIds.has(item.tmdbId)} />
          )}
        />
      )}

      {/* ── Kategoriler — search aktifken gizli ama unmount değil ── */}
      <ScrollView
        style={{ display: showSearch ? 'none' : 'flex' }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Section emoji="✨" title="Sana Özel" accent={Colors.red}
          data={suggestions} loading={loadingSuggestions}
          onPress={goDetail} onAdd={addMovie} myMovieIds={myMovieIds}
          endpoint="/movies/suggestions" navigation={navigation}
        />
        <Section emoji="🔥" title="Haftanın En Popülerleri" accent="#f97316"
          data={trending} loading={loadingTrending}
          onPress={goDetail} onAdd={addMovie} myMovieIds={myMovieIds}
          endpoint="/movies/trending" navigation={navigation}
        />
        <Section emoji="❤️" title="CineMatch En Yüksek Puanlılar" accent="#e11d48"
          data={topRated} loading={loadingTopRated}
          onPress={goDetail} onAdd={addMovie} showCinematch myMovieIds={myMovieIds}
          endpoint="/movies/top-rated-cinematch" navigation={navigation}
        />
        <Section emoji="🎞️" title="Klasikler" accent="#6366f1"
          data={classics} loading={loadingClassics}
          onPress={goDetail} onAdd={addMovie} myMovieIds={myMovieIds}
          endpoint="/movies/classics" navigation={navigation}
        />
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  headerActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginRight: 16, backgroundColor: Colors.redDim,
    borderRadius: Radii.pill, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: Colors.redBorder,
  },
  headerActionIcon: { fontSize: 13 },
  headerActionText: { color: Colors.red, fontSize: 12, fontWeight: '700' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12, marginBottom: 8,
    backgroundColor: T.bgInput, borderRadius: Radii.md,
    borderWidth: 1, borderColor: T.border,
    paddingLeft: 12, paddingRight: 8, paddingVertical: 4,
  },
  searchRowFocused: { borderColor: Colors.red, backgroundColor: 'rgba(200,16,46,0.08)' },
  searchIcon: { fontSize: 14, color: T.textMuted },
  searchInput: { flex: 1, color: T.textPrimary, fontSize: 14, paddingVertical: 10 },
  clearBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center',
  },
  clearBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  resultRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  resultPoster: { width: 44, height: 64, borderRadius: 8, backgroundColor: T.bgCard },
  resultInfo: { flex: 1 },
  resultTitle: { fontSize: 14, fontWeight: '600', color: T.textPrimary },
  resultYear: { fontSize: 12, color: T.textMuted, marginTop: 3 },
  resultSep: { height: 0.5, backgroundColor: T.border, marginHorizontal: 12 },
  addBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.red, justifyContent: 'center', alignItems: 'center',
  },
  addBtnDone: { backgroundColor: '#16a34a' },
  addBtnText: { color: '#fff', fontSize: 20, lineHeight: 22, fontWeight: '700' },
  noResult: { color: T.textMuted, fontSize: 13, textAlign: 'center', padding: 40 },
  section: { marginTop: 28 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 14, paddingHorizontal: 16, justifyContent: 'space-between',
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionAccent: { width: 3, height: 18, borderRadius: 2 },
  sectionEmoji: { fontSize: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: T.textPrimary, letterSpacing: -0.3 },
  sectionViewAll: { fontSize: 12, color: Colors.red, fontWeight: '600' },
  card: { width: 120, marginRight: 12, position: 'relative' },
  cardPosterWrap: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: T.border },
  cardImage: { width: 120, height: 175, backgroundColor: T.bgElevated },
  cardImageFallback: { justifyContent: 'center', alignItems: 'center' },
  cardGrad: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 60,
    backgroundColor: 'rgba(8,8,15,0.55)',
    borderBottomLeftRadius: 14, borderBottomRightRadius: 14,
  },
  cardTitle: { color: T.textSecondary, fontSize: 11, fontWeight: '600', marginTop: 8, lineHeight: 15 },
  ratingBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3,
  },
  ratingBadgeText: { color: Colors.gold, fontSize: 10, fontWeight: '700' },
  cinematchBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: 'rgba(200,16,46,0.85)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3,
  },
  cinematchBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  addFab: {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.red, justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.red, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6, shadowRadius: 6, elevation: 5,
  },
  addFabDone: { backgroundColor: '#16a34a' },
  addFabText: { color: '#fff', fontSize: 16, lineHeight: 18, fontWeight: '700' },
  skeletonRow: { flexDirection: 'row', paddingLeft: 16, gap: 12 },
  skeletonCard: { width: 120, height: 175, borderRadius: 14, backgroundColor: T.bgElevated },
});
