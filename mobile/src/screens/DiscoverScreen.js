import React, { useState, useLayoutEffect, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, ScrollView, FlatList, TextInput, TouchableOpacity,
  Image, ImageBackground, StyleSheet, ActivityIndicator, Alert, Animated,
  Dimensions, Keyboard, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';
import { normalizeImageUri } from '../services/imageUri';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useAppDrawer } from '../context/DrawerContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_W = SCREEN_WIDTH * 0.8 * 0.58;
const CARD_GAP = 16;
const SNAP_W = CARD_W + CARD_GAP;
const SIDE_PADDING = (SCREEN_WIDTH - CARD_W) / 2;
const DEFAULT_BACKGROUND = require('../../assets/default-bg.png');

const DEFAULT_T = {
  bg: '#050506',
  bgSoft: '#0B0B10',
  glass: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.10)',
  borderSoft: 'rgba(255,255,255,0.06)',
  red: '#ff3b55',
  purple: '#9b5cff',
  purpleSoft: 'rgba(155,92,255,0.15)',
  gold: '#f8c84a',
  text: '#ffffff',
  textSoft: '#b9b8c7',
  textMuted: '#737286',
  success: '#27c46b',
};

let styles = createStyles(DEFAULT_T);

function Poster({ uri, width = 112, height = 168, radius = 22, T }) {
  if (uri) return <Image source={{ uri }} style={{ width, height, borderRadius: radius, backgroundColor: T.bgSoft }} />;
  return (
    <View style={{ width, height, borderRadius: radius, backgroundColor: T?.glass || 'rgba(255,255,255,0.075)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: T?.border || 'rgba(255,255,255,0.12)' }}>
      <Text style={{ fontSize: 30 }}>🎬</Text>
    </View>
  );
}

function SectionHeader({ emoji, title, onViewAll, hideViewAll }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <View style={styles.sectionIcon}><Text style={styles.sectionEmoji}>{emoji}</Text></View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {!hideViewAll && (
        <TouchableOpacity onPress={onViewAll} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.sectionViewAll}>Tümü ›</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function FeaturedCarousel({ data, onPress, onAdd, myMovieIds, T }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  if (!data || data.length === 0) return null;

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: true,
      listener: (e) => {
        const x = e.nativeEvent.contentOffset.x;
        const idx = Math.round(x / SNAP_W);
        setActiveIdx(Math.max(0, Math.min(idx, data.length - 1)));
      },
    }
  );

  return (
    <View style={{ marginTop: 28 }}>
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_W}
        snapToAlignment="start"
        decelerationRate={0.89}
        contentContainerStyle={{ paddingHorizontal: SIDE_PADDING, gap: CARD_GAP }}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        disableIntervalMomentum={true}
      >
        {data.map((item, index) => {
          const inputRange = [
            (index - 1) * SNAP_W,
            index * SNAP_W,
            (index + 1) * SNAP_W,
          ];
          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.88, 1, 0.88],
            extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.6, 1, 0.6],
            extrapolate: 'clamp',
          });
          return (
            <FeaturedCard
              key={item.tmdbId?.toString() || index}
              item={item}
              isActive={index === activeIdx}
              onPress={onPress}
              onAdd={onAdd}
              isAdded={myMovieIds?.has(item.tmdbId)}
              animScale={scale}
              animOpacity={opacity}
              T={T}
            />
          );
        })}
      </Animated.ScrollView>
      <View style={styles.dots}>
        {data.map((_, i) => <View key={i} style={[styles.dot, i === activeIdx && styles.dotActive]} />)}
      </View>
    </View>
  );
}

