import React, { useState, useLayoutEffect, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, ScrollView, FlatList, TextInput, TouchableOpacity,
  Image, StyleSheet, ActivityIndicator, Alert, Pressable, Animated,
  Dimensions,
} from 'react-native';
import api from '../services/api';
import { Colors, Radii } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_W = 170;
const CARD_GAP = 14;
const SNAP_W = CARD_W + CARD_GAP;

const T = {
  bg: '#050506',
  bgSoft: '#0B0B10',
  glass: 'rgba(255,255,255,0.075)',
  glassStrong: 'rgba(255,255,255,0.11)',
  border: 'rgba(255,255,255,0.12)',
  borderSoft: 'rgba(255,255,255,0.07)',
  red: '#ff3b55',
  redSoft: 'rgba(255,59,85,0.18)',
  purple: '#9b5cff',
  purpleSoft: 'rgba(155,92,255,0.17)',
  gold: '#f8c84a',
  text: '#ffffff',
  textSoft: '#b9b8c7',
  textMuted: '#737286',
  success: '#27c46b',
};

function Poster({ uri, width = 112, height = 168, radius = 22 }) {
  if (uri) {
    return <Image source={{ uri }} style={{ width, height, borderRadius: radius, backgroundColor: T.bgSoft }} />;
  }
  return (
    <View style={{ width, height, borderRadius: radius, backgroundColor: T.glass, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: T.border }}>
      <Text style={{ fontSize: 30 }}>🎬</Text>
    </View>
  );
}

