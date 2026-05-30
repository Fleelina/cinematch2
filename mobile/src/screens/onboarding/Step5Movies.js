import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, FlatList,
  Image, TextInput, ActivityIndicator, Animated, Alert,
} from 'react-native';
import { Colors, Radii, Shadows } from '../../theme';
import OnboardingProgress from '../../components/OnboardingProgress';
import { useOnboarding } from '../../context/OnboardingContext';
import { useAuth } from '../../context/AuthContext';
import { setToken } from '../../services/tokenStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';

const MIN_MOVIES = 5;
const POSTER_BASE = 'https://image.tmdb.org/t/p/w300';

async function fetchPopular(page) {
  try {
    const res = await api.get(`/movies/public/popular?page=${page}`);
    return res.data || [];
  } catch (err) {
    console.error('[Popular] fetch failed:', err.message);
    return [];
  }
}

async function fetchSearch(query) {
  try {
    const res = await api.get(`/movies/public/search?query=${encodeURIComponent(query)}`);
    return res.data || [];
  } catch (err) {
    console.error('[Search] fetch failed:', err.message);
    return [];
  }
}

function MovieCard({ movie, selected, onPress }) {
  if (!movie?.poster_path) return null;

  return (
    <Pressable
      style={({ pressed }) => [styles.movieCardWrap, { opacity: pressed ? 0.85 : 1 }]}
      onPress={onPress}
    >
      <View style={[styles.movieCard, selected && styles.movieCardSelected]}>
        <Image
          source={{ uri: `${POSTER_BASE}${movie.poster_path}` }}
          style={styles.moviePoster}
          resizeMode="cover"
        />
        {selected && (
          <View style={styles.selectedOverlay}>
            <View style={styles.selectedCheck}>
              <Text style={styles.selectedCheckText}>✓</Text>
            </View>
          </View>
        )}
        <View style={styles.movieInfo}>
          <Text style={styles.movieTitle} numberOfLines={2}>
            {movie.title || movie.original_title}
          </Text>
          {movie.release_date ? (
            <Text style={styles.movieYear}>{movie.release_date.slice(0, 4)}</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function Step5Movies({ navigation }) {
  const { data, update } = useOnboarding();
  const { setUser } = useAuth();

  const [selectedIds, setSelectedIds] = useState(new Set(data.movies.map((m) => m.tmdbId)));
  const [selectedMap, setSelectedMap] = useState(new Map(data.movies.map((m) => [m.tmdbId, m])));

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const btnScale = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const count = selectedIds.size;
  const canFinish = count >= MIN_MOVIES;

  useEffect(() => { loadPopular(1); }, []);

  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: Math.min(count / MIN_MOVIES, 1),
      useNativeDriver: false,
      speed: 14,
    }).start();
  }, [count]);

  const loadPopular = async (p) => {
    if (p === 1) { setLoading(true); setLoadError(false); }
    else setLoadingMore(true);

    const results = await fetchPopular(p);

    if (p === 1 && results.length === 0) {
      setLoadError(true);
    } else {
      setMovies((prev) => p === 1 ? results : [...prev, ...results]);
      setPage(p);
    }

    setLoading(false);
    setLoadingMore(false);
  };

  const debounceRef = useRef(null);

  const handleQueryChange = (text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { clearSearch(); return; }
    setIsSearchMode(true);
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const results = await fetchSearch(text.trim());
      const normalized = results.map((m) => ({
        id: m.tmdbId || m.id,
        title: m.title,
        poster_path: m.poster ? m.poster.replace('https://image.tmdb.org/t/p/w300', '') : null,
        release_date: m.year ? `${m.year}-01-01` : null,
      }));
      setMovies(normalized);
      setSearching(false);
    }, 500);
  };

  const clearSearch = () => {
    setQuery('');
    setIsSearchMode(false);
    loadPopular(1);
  };

  const toggleMovie = (movie) => {
    const id = movie.id || movie.tmdbId;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.set(id, {
          tmdbId: id,
          title: movie.title || movie.original_title,
          poster: movie.poster_path ? `${POSTER_BASE}${movie.poster_path}` : null,
          year: movie.release_date?.slice(0, 4) || null,
        });
      }
      return next;
    });
  };

  const handleFinish = async () => {
    if (!canFinish) { Alert.alert('Yeterli değil', `En az ${MIN_MOVIES} film seçmelisin.`); return; }
    setSubmitting(true);
    try {
      const movieList = Array.from(selectedMap.values());
      update({ movies: movieList });

      const response = await api.post('/auth/register', {
        name: data.username,
        username: data.username,
        email: data.email,
        password: data.password,
        bio: data.bio || null,
        avatar: data.avatar || null,
        avatarType: data.avatarType || null,
        birthDate: data.birthDate ? new Date(data.birthDate).toISOString() : null,
        showAge: data.showAge || false,
        gender: data.gender || null,
        movies: movieList,
      });

      const { token, user } = response.data;
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      setToken(token);
      setUser(user);
    } catch (err) {
      Alert.alert('Kayıt başarısız', err.response?.data?.error || 'Tekrar dene.');
      setSubmitting(false);
    }
  };

  const animatePress = (v) =>
    Animated.spring(btnScale, { toValue: v, useNativeDriver: true, speed: 40 }).start();

  const visibleMovies = movies.filter((m) => !!m.poster_path);

  return (
    <View style={styles.container}>
      <OnboardingProgress step={5} />

      <View style={styles.titleRow}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Geri</Text>
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.title}>Filmlerini seç</Text>
          <Text style={styles.subtitle}>En az {MIN_MOVIES} film · Eşleşme kaliteni artırır</Text>
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressFill, {
              width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              backgroundColor: canFinish ? Colors.green : Colors.red,
            }]}
          />
        </View>
        <Text style={[styles.progressLabel, canFinish && { color: Colors.green }]}>
          {count < MIN_MOVIES
            ? `${count} / ${MIN_MOVIES} seçildi · ${MIN_MOVIES - count} tane daha`
            : `${count} film seçildi ✓`}
        </Text>
      </View>

      {/* Seçilen filmler */}
      {count > 0 && (
        <FlatList
          horizontal
          data={Array.from(selectedMap.values())}
          keyExtractor={(m) => String(m.tmdbId)}
          showsHorizontalScrollIndicator={false}
          style={styles.selectedRow}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => toggleMovie({ id: item.tmdbId })} style={styles.selectedChip}>
              {item.poster
                ? <Image source={{ uri: item.poster }} style={styles.selectedChipImg} />
                : <View style={[styles.selectedChipImg, { backgroundColor: Colors.bgCard, justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ fontSize: 16 }}>🎬</Text>
                  </View>
              }
              <View style={styles.selectedChipX}>
                <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800' }}>✕</Text>
              </View>
            </Pressable>
          )}
        />
      )}

      {/* Arama */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={handleQueryChange}
          placeholder="Film ara..."
          placeholderTextColor={Colors.textMuted}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          blurOnSubmit={false}
        />
        {searching && <ActivityIndicator size="small" color={Colors.red} style={{ marginRight: 8 }} />}
        {query.length > 0 && !searching && (
          <Pressable onPress={clearSearch} style={{ paddingHorizontal: 8 }}>
            <Text style={{ color: Colors.textMuted, fontSize: 16 }}>✕</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.sectionHeading}>
        {isSearchMode ? `"${query}" için sonuçlar` : '🔥 Popüler Filmler'}
      </Text>

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator color={Colors.red} size="large" />
          <Text style={styles.centerText}>Filmler yükleniyor...</Text>
        </View>
      ) : loadError ? (
        <View style={styles.centerWrap}>
          <Text style={{ fontSize: 32, marginBottom: 12 }}>⚠️</Text>
          <Text style={styles.centerText}>Filmler yüklenemedi</Text>
          <Text style={[styles.centerText, { fontSize: 12, marginTop: 4 }]}>İnternet bağlantını kontrol et</Text>
          <Pressable style={[styles.searchBtn, { marginTop: 16, paddingHorizontal: 24 }]} onPress={() => loadPopular(1)}>
            <Text style={styles.searchBtnText}>Tekrar Dene</Text>
          </Pressable>
        </View>
      ) : visibleMovies.length === 0 ? (
        <View style={styles.centerWrap}>
          <Text style={styles.centerText}>Sonuç bulunamadı</Text>
        </View>
      ) : (
        <FlatList
          data={visibleMovies}
          keyExtractor={(item) => String(item.id)}
          numColumns={3}
          onEndReached={() => !isSearchMode && !loadingMore && loadPopular(page + 1)}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <MovieCard
              movie={item}
              selected={selectedIds.has(item.id)}
              onPress={() => toggleMovie(item)}
            />
          )}
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator color={Colors.red} style={{ margin: 16 }} />
              : null
          }
        />
      )}

      <View style={styles.footer}>
        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <Pressable
            style={[styles.finishBtn, !canFinish && styles.finishBtnDisabled]}
            onPress={handleFinish}
            onPressIn={() => animatePress(0.97)}
            onPressOut={() => animatePress(1)}
            disabled={!canFinish || submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.finishBtnText}>
                  {canFinish ? `CineMatch'e Başla 🎬` : `${MIN_MOVIES - count} film daha seç`}
                </Text>
            }
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  backBtnText: { color: Colors.red, fontWeight: '600', fontSize: 14, paddingTop: 4 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, color: Colors.textPrimary },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  progressWrap: { paddingHorizontal: 16, marginBottom: 8 },
  progressTrack: { height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: 2 },
  progressLabel: { fontSize: 12, fontWeight: '700', color: Colors.red },
  selectedRow: { maxHeight: 72, marginBottom: 8 },
  selectedChip: { position: 'relative' },
  selectedChipImg: { width: 44, height: 62, borderRadius: 6, borderWidth: 2, borderColor: Colors.red },
  selectedChipX: { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.red, justifyContent: 'center', alignItems: 'center' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgInput, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, marginHorizontal: 16, marginBottom: 8 },
  searchIcon: { paddingLeft: 12, fontSize: 14 },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 14, paddingVertical: 12, paddingHorizontal: 8 },
  searchBtn: { backgroundColor: Colors.red, borderRadius: Radii.md - 2, paddingHorizontal: 14, paddingVertical: 8, marginRight: 4 },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  sectionHeading: { paddingHorizontal: 16, marginBottom: 8, fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  centerText: { color: Colors.textMuted, fontSize: 14, textAlign: 'center' },
  grid: { paddingHorizontal: 12, paddingBottom: 120 },
  row: { justifyContent: 'space-between', marginBottom: 8 },
  movieCardWrap: { width: '31%' },
  movieCard: { borderRadius: Radii.md, overflow: 'hidden', backgroundColor: Colors.bgCard },
  movieCardSelected: { borderWidth: 2.5, borderColor: Colors.red },
  moviePoster: { width: '100%', aspectRatio: 2 / 3 },
  selectedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(200,16,46,0.3)', justifyContent: 'flex-start', alignItems: 'flex-end', padding: 5 },
  selectedCheck: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.red, justifyContent: 'center', alignItems: 'center' },
  selectedCheckText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  movieInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.75)', padding: 5 },
  movieTitle: { color: '#fff', fontSize: 9, fontWeight: '700', lineHeight: 12 },
  movieYear: { color: Colors.textMuted, fontSize: 8, marginTop: 1 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 36, backgroundColor: Colors.bg, borderTopWidth: 0.5, borderTopColor: Colors.border },
  finishBtn: { backgroundColor: Colors.red, borderRadius: Radii.md, padding: 17, alignItems: 'center', ...Shadows.red },
  finishBtnDisabled: { opacity: 0.45 },
  finishBtnText: { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },
});
