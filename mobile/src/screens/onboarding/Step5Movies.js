import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, FlatList,
  Image, TextInput, ActivityIndicator, Animated,
  TouchableOpacity, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Radii, Shadows } from '../../theme';
import OnboardingProgress from '../../components/OnboardingProgress';
import { useOnboarding } from '../../context/OnboardingContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const MIN_MOVIES = 5;
const POSTER_BASE = 'https://image.tmdb.org/t/p/w300';
const TMDB_API_KEY = 'a21c27e5c24785ed3831babc5c0d0d91';
const TMDB_BASE = 'https://api.themoviedb.org/3';

async function fetchPopular(page = 1) {
  const res = await fetch(
    `${TMDB_BASE}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`
  );
  const json = await res.json();
  return json.results || [];
}

async function searchTmdb(query) {
  const res = await fetch(
    `${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US`
  );
  const json = await res.json();
  return json.results || [];
}

function MovieCard({ movie, selected, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 50 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={[styles.movieCardWrap, { transform: [{ scale }] }]}>
      <Pressable style={styles.movieCard} onPress={handlePress}>
        <Image
          source={
            movie.poster_path
              ? { uri: `${POSTER_BASE}${movie.poster_path}` }
              : require('../../../assets/icon.png')
          }
          style={styles.moviePoster}
          resizeMode="cover"
        />
        {/* Selected overlay */}
        {selected && (
          <View style={styles.selectedOverlay}>
            <View style={styles.selectedCheck}>
              <Text style={styles.selectedCheckText}>✓</Text>
            </View>
          </View>
        )}
        {/* Gradient info */}
        <View style={styles.movieInfo}>
          <Text style={styles.movieTitle} numberOfLines={2}>{movie.title || movie.original_title}</Text>
          {movie.release_date && (
            <Text style={styles.movieYear}>{movie.release_date.slice(0, 4)}</Text>
          )}
        </View>
        {selected && <View style={styles.selectedBorder} />}
      </Pressable>
    </Animated.View>
  );
}

export default function Step5Movies({ navigation }) {
  const { data, update } = useOnboarding();
  const { setToken, setUser } = useAuth();
  const [selected, setSelected] = useState(
    new Map(data.movies.map((m) => [m.tmdbId, m]))
  );
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState(''); // Arama tetiklenince set edilir
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadPopular(1);
  }, []);

  const loadPopular = async (p) => {
    setLoading(p === 1);
    try {
      const results = await fetchPopular(p);
      setMovies((prev) => p === 1 ? results : [...prev, ...results]);
      setPage(p);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (val) => {
    setQuery(val);
    // Yazdıkça arama YOK — kullanıcı Enter veya Ara butonuna basacak
    if (!val.trim()) {
      setActiveQuery('');
      loadPopular(1);
    }
  };

  const doSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setActiveQuery(q);
    setSearching(true);
    try {
      const results = await searchTmdb(q);
      setMovies(results);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setActiveQuery('');
    loadPopular(1);
  };

  const toggleMovie = (movie) => {
    setSelected((prev) => {
      const next = new Map(prev);
      const id = movie.id;
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.set(id, {
          tmdbId: movie.id,
          title: movie.title || movie.original_title,
          poster: movie.poster_path ? `${POSTER_BASE}${movie.poster_path}` : null,
          year: movie.release_date?.slice(0, 4) || null,
        });
      }
      return next;
    });
  };

  const count = selected.size;
  const canFinish = count >= MIN_MOVIES;

  const handleFinish = async () => {
    if (!canFinish) {
      Alert.alert('Yeterli değil', `En az ${MIN_MOVIES} film seçmelisin.`);
      return;
    }
    setSubmitting(true);
    try {
      const movies = Array.from(selected.values());
      update({ movies });

      // Backend'e kaydol — tüm profil bilgileri ve filmler gönder
      const response = await api.post('/auth/register', {
        name: data.username,
        username: data.username,
        email: data.email,
        password: data.password,
        bio: data.bio,
        avatar: data.avatar,
        avatarType: data.avatarType,
        age: data.age,
        showAge: data.showAge,
        movies,
      });

      const { token, user } = response.data;
      console.log('✓ Kayıt başarılı, token alındı:', token.slice(0, 20) + '...');
      console.log('✓ User:', user);

      // Token ve user'ı AsyncStorage'a kaydet
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      
      console.log('✓ AsyncStorage kaydedildi');
      
      // AuthContext state'ini güncelle (navigation otomatik uyarlanacak)
      setToken(token);
      setUser(user);

      console.log('✓ AuthContext güncellendi - navigation başlamalı');

      // Onboarding context'ini temizle
      update({ movies: [] });
    } catch (err) {
      console.error('✗ Kayıt hatası:', err);
      console.error('✗ Error response:', err.response?.data);
      Alert.alert(
        'Kayıt başarısız',
        err.response?.data?.error || 'Lütfen bağlantınızı kontrol edin ve tekrar deneyin.'
      );
      setSubmitting(false);
    }
  };

  const animatePress = (v) =>
    Animated.spring(btnScale, { toValue: v, useNativeDriver: true, speed: 40 }).start();

  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: Math.min(count / MIN_MOVIES, 1),
      useNativeDriver: false,
      speed: 14,
    }).start();
  }, [count]);

  const renderHeader = () => (
    <View>
      {/* Progress */}
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: canFinish ? Colors.green : Colors.red,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressLabel, canFinish && { color: Colors.green }]}>
          {count < MIN_MOVIES
            ? `${count} / ${MIN_MOVIES} seçildi · ${MIN_MOVIES - count} tane daha`
            : `${count} film seçildi ✓`}
        </Text>
      </View>

      {/* Seçilen filmler küçük row */}
      {count > 0 && (
        <FlatList
          horizontal
          data={Array.from(selected.values())}
          keyExtractor={(m) => String(m.tmdbId)}
          showsHorizontalScrollIndicator={false}
          style={styles.selectedRow}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => toggleMovie({ id: item.tmdbId })} style={styles.selectedChip}>
              {item.poster
                ? <Image source={{ uri: item.poster }} style={styles.selectedChipImg} />
                : <View style={[styles.selectedChipImg, { backgroundColor: Colors.bgCard }]} />
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
          onChangeText={handleSearch}
          onSubmitEditing={doSearch}
          placeholder="Film ara..."
          placeholderTextColor={Colors.textMuted}
          returnKeyType="search"
          blurOnSubmit={false}
        />
        {searching && (
          <ActivityIndicator size="small" color={Colors.red} style={{ marginRight: 8 }} />
        )}
        {query.length > 0 && !searching && (
          <Pressable onPress={clearSearch} style={{ paddingRight: 8 }}>
            <Text style={{ color: Colors.textMuted, fontSize: 16 }}>✕</Text>
          </Pressable>
        )}
        <Pressable
          onPress={doSearch}
          style={styles.searchBtn}
          disabled={!query.trim() || searching}
        >
          <Text style={styles.searchBtnText}>Ara</Text>
        </Pressable>
      </View>

      {!activeQuery && (
        <Text style={styles.sectionHeading}>🔥 Popüler Filmler</Text>
      )}
      {activeQuery ? (
        <Text style={styles.sectionHeading}>"{activeQuery}" için sonuçlar</Text>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <OnboardingProgress step={5} />
      <View style={styles.titleRow}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Geri</Text>
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.title}>Filmlerini seç</Text>
          <Text style={styles.subtitle}>En az {MIN_MOVIES} film seç · Eşleşme kaliteni artırır</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.red} size="large" />
        </View>
      ) : (
        <FlatList
          data={movies}
          keyExtractor={(item) => String(item.id)}
          numColumns={3}
          ListHeaderComponent={renderHeader}
          onEndReached={() => !activeQuery && loadPopular(page + 1)}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <MovieCard
              movie={item}
              selected={selected.has(item.id)}
              onPress={() => toggleMovie(item)}
            />
          )}
        />
      )}

      {/* CTA */}
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