function SectionHeader({ emoji, title, onViewAll }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <View style={styles.sectionIcon}><Text style={styles.sectionEmoji}>{emoji}</Text></View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <TouchableOpacity onPress={onViewAll} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.sectionViewAll}>Tümü ›</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Featured Carousel ────────────────────────────────────────────────────────────────
function FeaturedCarousel({ data, onPress, onAdd, myMovieIds }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef(null);

  if (!data || data.length === 0) return null;

  const snapOffsets = data.map((_, i) => i * SNAP_W);

  const handleScroll = (e) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / SNAP_W);
    setActiveIdx(Math.max(0, Math.min(idx, data.length - 1)));
  };

  return (
    <View style={{ marginTop: 28 }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToOffsets={snapOffsets}
        snapToAlignment="start"
        contentContainerStyle={{ paddingLeft: 20, paddingRight: SCREEN_WIDTH - CARD_W - 20, gap: CARD_GAP }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {data.map((item, index) => (
          <FeaturedCard
            key={item.tmdbId?.toString() || index}
            item={item}
            isActive={index === activeIdx}
            onPress={onPress}
            onAdd={onAdd}
            isAdded={myMovieIds?.has(item.tmdbId)}
          />
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {data.map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIdx && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

function FeaturedCard({ item, isActive, onPress, onAdd, isAdded }) {
  const scaleAnim = useRef(new Animated.Value(isActive ? 1 : 0.88)).current;
  const addScale = useRef(new Animated.Value(1)).current;
  const [added, setAdded] = useState(false);
  const isDone = isAdded || added;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isActive ? 1 : 0.88,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  }, [isActive]);

  const handleAdd = () => {
    if (isDone) return;
    Animated.sequence([
      Animated.spring(addScale, { toValue: 1.35, useNativeDriver: true, speed: 50, bounciness: 10 }),
      Animated.spring(addScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }),
    ]).start();
    onAdd(item)
      .then(() => { setAdded(true); onPress({ ...item, showRatingPrompt: true }); })
      .catch(() => {});
  };

  const cardH = isActive ? 260 : 220;

  return (
    <Animated.View style={[styles.featuredCard, { width: CARD_W, transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity activeOpacity={0.92} onPress={() => onPress(item)}>
        <View style={[styles.featuredPosterWrap, isActive && styles.featuredPosterWrapActive, { height: cardH }]}>
          <Poster uri={item.poster} width={CARD_W} height={cardH} radius={20} />
          <View style={styles.posterDarkGradient} />
          {item.rating ? (
            <View style={styles.imdbBadge}>
              <Text style={styles.imdbMini}>IMDb</Text>
              <Text style={styles.imdbText}>{item.rating}</Text>
            </View>
          ) : null}
          <View style={styles.matchBadge}>
            <Text style={styles.matchBadgeText}>
              {item.cinematchRating ? `${item.cinematchRating}% match` : '92% match'}
            </Text>
          </View>
          <Animated.View style={[styles.featuredAdd, isDone && styles.addDone, { transform: [{ scale: addScale }] }]}>
            <TouchableOpacity onPress={handleAdd}>
              <Text style={styles.featuredAddText}>{isDone ? '✓' : '+'}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
        <Text style={styles.featuredSmallTitle} numberOfLines={1}>{item.title}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Movie Card ────────────────────────────────────────────────────────────────
function MovieCard({ item, onPress, onAdd, showCinematch, isAdded }) {
  const scale = useRef(new Animated.Value(1)).current;
  const addScale = useRef(new Animated.Value(1)).current;
  const [added, setAdded] = useState(false);
  const isDone = isAdded || added;

  const handleAdd = () => {
    if (isDone) return;
    Animated.sequence([
      Animated.spring(addScale, { toValue: 1.35, useNativeDriver: true, speed: 50, bounciness: 10 }),
      Animated.spring(addScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }),
    ]).start();
    onAdd(item)
      .then(() => { setAdded(true); onPress({ ...item, showRatingPrompt: true }); })
      .catch(() => {});
  };

  return (
    <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => onPress(item)}
        onPressIn={() => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
      >
        <View style={styles.cardPosterWrap}>
          <Poster uri={item.poster} width={122} height={178} radius={18} />
          <View style={styles.posterDarkGradient} />
          {showCinematch && item.cinematchRating ? (
            <View style={styles.percentBadge}><Text style={styles.percentBadgeText}>❤ {item.cinematchRating}</Text></View>
          ) : item.rating ? (
            <View style={styles.ratingBadge}><Text style={styles.ratingBadgeText}>★ {item.rating}</Text></View>
          ) : null}
          <Animated.View style={[styles.addFab, isDone && styles.addDone, { transform: [{ scale: addScale }] }]}>
            <TouchableOpacity onPress={handleAdd}>
              <Text style={styles.addFabText}>{isDone ? '✓' : '+'}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Mood Pills ────────────────────────────────────────────────────────────────
const MOODS = [
  { key: 'mind_bending', icon: '◎', label: 'Mind Bending', color: T.purple, softColor: T.purpleSoft, borderColor: 'rgba(155,92,255,0.28)', sectionTitle: '🌀 Mind Bending Picks', sectionEmoji: '🌀' },
  { key: 'emotional',    icon: '♡', label: 'Emotional',    color: T.red,    softColor: T.redSoft,    borderColor: 'rgba(255,59,85,0.28)',   sectionTitle: '💔 Emotional Picks',    sectionEmoji: '💔' },
  { key: 'dark',         icon: '☠', label: 'Dark',         color: '#aaa',   softColor: 'rgba(150,150,150,0.13)', borderColor: 'rgba(200,200,200,0.18)', sectionTitle: '🌑 Dark Picks for Tonight', sectionEmoji: '🌑' },
  { key: 'feel_good',    icon: '☺', label: 'Feel Good',    color: T.gold,   softColor: 'rgba(248,200,74,0.14)',  borderColor: 'rgba(248,200,74,0.28)', sectionTitle: '☀️ Feel Good Films',    sectionEmoji: '☀️' },
  { key: 'thrilling',    icon: '⌁', label: 'Thrilling',    color: T.red,    softColor: T.redSoft,    borderColor: 'rgba(255,59,85,0.28)',   sectionTitle: '⚡ Thrilling Picks',    sectionEmoji: '⚡' },
];

function MoodPills({ activeMood, onSelect }) {
  return (
    <View style={styles.moodSection}>
      <SectionHeader emoji="🌙" title="Tonight's Mood" onViewAll={() => {}} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moodList}>
        {MOODS.map((mood) => {
          const isActive = activeMood === mood.key;
          return (
            <TouchableOpacity
              key={mood.key}
              onPress={() => onSelect(isActive ? null : mood.key)}
              style={[
                styles.moodPill,
                { backgroundColor: isActive ? mood.softColor : 'rgba(255,255,255,0.08)', borderColor: isActive ? mood.borderColor : T.border },
              ]}
              activeOpacity={0.75}
            >
              <Text style={[styles.moodIcon, { color: isActive ? mood.color : T.purple }]}>{mood.icon}</Text>
              <Text style={[styles.moodText, { color: isActive ? mood.color : T.text }]}>{mood.label}</Text>
              {isActive && <View style={[styles.moodDot, { backgroundColor: mood.color }]} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ── Section ──────────────────────────────────────────────────────────────────────────
function Section({ emoji, title, data, loading, onPress, onAdd, showCinematch, myMovieIds, endpoint, navigation }) {
  const handleViewAll = () => navigation.navigate('AllMovies', { endpoint, title, emoji, showCinematch });
  if (loading) {
    return (
      <View style={styles.section}>
        <SectionHeader emoji={emoji} title={title} onViewAll={handleViewAll} />
        <View style={styles.skeletonRow}>{[1, 2, 3].map((i) => <View key={i} style={styles.skeletonCard} />)}</View>
      </View>
    );
  }
  if (!data || data.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionHeader emoji={emoji} title={title} onViewAll={handleViewAll} />
      <FlatList
        data={data}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.tmdbId?.toString()}
        contentContainerStyle={{ paddingLeft: 24, paddingRight: 16 }}
        renderItem={({ item }) => (
          <MovieCard item={item} onPress={onPress} onAdd={onAdd} showCinematch={showCinematch} isAdded={myMovieIds?.has(item.tmdbId)} />
        )}
      />
    </View>
  );
}

// ── Search Result Row ───────────────────────────────────────────────────────────────
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
    setAdded(true);
    onDetail({ ...item, showRatingPrompt: true });
    try { await onAdd(item); } catch { setAdded(false); }
  };
  return (
    <View style={styles.resultRow}>
      <TouchableOpacity onPress={() => onDetail(item)}>
        {item.poster
          ? <Image source={{ uri: item.poster }} style={styles.resultPoster} />
          : <View style={[styles.resultPoster, { backgroundColor: T.bgSoft, justifyContent: 'center', alignItems: 'center' }]}><Text>🎬</Text></View>
        }
      </TouchableOpacity>
      <TouchableOpacity style={styles.resultInfo} onPress={() => onDetail(item)}>
        <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.resultMeta}>
          {item.year ? <Text style={styles.resultYear}>{item.year}</Text> : null}
          {item.rating ? <Text style={styles.resultRating}>★ {item.rating}</Text> : null}
        </View>
      </TouchableOpacity>
      <Animated.View style={[styles.resultAdd, isDone && styles.addDone, { transform: [{ scale }] }]}>
        <TouchableOpacity onPress={handleAdd}><Text style={styles.resultAddText}>{isDone ? '✓' : '+'}</Text></TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
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
  const [activeMood, setActiveMood] = useState(null);
  const [moodMovies, setMoodMovies] = useState([]);
  const [loadingMood, setLoadingMood] = useState(false);
  const moodAnim = useRef(new Animated.Value(0)).current;

  useLayoutEffect(() => { navigation.setOptions({ headerShown: false }); }, [navigation]);

  // Her focus'ta myMovieIds refresh — MovieDetail'den dönünce tik güncellenir
  useFocusEffect(useCallback(() => {
    api.get('/movies/my')
      .then((r) => setMyMovieIds(new Set((r.data || []).map((m) => m.tmdbId))))
      .catch(() => {});
  }, []));

  useEffect(() => {
    api.get('/movies/trending').then((r) => setTrending(r.data?.movies || r.data || [])).catch(() => {}).finally(() => setLoadingTrending(false));
    api.get('/movies/suggestions').then((r) => setSuggestions((r.data?.movies || r.data || []).slice(0, 15))).catch(() => {}).finally(() => setLoadingSuggestions(false));
    api.get('/movies/top-rated-cinematch').then((r) => setTopRated(r.data?.movies || r.data || [])).catch(() => {}).finally(() => setLoadingTopRated(false));
    api.get('/movies/classics').then((r) => setClassics(r.data?.movies || r.data || [])).catch(() => {}).finally(() => setLoadingClassics(false));
  }, []);

  const searchMovies = async (overrideQuery) => {
    const q = (overrideQuery ?? query).trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await api.get(`/movies/search?query=${encodeURIComponent(q)}`);
      setSearchResults(res.data);
    } catch { Alert.alert('Hata', 'Arama başarısız'); }
    finally { setSearching(false); }
  };

  const handleQueryChange = (text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(() => searchMovies(text), 400);
  };

  const clearSearch = () => {
    setQuery(''); setSearchResults([]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };

  const handleMoodSelect = async (moodKey) => {
    if (!moodKey) {
      setActiveMood(null);
      setMoodMovies([]);
      Animated.timing(moodAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
      return;
    }
    setActiveMood(moodKey);
    setLoadingMood(true);
    moodAnim.setValue(0);
    try {
      const res = await api.get(`/movies/mood?mood=${moodKey}`);
      setMoodMovies(res.data?.movies || res.data || []);
      Animated.spring(moodAnim, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 5 }).start();
    } catch { setMoodMovies([]); }
    finally { setLoadingMood(false); }
  };

  const addMovie = async (movie) => {
    await api.post('/movies/add', { tmdbId: movie.tmdbId, title: movie.title, poster: movie.poster, year: movie.year });
    setMyMovieIds((prev) => new Set([...prev, movie.tmdbId]));
  };

  const goDetail = (item) => navigation.navigate('MovieDetail', {
    tmdbId: item.tmdbId, title: item.title, poster: item.poster, year: item.year,
    showRatingPrompt: item.showRatingPrompt || false,
    forceIsAdded: item.showRatingPrompt || false,
  });

  const showSearch = searchResults.length > 0 || searching;
  const featured = suggestions.length >= 3 ? suggestions.slice(0, 8) : trending.slice(0, 8);

  return (
    <View style={styles.container}>
      <View style={styles.redGlow} />
      <View style={styles.purpleGlow} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroRow}>
            <Text style={styles.heroTitle}>Discover</Text>
            <View style={styles.heroActions}>
              <TouchableOpacity style={styles.watchlistButton} onPress={() => navigation.navigate('Watchlist')}>
                <Text style={styles.watchlistIcon}>🔖</Text>
                <Text style={styles.watchlistText}>My Watchlist</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.avatarButton} onPress={() => navigation.navigate('MyProfile')}>
                <Text style={styles.avatarText}>A</Text>
                <View style={styles.avatarDot} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.heroSubtitle} numberOfLines={1}>Find your next <Text style={styles.heroSubtitleAccent}>obsession</Text></Text>
        </View>

        {/* Search */}
        <View style={[styles.searchRow, searchFocused && styles.searchRowFocused]}>
          <Text style={styles.searchIcon}>⎕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search films, actors, lists..."
            placeholderTextColor={T.textMuted}
            value={query}
            onChangeText={handleQueryChange}
            onSubmitEditing={searchMovies}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={clearSearch} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>×</Text>
            </TouchableOpacity>
          ) : null}
          <Pressable style={styles.filterBtn} onPress={searchMovies}>
            <Text style={styles.filterText}>☷</Text>
          </Pressable>
        </View>

        {/* Featured */}
        <FeaturedCarousel data={featured} onPress={goDetail} onAdd={addMovie} myMovieIds={myMovieIds} />

        <Section emoji="✦" title="Because you liked Interstellar" data={suggestions} loading={loadingSuggestions} onPress={goDetail} onAdd={addMovie} myMovieIds={myMovieIds} endpoint="/movies/suggestions" navigation={navigation} />

        <MoodPills activeMood={activeMood} onSelect={handleMoodSelect} />

        {/* Mood Section */}
        {(activeMood || loadingMood) ? (() => {
          const mood = MOODS.find((m) => m.key === activeMood);
          return (
            <Animated.View style={{
              opacity: moodAnim,
              transform: [{ translateY: moodAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
            }}>
              <Section
                emoji={mood?.sectionEmoji || '🌙'}
                title={mood?.sectionTitle || 'Mood Picks'}
                data={moodMovies}
                loading={loadingMood}
                onPress={goDetail}
                onAdd={addMovie}
                myMovieIds={myMovieIds}
                endpoint={`/movies/mood?mood=${activeMood}`}
                navigation={navigation}
              />
            </Animated.View>
          );
        })() : null}

        <Section emoji="🔥" title="Most Matched This Week" data={trending} loading={loadingTrending} onPress={goDetail} onAdd={addMovie} myMovieIds={myMovieIds} endpoint="/movies/trending" navigation={navigation} />
        <Section emoji="❤" title="CinemaMatch En Yüksek Puanlılar" data={topRated} loading={loadingTopRated} onPress={goDetail} onAdd={addMovie} showCinematch myMovieIds={myMovieIds} endpoint="/movies/top-rated-cinematch" navigation={navigation} />
        <Section emoji="◇" title="Hidden Gems" data={classics} loading={loadingClassics} onPress={goDetail} onAdd={addMovie} myMovieIds={myMovieIds} endpoint="/movies/classics" navigation={navigation} />
      </ScrollView>

      {showSearch && (
        <View style={styles.resultsOverlay}>
          <View style={styles.resultsBox}>
            {searching ? (
              <ActivityIndicator color={T.red} style={{ padding: 18 }} />
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.tmdbId.toString()}
                style={{ maxHeight: 300 }}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.resultSep} />}
                ListEmptyComponent={query.length > 0 && !searching ? <Text style={styles.noResult}>Sonuç bulunamadı</Text> : null}
                renderItem={({ item }) => <SearchResultRow item={item} onDetail={goDetail} onAdd={addMovie} isAdded={myMovieIds.has(item.tmdbId)} />}
              />
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  redGlow: { position: 'absolute', top: -120, left: -100, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(255,59,85,0.22)' },
  purpleGlow: { position: 'absolute', top: 190, right: -140, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(155,92,255,0.13)' },

  hero: { paddingTop: 56, paddingHorizontal: 24, paddingBottom: 20 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTitle: { color: T.text, fontSize: 38, fontWeight: '900', letterSpacing: -2, flex: 1 },
  heroSubtitle: { color: T.textSoft, fontSize: 15, marginTop: 3, letterSpacing: -0.3 },
  heroSubtitleAccent: { color: T.red },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
  watchlistButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,59,85,0.08)', borderWidth: 1, borderColor: 'rgba(255,59,85,0.55)', shadowColor: T.red, shadowOpacity: 0.3, shadowRadius: 14, elevation: 8 },
  watchlistIcon: { color: T.red, fontSize: 16, fontWeight: '800' },
  watchlistText: { color: T.text, fontSize: 12, fontWeight: '800' },
  avatarButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: T.red, backgroundColor: T.glass, justifyContent: 'center', alignItems: 'center', shadowColor: T.red, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8, flexShrink: 0 },
  avatarText: { color: T.text, fontSize: 15, fontWeight: '900' },
  avatarDot: { position: 'absolute', right: -1, top: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: T.red },

  searchRow: { marginHorizontal: 24, height: 66, borderRadius: 28, backgroundColor: T.glass, borderWidth: 1, borderColor: T.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 12 },
  searchRowFocused: { borderColor: 'rgba(255,59,85,0.42)', backgroundColor: T.glassStrong },
  searchIcon: { color: T.text, fontSize: 34, lineHeight: 36, opacity: 0.95 },
  searchInput: { flex: 1, color: T.text, fontSize: 16, paddingVertical: 12 },
  clearBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.11)', justifyContent: 'center', alignItems: 'center' },
  clearBtnText: { color: T.textSoft, fontSize: 18, lineHeight: 20 },
  filterBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  filterText: { color: T.textSoft, fontSize: 24, lineHeight: 26 },

  featuredCard: { position: 'relative' },
  featuredPosterWrap: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: T.border, backgroundColor: T.bgSoft },
  featuredPosterWrapActive: { borderColor: 'rgba(255,59,85,0.5)', shadowColor: T.red, shadowOpacity: 0.4, shadowRadius: 24, elevation: 16 },
  posterDarkGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 92, backgroundColor: 'rgba(0,0,0,0.3)' },
  imdbBadge: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.72)' },
  imdbMini: { color: '#121212', backgroundColor: T.gold, fontSize: 8, fontWeight: '900', paddingHorizontal: 3, borderRadius: 2 },
  imdbText: { color: T.text, fontSize: 12, fontWeight: '800' },
  matchBadge: { position: 'absolute', top: 14, right: 12 },
  matchBadgeText: { color: T.red, fontSize: 13, fontWeight: '900' },
  featuredAdd: { position: 'absolute', right: 14, bottom: 14, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.34)', justifyContent: 'center', alignItems: 'center' },
  featuredAddText: { color: T.text, fontSize: 30, lineHeight: 32, fontWeight: '300' },
  featuredSmallTitle: { color: T.textSoft, fontSize: 12, marginTop: 8, paddingHorizontal: 2, fontWeight: '600' },

  dots: { marginTop: 16, alignSelf: 'center', flexDirection: 'row', gap: 9 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.22)' },
  dotActive: { width: 20, height: 8, borderRadius: 4, backgroundColor: T.red },

  section: { marginTop: 34 },
  sectionHeader: { paddingHorizontal: 24, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon: { width: 27, height: 27, borderRadius: 14, backgroundColor: T.purpleSoft, justifyContent: 'center', alignItems: 'center' },
  sectionEmoji: { fontSize: 15 },
  sectionTitle: { color: T.text, fontSize: 18, fontWeight: '900', letterSpacing: -0.6 },
  sectionViewAll: { color: '#b58cff', fontSize: 14, fontWeight: '800' },

  card: { width: 122, marginRight: 16 },
  cardPosterWrap: { width: 122, height: 178, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: T.borderSoft, backgroundColor: T.bgSoft },
  cardTitle: { color: T.textSoft, fontSize: 12, fontWeight: '700', marginTop: 8, lineHeight: 16 },
  ratingBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 },
  ratingBadgeText: { color: T.gold, fontSize: 11, fontWeight: '900' },
  percentBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: T.purpleSoft, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 },
  percentBadgeText: { color: '#b58cff', fontSize: 11, fontWeight: '900' },
  addFab: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: T.purple, justifyContent: 'center', alignItems: 'center', shadowColor: T.purple, shadowOpacity: 0.6, shadowRadius: 12, elevation: 8 },
  addFabText: { color: T.text, fontSize: 20, lineHeight: 21, fontWeight: '700' },
  addDone: { backgroundColor: T.success, shadowColor: T.success },

  moodSection: { marginTop: 34 },
  moodList: { paddingHorizontal: 24, gap: 12 },
  moodPill: { height: 42, paddingHorizontal: 17, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: T.border, flexDirection: 'row', alignItems: 'center', gap: 8 },
  moodIcon: { fontSize: 16, fontWeight: '800' },
  moodText: { fontSize: 13, fontWeight: '800' },
  moodDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 2 },

  skeletonRow: { flexDirection: 'row', paddingLeft: 24, gap: 16 },
  skeletonCard: { width: 122, height: 178, borderRadius: 18, backgroundColor: T.glass, borderWidth: 1, borderColor: T.borderSoft },

  resultsOverlay: { position: 'absolute', top: 150, left: 0, right: 0, zIndex: 20 },
  resultsBox: { marginHorizontal: 24, backgroundColor: 'rgba(13,13,18,0.96)', borderRadius: 24, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
  resultRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  resultPoster: { width: 44, height: 64, borderRadius: 11, backgroundColor: T.bgSoft },
  resultInfo: { flex: 1 },
  resultTitle: { color: T.text, fontSize: 14, fontWeight: '800' },
  resultMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  resultYear: { color: T.textMuted, fontSize: 12, fontWeight: '600' },
  resultRating: { color: T.gold, fontSize: 12, fontWeight: '800' },
  resultSep: { height: 1, backgroundColor: T.borderSoft, marginHorizontal: 12 },
  resultAdd: { width: 34, height: 34, borderRadius: 17, backgroundColor: T.purple, justifyContent: 'center', alignItems: 'center' },
  resultAddText: { color: T.text, fontSize: 23, lineHeight: 25, fontWeight: '700' },
  noResult: { color: T.textMuted, fontSize: 14, textAlign: 'center', padding: 22, fontWeight: '700' },
});

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_W = 170;
const CARD_GAP = 14;
const SNAP_W = CARD_W + CARD_GAP;

const T = {
  bg: '#050506',
  bgSoft: '#0B0B10',
  glass: 'rgba(255,255,255,0.075)',
  glassStrong: 'rgba(255,255,255,0.11)',
  border: 'rgba(255,255,255,0.12)',
  borderSoft: 'rgba(255,255,255,0.07)',
  red: '#ff3b55',
  redSoft: 'rgba(255,59,85,0.18)',
  purple: '#9b5cff',
  purpleSoft: 'rgba(155,92,255,0.17)',
  gold: '#f8c84a',
  text: '#ffffff',
  textSoft: '#b9b8c7',
  textMuted: '#737286',
  success: '#27c46b',
};

function Poster({ uri, width = 112, height = 168, radius = 22 }) {
  if (uri) {
    return <Image source={{ uri }} style={{ width, height, borderRadius: radius, backgroundColor: T.bgSoft }} />;
  }
  return (
    <View style={{ width, height, borderRadius: radius, backgroundColor: T.glass, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: T.border }}>
      <Text style={{ fontSize: 30 }}>🎬</Text>
    </View>
  );
}

function SectionHeader({ emoji, title, onViewAll }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <View style={styles.sectionIcon}><Text style={styles.sectionEmoji}>{emoji}</Text></View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <TouchableOpacity onPress={onViewAll} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.sectionViewAll}>Tümü ›</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Featured Carousel ─────────────────────────────────────────────────────────
function FeaturedCarousel({ data, onPress, onAdd, myMovieIds }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef(null);

  if (!data || data.length === 0) return null;

  const snapOffsets = data.map((_, i) => i * SNAP_W);

  const handleScroll = (e) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / SNAP_W);
    setActiveIdx(Math.max(0, Math.min(idx, data.length - 1)));
  };

  return (
    <View style={{ marginTop: 28 }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToOffsets={snapOffsets}
        snapToAlignment="start"
        contentContainerStyle={{ paddingLeft: 20, paddingRight: SCREEN_WIDTH - CARD_W - 20, gap: CARD_GAP }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {data.map((item, index) => (
          <FeaturedCard
            key={item.tmdbId?.toString() || index}
            item={item}
            isActive={index === activeIdx}
            onPress={onPress}
            onAdd={onAdd}
            isAdded={myMovieIds?.has(item.tmdbId)}
          />
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {data.map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIdx && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

function FeaturedCard({ item, isActive, onPress, onAdd, isAdded }) {
  const scaleAnim = useRef(new Animated.Value(isActive ? 1 : 0.88)).current;
  const addScale = useRef(new Animated.Value(1)).current;
  const [added, setAdded] = useState(false);
  const isDone = isAdded || added;

<<<<<<< HEAD
=======
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isActive ? 1 : 0.88,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  }, [isActive]);

>>>>>>> 1138403 (keşfet front değiştirildi)
  const handleAdd = () => {
    if (isDone) return;
    Animated.sequence([
      Animated.spring(addScale, { toValue: 1.35, useNativeDriver: true, speed: 50, bounciness: 10 }),
      Animated.spring(addScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }),
    ]).start();
<<<<<<< HEAD
    onAdd(item).then(() => { setAdded(true); onPress({ ...item, showRatingPrompt: true }); }).catch(() => {});
=======
    onAdd(item)
      .then(() => { setAdded(true); onPress({ ...item, showRatingPrompt: true }); })
      .catch(() => {});
  };

  const cardH = isActive ? 260 : 220;

  return (
    <Animated.View style={[styles.featuredCard, { width: CARD_W, transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity activeOpacity={0.92} onPress={() => onPress(item)}>
        <View style={[styles.featuredPosterWrap, isActive && styles.featuredPosterWrapActive, { height: cardH }]}>
          <Poster uri={item.poster} width={CARD_W} height={cardH} radius={20} />
          <View style={styles.posterDarkGradient} />
          {item.rating ? (
            <View style={styles.imdbBadge}>
              <Text style={styles.imdbMini}>IMDb</Text>
              <Text style={styles.imdbText}>{item.rating}</Text>
            </View>
          ) : null}
          <View style={styles.matchBadge}>
            <Text style={styles.matchBadgeText}>
              {item.cinematchRating ? `${item.cinematchRating}% match` : '92% match'}
            </Text>
          </View>
          <Animated.View style={[styles.featuredAdd, isDone && styles.addDone, { transform: [{ scale: addScale }] }]}>
            <TouchableOpacity onPress={handleAdd}>
              <Text style={styles.featuredAddText}>{isDone ? '✓' : '+'}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
        <Text style={styles.featuredSmallTitle} numberOfLines={1}>{item.title}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Movie Card ────────────────────────────────────────────────────────────────
function MovieCard({ item, onPress, onAdd, showCinematch, isAdded }) {
  const scale = useRef(new Animated.Value(1)).current;
  const addScale = useRef(new Animated.Value(1)).current;
  const [added, setAdded] = useState(false);
  const isDone = isAdded || added;

  const handleAdd = () => {
    if (isDone) return;
    Animated.sequence([
      Animated.spring(addScale, { toValue: 1.35, useNativeDriver: true, speed: 50, bounciness: 10 }),
      Animated.spring(addScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }),
    ]).start();
    onAdd(item)
      .then(() => { setAdded(true); onPress({ ...item, showRatingPrompt: true }); })
      .catch(() => {});
>>>>>>> 1138403 (keşfet front değiştirildi)
  };

  return (
    <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
      <TouchableOpacity
<<<<<<< HEAD
        activeOpacity={1}
        onPressIn={() => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 50, bounciness: 4 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start()}
=======
        activeOpacity={0.92}
>>>>>>> 1138403 (keşfet front değiştirildi)
        onPress={() => onPress(item)}
        onPressIn={() => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
      >
        <View style={styles.cardPosterWrap}>
<<<<<<< HEAD
          {item.poster
            ? <Image source={{ uri: item.poster }} style={styles.cardImage} />
            : <View style={[styles.cardImage, styles.cardImageFallback]}><Text style={{ fontSize: 28 }}>🎬</Text></View>
          }
          {showCinematch && item.cinematchRating ? (
            <View style={styles.cinematchBadge}><Text style={styles.cinematchBadgeText}>❤ {item.cinematchRating}</Text></View>
          ) : item.rating ? (
            <View style={styles.ratingBadge}><Text style={styles.ratingBadgeText}>⭐ {item.rating}</Text></View>
=======
          <Poster uri={item.poster} width={122} height={178} radius={18} />
          <View style={styles.posterDarkGradient} />
          {showCinematch && item.cinematchRating ? (
            <View style={styles.percentBadge}><Text style={styles.percentBadgeText}>❤ {item.cinematchRating}</Text></View>
          ) : item.rating ? (
            <View style={styles.ratingBadge}><Text style={styles.ratingBadgeText}>★ {item.rating}</Text></View>
>>>>>>> 1138403 (keşfet front değiştirildi)
          ) : null}
          <Animated.View style={[styles.addFab, isDone && styles.addDone, { transform: [{ scale: addScale }] }]}>
            <TouchableOpacity onPress={handleAdd}>
              <Text style={styles.addFabText}>{isDone ? '✓' : '+'}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

<<<<<<< HEAD
function Section({ emoji, title, accent, data, loading, onPress, onAdd, showCinematch, myMovieIds, endpoint, navigation }) {
  if (loading) {
    return (
      <View style={styles.section}>
        <SectionHeader emoji={emoji} title={title} accent={accent} onViewAll={() => {}} />
        <View style={styles.skeletonRow}>
          {[1, 2, 3].map((i) => <View key={i} style={styles.skeletonCard} />)}
        </View>
=======
// ── Mood Pills ────────────────────────────────────────────────────────────────
function MoodPills() {
  const moods = [['◎', 'Mind Bending'], ['♡', 'Emotional'], ['☠', 'Dark'], ['☺', 'Feel Good'], ['⌁', 'Thrilling']];
  return (
    <View style={styles.moodSection}>
      <SectionHeader emoji="🌙" title="Tonight's Mood" onViewAll={() => {}} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moodList}>
        {moods.map(([icon, label], index) => (
          <View key={label} style={[styles.moodPill, index === 1 && styles.moodPillRed, index === 4 && styles.moodPillPurple]}>
            <Text style={styles.moodIcon}>{icon}</Text>
            <Text style={styles.moodText}>{label}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section({ emoji, title, data, loading, onPress, onAdd, showCinematch, myMovieIds, endpoint, navigation }) {
  const handleViewAll = () => navigation.navigate('AllMovies', { endpoint, title, emoji, showCinematch });
  if (loading) {
    return (
      <View style={styles.section}>
        <SectionHeader emoji={emoji} title={title} onViewAll={handleViewAll} />
        <View style={styles.skeletonRow}>{[1, 2, 3].map((i) => <View key={i} style={styles.skeletonCard} />)}</View>
>>>>>>> 1138403 (keşfet front değiştirildi)
      </View>
    );
  }
  if (!data || data.length === 0) return null;
  return (
    <View style={styles.section}>
<<<<<<< HEAD
      <SectionHeader
        emoji={emoji} title={title} accent={accent}
        onViewAll={() => navigation.navigate('AllMovies', { endpoint, title, emoji, showCinematch })}
      />
=======
      <SectionHeader emoji={emoji} title={title} onViewAll={handleViewAll} />
>>>>>>> 1138403 (keşfet front değiştirildi)
      <FlatList
        data={data} horizontal showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.tmdbId?.toString()}
        contentContainerStyle={{ paddingLeft: 24, paddingRight: 16 }}
        renderItem={({ item }) => (
          <MovieCard item={item} onPress={onPress} onAdd={onAdd} showCinematch={showCinematch} isAdded={myMovieIds?.has(item.tmdbId)} />
        )}
      />
    </View>
  );
}

// ── Search Result Row ─────────────────────────────────────────────────────────
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
    setAdded(true);
    onDetail({ ...item, showRatingPrompt: true });
    try { await onAdd(item); } catch { setAdded(false); }
  };
  return (
    <View style={styles.resultRow}>
      <TouchableOpacity onPress={() => onDetail(item)}>
<<<<<<< HEAD
        {item.poster
          ? <Image source={{ uri: item.poster }} style={styles.resultPoster} />
          : <View style={[styles.resultPoster, { backgroundColor: T.bgElevated, justifyContent: 'center', alignItems: 'center' }]}><Text>🎬</Text></View>
        }
=======
        <Image source={{ uri: item.poster }} style={styles.resultPoster} />
>>>>>>> 1138403 (keşfet front değiştirildi)
      </TouchableOpacity>
      <TouchableOpacity style={styles.resultInfo} onPress={() => onDetail(item)}>
        <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.resultMeta}>
          {item.year ? <Text style={styles.resultYear}>{item.year}</Text> : null}
          {item.rating ? <Text style={styles.resultRating}>★ {item.rating}</Text> : null}
        </View>
      </TouchableOpacity>
      <Animated.View style={[styles.resultAdd, isDone && styles.addDone, { transform: [{ scale }] }]}>
        <TouchableOpacity onPress={handleAdd}><Text style={styles.resultAddText}>{isDone ? '✓' : '+'}</Text></TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
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
  const [activeMood, setActiveMood] = useState(null);
  const [moodMovies, setMoodMovies] = useState([]);
  const [loadingMood, setLoadingMood] = useState(false);
  const moodAnim = useRef(new Animated.Value(0)).current;

<<<<<<< HEAD
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
=======
  useLayoutEffect(() => { navigation.setOptions({ headerShown: false }); }, [navigation]);

  useEffect(() => {
    api.get('/movies/my').then((r) => setMyMovieIds(new Set((r.data || []).map((m) => m.tmdbId)))).catch(() => {});
    api.get('/movies/trending').then((r) => setTrending(r.data?.movies || r.data || [])).catch(() => {}).finally(() => setLoadingTrending(false));
    api.get('/movies/suggestions').then((r) => setSuggestions((r.data?.movies || r.data || []).slice(0, 15))).catch(() => {}).finally(() => setLoadingSuggestions(false));
    api.get('/movies/top-rated-cinematch').then((r) => setTopRated(r.data?.movies || r.data || [])).catch(() => {}).finally(() => setLoadingTopRated(false));
    api.get('/movies/classics').then((r) => setClassics(r.data?.movies || r.data || [])).catch(() => {}).finally(() => setLoadingClassics(false));
  }, []);

  const searchMovies = async (overrideQuery) => {
    const q = (overrideQuery ?? query).trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await api.get(`/movies/search?query=${encodeURIComponent(q)}`);
      setSearchResults(res.data);
    } catch { Alert.alert('Hata', 'Arama başarısız'); }
    finally { setSearching(false); }
  };

  const handleQueryChange = (text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(() => searchMovies(text), 400);
  };

  const clearSearch = () => {
    setQuery(''); setSearchResults([]);
>>>>>>> 1138403 (keşfet front değiştirildi)
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };

  const handleMoodSelect = async (moodKey) => {
    if (!moodKey) {
      setActiveMood(null);
      setMoodMovies([]);
      Animated.timing(moodAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
      return;
    }
    setActiveMood(moodKey);
    setLoadingMood(true);
    moodAnim.setValue(0);
    try {
      const res = await api.get(`/movies/mood?mood=${moodKey}`);
      setMoodMovies(res.data?.movies || res.data || []);
      Animated.spring(moodAnim, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 5 }).start();
    } catch { setMoodMovies([]); }
    finally { setLoadingMood(false); }
  };

  const addMovie = async (movie) => {
    await api.post('/movies/add', { tmdbId: movie.tmdbId, title: movie.title, poster: movie.poster, year: movie.year });
    setMyMovieIds((prev) => new Set([...prev, movie.tmdbId]));
  };

  const goDetail = (item) => navigation.navigate('MovieDetail', {
    tmdbId: item.tmdbId, title: item.title, poster: item.poster, year: item.year,
    showRatingPrompt: item.showRatingPrompt || false,
    forceIsAdded: item.showRatingPrompt || false,
  });

<<<<<<< HEAD
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
=======
  const showSearch = searchResults.length > 0 || searching;
  const featured = suggestions.length >= 3 ? suggestions.slice(0, 8) : trending.slice(0, 8);

  return (
    <View style={styles.container}>
      <View style={styles.redGlow} />
      <View style={styles.purpleGlow} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroRow}>
            <Text style={styles.heroTitle}>Discover</Text>
            <View style={styles.heroActions}>
              <TouchableOpacity style={styles.watchlistButton} onPress={() => navigation.navigate('Watchlist')}>
                <Text style={styles.watchlistIcon}>🔖</Text>
                <Text style={styles.watchlistText}>My Watchlist</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.avatarButton} onPress={() => navigation.navigate('MyProfile')}>
                <Text style={styles.avatarText}>A</Text>
                <View style={styles.avatarDot} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.heroSubtitle} numberOfLines={1}>Find your next <Text style={styles.heroSubtitleAccent}>obsession</Text></Text>
        </View>

        {/* Search */}
        <View style={[styles.searchRow, searchFocused && styles.searchRowFocused]}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search films, actors, lists..."
            placeholderTextColor={T.textMuted}
            value={query}
            onChangeText={handleQueryChange}
            onSubmitEditing={searchMovies}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={clearSearch} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>×</Text>
            </TouchableOpacity>
          ) : null}
          <Pressable style={styles.filterBtn} onPress={searchMovies}>
            <Text style={styles.filterText}>☷</Text>
          </Pressable>
        </View>

        {/* Featured */}
        <FeaturedCarousel data={featured} onPress={goDetail} onAdd={addMovie} myMovieIds={myMovieIds} />

        <Section emoji="✦" title="Because you liked Interstellar" data={suggestions} loading={loadingSuggestions} onPress={goDetail} onAdd={addMovie} myMovieIds={myMovieIds} endpoint="/movies/suggestions" navigation={navigation} />
        <MoodPills activeMood={activeMood} onSelect={handleMoodSelect} />

        {/* Mood Section */}
        {(activeMood || loadingMood) ? (() => {
          const mood = MOODS.find((m) => m.key === activeMood);
          return (
            <Animated.View style={{
              opacity: moodAnim,
              transform: [{ translateY: moodAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
            }}>
              <Section
                emoji={mood?.sectionEmoji || '🌙'}
                title={mood?.sectionTitle || 'Mood Picks'}
                data={moodMovies}
                loading={loadingMood}
                onPress={goDetail}
                onAdd={addMovie}
                myMovieIds={myMovieIds}
                endpoint={`/movies/mood?mood=${activeMood}`}
                navigation={navigation}
              />
            </Animated.View>
          );
        })() : null}
        <Section emoji="🔥" title="Most Matched This Week" data={trending} loading={loadingTrending} onPress={goDetail} onAdd={addMovie} myMovieIds={myMovieIds} endpoint="/movies/trending" navigation={navigation} />
        <Section emoji="❤" title="CinemaMatch En Yüksek Puanlılar" data={topRated} loading={loadingTopRated} onPress={goDetail} onAdd={addMovie} showCinematch myMovieIds={myMovieIds} endpoint="/movies/top-rated-cinematch" navigation={navigation} />
        <Section emoji="◇" title="Hidden Gems" data={classics} loading={loadingClassics} onPress={goDetail} onAdd={addMovie} myMovieIds={myMovieIds} endpoint="/movies/classics" navigation={navigation} />
      </ScrollView>

      {showSearch && (
        <View style={styles.resultsOverlay}>
          <View style={styles.resultsBox}>
            {searching ? (
              <ActivityIndicator color={T.red} style={{ padding: 18 }} />
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.tmdbId.toString()}
                style={{ maxHeight: 300 }}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.resultSep} />}
                ListEmptyComponent={query.length > 0 && !searching ? <Text style={styles.noResult}>Sonuç bulunamadı</Text> : null}
                renderItem={({ item }) => <SearchResultRow item={item} onDetail={goDetail} onAdd={addMovie} isAdded={myMovieIds.has(item.tmdbId)} />}
              />
            )}
          </View>
        </View>
>>>>>>> 1138403 (keşfet front değiştirildi)
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
<<<<<<< HEAD
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
=======
  redGlow: { position: 'absolute', top: -120, left: -100, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(255,59,85,0.22)' },
  purpleGlow: { position: 'absolute', top: 190, right: -140, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(155,92,255,0.13)' },

  hero: { paddingTop: 56, paddingHorizontal: 24, paddingBottom: 20 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTitle: { color: T.text, fontSize: 38, fontWeight: '900', letterSpacing: -2, flex: 1 },
  heroSubtitle: { color: T.textSoft, fontSize: 15, marginTop: 3, letterSpacing: -0.3 },
  heroSubtitleAccent: { color: T.red },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
  watchlistButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,59,85,0.08)', borderWidth: 1, borderColor: 'rgba(255,59,85,0.55)', shadowColor: T.red, shadowOpacity: 0.3, shadowRadius: 14, elevation: 8 },
  watchlistIcon: { color: T.red, fontSize: 16, fontWeight: '800' },
  watchlistText: { color: T.text, fontSize: 12, fontWeight: '800' },
  avatarButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: T.red, backgroundColor: T.glass, justifyContent: 'center', alignItems: 'center', shadowColor: T.red, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8, flexShrink: 0 },
  avatarText: { color: T.text, fontSize: 15, fontWeight: '900' },
  avatarDot: { position: 'absolute', right: -1, top: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: T.red },

  searchRow: { marginHorizontal: 24, height: 66, borderRadius: 28, backgroundColor: T.glass, borderWidth: 1, borderColor: T.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 12 },
  searchRowFocused: { borderColor: 'rgba(255,59,85,0.42)', backgroundColor: T.glassStrong },
  searchIcon: { color: T.text, fontSize: 34, lineHeight: 36, opacity: 0.95 },
  searchInput: { flex: 1, color: T.text, fontSize: 16, paddingVertical: 12 },
  clearBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.11)', justifyContent: 'center', alignItems: 'center' },
  clearBtnText: { color: T.textSoft, fontSize: 18, lineHeight: 20 },
  filterBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  filterText: { color: T.textSoft, fontSize: 24, lineHeight: 26 },

  // Featured - tüm kartlar aynı genişlikte, aktif kart scale ile büyüyor
  featuredCard: { position: 'relative' },
  featuredPosterWrap: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: T.border, backgroundColor: T.bgSoft },
  featuredPosterWrapActive: { borderColor: 'rgba(255,59,85,0.5)', shadowColor: T.red, shadowOpacity: 0.4, shadowRadius: 24, elevation: 16 },
  posterDarkGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 92, backgroundColor: 'rgba(0,0,0,0.3)' },
  imdbBadge: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.72)' },
  imdbMini: { color: '#121212', backgroundColor: T.gold, fontSize: 8, fontWeight: '900', paddingHorizontal: 3, borderRadius: 2 },
  imdbText: { color: T.text, fontSize: 12, fontWeight: '800' },
  matchBadge: { position: 'absolute', top: 14, right: 12 },
  matchBadgeText: { color: T.red, fontSize: 13, fontWeight: '900' },
  featuredAdd: { position: 'absolute', right: 14, bottom: 14, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.34)', justifyContent: 'center', alignItems: 'center' },
  featuredAddText: { color: T.text, fontSize: 30, lineHeight: 32, fontWeight: '300' },
  featuredSmallTitle: { color: T.textSoft, fontSize: 12, marginTop: 8, paddingHorizontal: 2, fontWeight: '600' },

  dots: { marginTop: 16, alignSelf: 'center', flexDirection: 'row', gap: 9 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.22)' },
  dotActive: { width: 20, height: 8, borderRadius: 4, backgroundColor: T.red },

  section: { marginTop: 34 },
  sectionHeader: { paddingHorizontal: 24, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon: { width: 27, height: 27, borderRadius: 14, backgroundColor: T.purpleSoft, justifyContent: 'center', alignItems: 'center' },
  sectionEmoji: { fontSize: 15 },
  sectionTitle: { color: T.text, fontSize: 18, fontWeight: '900', letterSpacing: -0.6 },
  sectionViewAll: { color: '#b58cff', fontSize: 14, fontWeight: '800' },

  card: { width: 122, marginRight: 16 },
  cardPosterWrap: { width: 122, height: 178, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: T.borderSoft, backgroundColor: T.bgSoft },
  cardTitle: { color: T.textSoft, fontSize: 12, fontWeight: '700', marginTop: 8, lineHeight: 16 },
  ratingBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 },
  ratingBadgeText: { color: T.gold, fontSize: 11, fontWeight: '900' },
  percentBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: T.purpleSoft, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 },
  percentBadgeText: { color: '#b58cff', fontSize: 11, fontWeight: '900' },
  addFab: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: T.purple, justifyContent: 'center', alignItems: 'center', shadowColor: T.purple, shadowOpacity: 0.6, shadowRadius: 12, elevation: 8 },
  addFabText: { color: T.text, fontSize: 20, lineHeight: 21, fontWeight: '700' },
  addDone: { backgroundColor: T.success, shadowColor: T.success },

  moodSection: { marginTop: 34 },
  moodList: { paddingHorizontal: 24, gap: 12 },
  moodPill: { height: 42, paddingHorizontal: 17, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: T.border, flexDirection: 'row', alignItems: 'center', gap: 8 },
  moodPillRed: { backgroundColor: T.redSoft, borderColor: 'rgba(255,59,85,0.28)' },
  moodPillPurple: { backgroundColor: T.purpleSoft, borderColor: 'rgba(155,92,255,0.28)' },
  moodIcon: { fontSize: 16, fontWeight: '800' },
  moodText: { fontSize: 13, fontWeight: '800' },
  moodDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 2 },

  skeletonRow: { flexDirection: 'row', paddingLeft: 24, gap: 16 },
  skeletonCard: { width: 122, height: 178, borderRadius: 18, backgroundColor: T.glass, borderWidth: 1, borderColor: T.borderSoft },

  resultsOverlay: { position: 'absolute', top: 150, left: 0, right: 0, zIndex: 20 },
  resultsBox: { marginHorizontal: 24, backgroundColor: 'rgba(13,13,18,0.96)', borderRadius: 24, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
  resultRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  resultPoster: { width: 44, height: 64, borderRadius: 11, backgroundColor: T.bgSoft },
  resultInfo: { flex: 1 },
  resultTitle: { color: T.text, fontSize: 14, fontWeight: '800' },
  resultMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  resultYear: { color: T.textMuted, fontSize: 12, fontWeight: '600' },
  resultRating: { color: T.gold, fontSize: 12, fontWeight: '800' },
  resultSep: { height: 1, backgroundColor: T.borderSoft, marginHorizontal: 12 },
  resultAdd: { width: 34, height: 34, borderRadius: 17, backgroundColor: T.purple, justifyContent: 'center', alignItems: 'center' },
  resultAddText: { color: T.text, fontSize: 23, lineHeight: 25, fontWeight: '700' },
  noResult: { color: T.textMuted, fontSize: 14, textAlign: 'center', padding: 22, fontWeight: '700' },
>>>>>>> 1138403 (keşfet front değiştirildi)
});