function FeaturedCard({ item, isActive, onPress, onAdd, isAdded, animScale, animOpacity, T }) {
  const addScale = useRef(new Animated.Value(1)).current;
  const [added, setAdded] = useState(false);
  const isDone = isAdded || added;

  const handleAdd = () => {
    if (isDone) return;
    Animated.sequence([
      Animated.spring(addScale, { toValue: 1.35, useNativeDriver: true, speed: 50, bounciness: 10 }),
      Animated.spring(addScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }),
    ]).start();
    onAdd(item).then(() => { setAdded(true); onPress({ ...item, showRatingPrompt: true }); }).catch(() => {});
  };

  const cardH = CARD_W * 1.5;
  return (
    <Animated.View style={[styles.featuredCard, { width: CARD_W, transform: [{ scale: animScale || 1 }], opacity: animOpacity || 1 }]}>
      <TouchableOpacity activeOpacity={0.92} onPress={() => onPress(item)}>
        <View style={[styles.featuredPosterWrap, { height: cardH }]}>
          <Poster uri={item.poster} width={CARD_W} height={cardH} radius={20} T={T} />
          <View style={styles.posterDarkGradient} />
          {item.rating ? (
            <View style={styles.imdbBadge}>
              <Text style={styles.imdbMini}>IMDb</Text>
              <Text style={styles.imdbText}>{item.rating}</Text>
            </View>
          ) : null}
          <View style={styles.matchBadge}>
            <Text style={styles.matchBadgeText}>{item.cinematchRating ? `${item.cinematchRating}% match` : '92% match'}</Text>
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

function MovieCard({ item, onPress, onAdd, showCinematch, isAdded, T }) {
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
    onAdd(item).then(() => { setAdded(true); onPress({ ...item, showRatingPrompt: true }); }).catch(() => {});
  };
  return (
    <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
      <TouchableOpacity activeOpacity={0.92} onPress={() => onPress(item)}
        onPressIn={() => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
      >
        <View style={styles.cardPosterWrap}>
          <Poster uri={item.poster} width={122} height={178} radius={18} T={T} />
          <View style={styles.posterDarkGradient} />
          {showCinematch && item.cinematchRating
            ? <View style={styles.percentBadge}><Text style={styles.percentBadgeText}>❤ {item.cinematchRating}</Text></View>
            : item.rating ? <View style={styles.ratingBadge}><Text style={styles.ratingBadgeText}>★ {item.rating}</Text></View> : null
          }
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

const MOODS = [
  { key: 'mind_bending', icon: '◎', label: 'Mind Bending', color: '#9b5cff', softColor: 'rgba(155,92,255,0.17)', borderColor: 'rgba(155,92,255,0.28)', sectionTitle: '🌀 Mind Bending Picks', sectionEmoji: '🌀' },
  { key: 'emotional',    icon: '♡', label: 'Emotional',    color: '#ff3b55', softColor: 'rgba(255,59,85,0.18)',   borderColor: 'rgba(255,59,85,0.28)',  sectionTitle: '💔 Emotional Picks',       sectionEmoji: '💔' },
  { key: 'dark',         icon: '☠', label: 'Dark',         color: '#aaaaaa', softColor: 'rgba(150,150,150,0.13)', borderColor: 'rgba(200,200,200,0.18)', sectionTitle: '🌑 Dark Picks for Tonight', sectionEmoji: '🌑' },
  { key: 'feel_good',    icon: '☺', label: 'Feel Good',    color: '#f8c84a', softColor: 'rgba(248,200,74,0.14)',  borderColor: 'rgba(248,200,74,0.28)', sectionTitle: '☀️ Feel Good Films',       sectionEmoji: '☀️' },
  { key: 'thrilling',    icon: '⌁', label: 'Thrilling',    color: '#ff3b55', softColor: 'rgba(255,59,85,0.18)',   borderColor: 'rgba(255,59,85,0.28)',  sectionTitle: '⚡ Thrilling Picks',        sectionEmoji: '⚡' },
];

function MoodLoadingText({ color, T }) {
  const [dotCount, setDotCount] = useState(1);
  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev >= 3 ? 1 : prev + 1));
    }, 500);
    return () => clearInterval(interval);
  }, []);
  return (
    <View style={styles.moodLoadingWrap}>
      <Text style={[styles.moodLoadingText, { color: color || T.purple }]}>
        {'Sizin için en iyi seçenekler belirleniyor'}
        <Text style={{ opacity: dotCount >= 1 ? 1 : 0 }}>.</Text>
        <Text style={{ opacity: dotCount >= 2 ? 1 : 0 }}>.</Text>
        <Text style={{ opacity: dotCount >= 3 ? 1 : 0 }}>.</Text>
      </Text>
    </View>
  );
}