const CARD_WIDTH = '30%';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  backBtnText: { color: Colors.red, fontWeight: '600', fontSize: 14, paddingTop: 4 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, color: Colors.textPrimary },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  progressWrap: { paddingHorizontal: 16, marginBottom: 10 },
  progressTrack: { height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: 2 },
  progressLabel: { fontSize: 12, fontWeight: '700', color: Colors.red },

  selectedRow: { marginBottom: 10 },
  selectedChip: { position: 'relative' },
  selectedChipImg: { width: 44, height: 62, borderRadius: 6, borderWidth: 2, borderColor: Colors.red },
  selectedChipX: {
    position: 'absolute', top: -4, right: -4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.red, justifyContent: 'center', alignItems: 'center',
  },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgInput, borderRadius: Radii.md,
    borderWidth: 1, borderColor: Colors.border,
    marginHorizontal: 16, marginBottom: 12,
  },
  searchIcon: { paddingLeft: 14, fontSize: 14 },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 14, paddingVertical: 12, paddingHorizontal: 10 },
  searchBtn: {
    backgroundColor: Colors.red,
    borderRadius: Radii.md - 2,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 4,
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  sectionHeading: { paddingHorizontal: 16, marginBottom: 8, fontSize: 13, fontWeight: '700', color: Colors.textSecondary },

  grid: { paddingHorizontal: 12, paddingBottom: 100 },
  row: { justifyContent: 'space-between', marginBottom: 8 },

  movieCardWrap: { width: CARD_WIDTH },
  movieCard: { borderRadius: Radii.md, overflow: 'hidden', position: 'relative', backgroundColor: Colors.bgCard },
  moviePoster: { width: '100%', aspectRatio: 2 / 3 },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(200,16,46,0.35)',
    justifyContent: 'flex-start', alignItems: 'flex-end',
    padding: 6,
  },
  selectedCheck: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.red, justifyContent: 'center', alignItems: 'center',
  },
  selectedCheckText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  selectedBorder: { ...StyleSheet.absoluteFillObject, borderRadius: Radii.md, borderWidth: 2, borderColor: Colors.red },
  movieInfo: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)', padding: 6,
  },
  movieTitle: { color: '#fff', fontSize: 9, fontWeight: '700', lineHeight: 12 },
  movieYear: { color: Colors.textMuted, fontSize: 8, marginTop: 1 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 36, backgroundColor: Colors.bg, borderTopWidth: 0.5, borderTopColor: Colors.border },
  finishBtn: { backgroundColor: Colors.red, borderRadius: Radii.md, padding: 17, alignItems: 'center', ...Shadows.red },
  finishBtnDisabled: { opacity: 0.45 },
  finishBtnText: { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },
});