function MoodPills({ activeMood, onSelect }) {
  return (
    <View style={styles.moodSection}>
      <SectionHeader emoji="🌙" title="Tonight's Mood" onViewAll={null} hideViewAll />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moodList}>
        {MOODS.map((mood) => {
          const isActive = activeMood === mood.key;
          return (
            <TouchableOpacity key={mood.key} onPress={() => onSelect(isActive ? null : mood.key)} activeOpacity={0.75}
              style={[styles.moodPill, { backgroundColor: isActive ? mood.softColor : 'rgba(255,255,255,0.08)', borderColor: isActive ? mood.borderColor : 'rgba(255,255,255,0.12)' }]}
            >
              <Text style={[styles.moodIcon, { color: isActive ? mood.color : '#9b5cff' }]}>{mood.icon}</Text>
              <Text style={[styles.moodText, { color: isActive ? mood.color : '#ffffff' }]}>{mood.label}</Text>
              {isActive && <View style={[styles.moodDot, { backgroundColor: mood.color }]} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Section({ emoji, title, data, loading, onPress, onAdd, showCinematch, myMovieIds, endpoint, navigation, T }) {
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
      <FlatList data={data} horizontal showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.tmdbId?.toString()}
        contentContainerStyle={{ paddingLeft: 24, paddingRight: 16 }}
        renderItem={({ item }) => <MovieCard item={item} onPress={onPress} onAdd={onAdd} showCinematch={showCinematch} isAdded={myMovieIds?.has(item.tmdbId)} T={T} />}
      />
    </View>
  );
}

function SearchResultRow({ item, onDetail, onAdd, isAdded, T }) {
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

export default function DiscoverScreen({ navigation }) {
  const { user, setUser } = useAuth();
  const { theme: themeColors, movieTheme } = useTheme();
  const { openDrawer } = useAppDrawer();
  const T = {
  bg: themeColors.bg,
  bgSoft: themeColors.bgSoft,
  glass: themeColors.glass,
  glassStrong: themeColors.glassStrong || themeColors.glass,
  border: themeColors.border,
  borderSoft: themeColors.borderSoft,
  red: themeColors.red,
  redSoft: themeColors.redSoft,
  purple: themeColors.primary || themeColors.purple,
  purpleSoft: themeColors.primarySoft || themeColors.purpleSoft,
  gold: themeColors.gold,
  spice: themeColors.spice || themeColors.primary || themeColors.gold,
  text: themeColors.textPrimary,
  textSoft: themeColors.textSecondary,
  textMuted: themeColors.textMuted,
  success: themeColors.success,
};
  styles = React.useMemo(() => createStyles(T), [themeColors, movieTheme]);
  const backgroundImage = movieTheme?.backgroundImage || DEFAULT_BACKGROUND;
  const bgGradient = movieTheme?.gradient || [T.bg, T.bgSoft, T.bg];
  const overlayGradient = backgroundImage
    ? ['rgba(5,5,6,0.18)', 'rgba(5,5,6,0.58)', 'rgba(5,5,6,0.9)']
    : bgGradient;
  const avatarLetter = user?.name ? user.name.charAt(0).toUpperCase() : '?';
  const avatarUri = normalizeImageUri(user?.avatar);
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
  const [avatarFailed, setAvatarFailed] = useState(false);
  const moodAnim = useRef(new Animated.Value(0)).current;

  useLayoutEffect(() => { navigation.setOptions({ headerShown: false }); }, [navigation]);

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarUri]);

  useFocusEffect(useCallback(() => {
    api.get('/movies/my').then((r) => setMyMovieIds(new Set((r.data || []).map((m) => m.tmdbId)))).catch(() => {});
    api.get('/users/profile').then((r) => setUser((prev) => ({ ...prev, ...r.data }))).catch(() => {});
  }, [setUser]));

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
      setActiveMood(null); setMoodMovies([]);
      Animated.timing(moodAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
      return;
    }
    setActiveMood(moodKey);
    setLoadingMood(true);
    setMoodMovies([]);
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

  const featured = suggestions.length >= 3 ? suggestions.slice(0, 8) : trending.slice(0, 8);
  const showSearch = query.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={styles.container}>
      {backgroundImage ? (
        <ImageBackground source={backgroundImage} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : null}
      <LinearGradient
        colors={overlayGradient}
        style={styles.container}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      >

      <View style={{ flex: 1 }}>
        <View style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={styles.heroTitleGroup}>
              <TouchableOpacity
                style={styles.drawerButton}
                onPress={openDrawer}
                activeOpacity={0.78}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <View style={[styles.drawerLine, { width: 20, backgroundColor: T.text }]} />
                <View style={[styles.drawerLine, { width: 14, backgroundColor: T.gold }]} />
                <View style={[styles.drawerLine, { width: 20, backgroundColor: T.text }]} />
              </TouchableOpacity>
              <Text style={styles.heroTitle}>Discover</Text>
            </View>
            <View style={styles.heroActions}>
              <TouchableOpacity style={styles.watchlistButton} onPress={() => navigation.navigate('Watchlist')}>
                <Text style={styles.watchlistIcon}>🔖</Text>
                <Text style={styles.watchlistText}>My Watchlist</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.avatarButton} onPress={() => navigation.navigate('MyProfile')}>
                {avatarUri && !avatarFailed ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} onError={() => setAvatarFailed(true)} />
                ) : (
                  <Text style={styles.avatarText}>{avatarLetter}</Text>
                )}
                <View style={styles.avatarDot} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.heroSubtitle}>Find your next <Text style={styles.heroSubtitleAccent}>obsession</Text></Text>
        </View>

        <View style={[styles.searchRow, searchFocused && styles.searchRowFocused]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Film, oyuncu veya liste ara..."
            placeholderTextColor={T.textMuted}
            value={query}
            onChangeText={handleQueryChange}
            onSubmitEditing={() => searchMovies()}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>×</Text>
            </TouchableOpacity>
          )}
        </View>

        {showSearch ? (
          <View style={[styles.searchResultsSection, { flex: 1 }]}> 
            <Text style={styles.searchResultsTitle}>Arama Sonuçları</Text>
            {searching ? (
              <ActivityIndicator color={T.red} style={{ padding: 18 }} />
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.tmdbId.toString()}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
                ItemSeparatorComponent={() => <View style={styles.resultSep} />}
                ListEmptyComponent={<Text style={styles.noResult}>Sonuç bulunamadı</Text>}
                renderItem={({ item }) => (
                  <SearchResultRow
                    item={item}
                    onDetail={goDetail}
                    onAdd={addMovie}
                    isAdded={myMovieIds.has(item.tmdbId)}
                    T={T}
                  />
                )}
              />
            )}
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={() => {
              Keyboard.dismiss();
              setSearchFocused(false);
            }}
            contentContainerStyle={{ paddingBottom: 120 }}
          >
            <FeaturedCarousel data={featured} onPress={goDetail} onAdd={addMovie} myMovieIds={myMovieIds} T={T} />

            <Section emoji="✦" title="Because you liked Interstellar" data={suggestions} loading={loadingSuggestions}
              onPress={goDetail} onAdd={addMovie} myMovieIds={myMovieIds} endpoint="/movies/suggestions" navigation={navigation} T={T} />

            <MoodPills activeMood={activeMood} onSelect={handleMoodSelect} />

            {(activeMood || loadingMood) ? (() => {
              const mood = MOODS.find((m) => m.key === activeMood);
              return loadingMood ? (
                <MoodLoadingText color={mood?.color} T={T} />
              ) : (
                <Animated.View style={{ opacity: moodAnim, transform: [{ translateY: moodAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }}>
                  <Section emoji={mood?.sectionEmoji || '🌙'} title={mood?.sectionTitle || 'Mood Picks'}
                    data={moodMovies} loading={false} onPress={goDetail} onAdd={addMovie}
                    myMovieIds={myMovieIds} endpoint={`/movies/mood?mood=${activeMood}`} navigation={navigation} T={T}
                  />
                </Animated.View>
              );
            })() : null}

            <Section emoji="🔥" title="Most Matched This Week" data={trending} loading={loadingTrending}
              onPress={goDetail} onAdd={addMovie} myMovieIds={myMovieIds} endpoint="/movies/trending" navigation={navigation} T={T} />
            <Section emoji="❤" title="CinemaMatch En Yüksek Puanlılar" data={topRated} loading={loadingTopRated}
              onPress={goDetail} onAdd={addMovie} showCinematch myMovieIds={myMovieIds} endpoint="/movies/top-rated-cinematch" navigation={navigation} T={T} />
            <Section emoji="◇" title="Hidden Gems" data={classics} loading={loadingClassics}
              onPress={goDetail} onAdd={addMovie} myMovieIds={myMovieIds} endpoint="/movies/classics" navigation={navigation} T={T} />
          </ScrollView>
        )}
      </View>
      </LinearGradient>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(T) {
  return StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },

  hero: { paddingHorizontal: 20, paddingTop: 58, paddingBottom: 8 },
  heroRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 12 },
  heroTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  drawerButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: T.glass, borderWidth: 1, borderColor: T.border, justifyContent: 'center', alignItems: 'center', gap: 4 },
  drawerLine: { height: 2, borderRadius: 2 },
  heroTitle: { fontSize: 32, lineHeight: 38, fontWeight: '900', color: T.text, letterSpacing: -1 },
  heroSubtitle: { fontSize: 14, color: T.textMuted, fontWeight: '600' },
  heroSubtitleAccent: { color: T.red, fontWeight: '800' },
  heroActions: { height: 38, flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  watchlistButton: { height: 38, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 19, paddingHorizontal: 11, borderWidth: 1, borderColor: T.border },
  watchlistIcon: { fontSize: 13 },
  watchlistText: { color: T.textSoft, fontSize: 12, fontWeight: '700' },
  avatarButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: T.purple, justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 19 },
  avatarText: { color: T.text, fontSize: 14, fontWeight: '900' },
  avatarDot: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: T.red, borderWidth: 2, borderColor: T.bg },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, borderWidth: 1, borderColor: T.border, paddingLeft: 14, paddingRight: 8, paddingVertical: 2 },
  searchRowFocused: {borderColor: T.gold,backgroundColor: T.glass,},  
  searchInput: { flex: 1, color: T.text, fontSize: 15, paddingVertical: 12 },
  searchIcon: { fontSize: 16, color: T.textMuted, marginRight: 4 },
  clearBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  clearBtnText: { fontSize: 18, color: T.text, lineHeight: 20 },
  searchResultsSection: { marginHorizontal: 20, marginTop: 12, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden', paddingBottom: 14 },
  searchResultsTitle: { color: T.text, fontSize: 16, fontWeight: '900', paddingHorizontal: 16, paddingVertical: 14 },
  resultRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  resultPoster: { width: 44, height: 64, borderRadius: 11, backgroundColor: T.bgSoft },
  resultInfo: { flex: 1 },
  resultTitle: { color: T.text, fontSize: 14, fontWeight: '800' },
  resultMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  resultYear: { color: T.textMuted, fontSize: 12, fontWeight: '600' },
  resultRating: { color: T.gold, fontSize: 12, fontWeight: '800' },
  resultSep: { height: 1, backgroundColor: T.borderSoft, marginHorizontal: 12 },
  resultAdd: {width: 34,height: 34,borderRadius: 17,backgroundColor: T.red,justifyContent: 'center',alignItems: 'center',},  
  resultAddText: { color: T.text, fontSize: 23, lineHeight: 25, fontWeight: '700' },
  noResult: { color: T.textMuted, fontSize: 14, textAlign: 'center', padding: 22, fontWeight: '700' },
  featuredCard: { marginBottom: 4 },
  featuredPosterWrap: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: T.border },
  featuredPosterWrapActive: { shadowColor: T.red, shadowOpacity: 0.28, shadowRadius: 20, elevation: 12 },
  posterDarkGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: 'rgba(5,5,6,0.4)', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
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
  sectionIcon: { width: 27, height: 27, borderRadius: 14, backgroundColor: T.glass, justifyContent: 'center', alignItems: 'center' },
  sectionEmoji: { fontSize: 15 },
  sectionTitle: { color: T.text, fontSize: 18, fontWeight: '900', letterSpacing: -0.6 },
  sectionViewAll: { color: T.gold, fontSize: 14, fontWeight: '800' },
  card: { width: 122, marginRight: 16 },
  cardPosterWrap: { width: 122, height: 178, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: T.border, backgroundColor: T.bgSoft },
  cardTitle: { color: T.textSoft, fontSize: 12, fontWeight: '700', marginTop: 8, lineHeight: 16 },
  ratingBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 },
  ratingBadgeText: { color: T.gold, fontSize: 11, fontWeight: '900' },
  percentBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: T.glass, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 },
  percentBadgeText: { color: T.gold, fontSize: 11, fontWeight: '900' },
  addFab: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: T.red, justifyContent: 'center', alignItems: 'center', shadowColor: T.red, shadowOpacity: 0.32, shadowRadius: 12, elevation: 8 },
  addFabText: { color: T.text, fontSize: 20, lineHeight: 21, fontWeight: '700' },
  addDone: { backgroundColor: T.success, shadowColor: T.success },
  moodSection: { marginTop: 34 },
  moodList: { paddingHorizontal: 24, gap: 12 },
  moodPill: { height: 42, paddingHorizontal: 17, borderRadius: 21, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  moodIcon: { fontSize: 16, fontWeight: '800' },
  moodText: { fontSize: 13, fontWeight: '800' },
  moodDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 2 },
  skeletonRow: { flexDirection: 'row', paddingLeft: 24, gap: 16 },
  skeletonCard: { width: 122, height: 178, borderRadius: 18, backgroundColor: T.glass, borderWidth: 1, borderColor: T.borderSoft },
  moodLoadingWrap: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 28, alignItems: 'center', justifyContent: 'center', minHeight: 120 },
  moodLoadingText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.1, textAlign: 'center' },
  });
}
