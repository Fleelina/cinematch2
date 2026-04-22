import React, { useEffect, useState, useCallback, useLayoutEffect } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  Image, StyleSheet, ActivityIndicator, Alert, Pressable,
} from 'react-native';
import api from '../services/api';
import { Colors, Radii } from '../theme';

export default function MoviesScreen({ navigation }) {
  const [myMovies, setMyMovies] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);

  const fetchMyMovies = useCallback(async () => {
    try {
      const res = await api.get('/movies/my');
      setMyMovies(res.data);
    } catch {
      Alert.alert('Hata', 'Filmler yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyMovies();
  }, [fetchMyMovies]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={() => navigation.navigate('Watchlist')}
        >
          <Text style={styles.headerActionIcon}>📋</Text>
          <Text style={styles.headerActionText}>Sonra Izle</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const searchMovies = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await api.get(`/movies/search?query=${query}`);
      setSearchResults(res.data);
    } catch {
      Alert.alert('Hata', 'Arama basarisiz');
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSearchResults([]);
  };

  const addMovie = async (movie) => {
    try {
      await api.post('/movies/add', movie);
      clearSearch();
      fetchMyMovies();
    } catch (err) {
      Alert.alert('Hata', err.response?.data?.error || 'Film eklenemedi');
    }
  };

  const removeMovie = async (movieId) => {
    try {
      await api.delete(`/movies/${movieId}`);
      setMyMovies((prev) => prev.filter((movie) => movie.id !== movieId));
    } catch {
      Alert.alert('Hata', 'Film kaldirilamadi');
    }
  };

  const goDetail = (item) => navigation.navigate('MovieDetail', {
    tmdbId: item.tmdbId,
    title: item.title,
    poster: item.poster,
    year: item.year,
  });

  const showSearch = searchResults.length > 0 || searching;

  return (
    <View style={styles.container}>
      <View style={[styles.searchRow, searchFocused && styles.searchRowFocused]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Film ara ve ekle..."
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={searchMovies}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          returnKeyType="search"
        />
        {query.length > 0 ? (
          <TouchableOpacity onPress={clearSearch} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        ) : null}
        <Pressable style={styles.searchBtn} onPress={searchMovies}>
          <Text style={styles.searchBtnText}>Ara</Text>
        </Pressable>
      </View>

      {showSearch ? (
        <View style={styles.resultsBox}>
          {searching ? (
            <ActivityIndicator color={Colors.red} style={{ padding: 16 }} />
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.tmdbId.toString()}
              style={{ maxHeight: 240 }}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.resultSep} />}
              renderItem={({ item }) => (
                <View style={styles.resultRow}>
                  <TouchableOpacity onPress={() => goDetail(item)}>
                    <Poster uri={item.poster} size={42} radius={8} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.resultInfo} onPress={() => goDetail(item)}>
                    <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
                    {item.year ? <Text style={styles.resultYear}>{item.year}</Text> : null}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.addBtn} onPress={() => addMovie(item)}>
                    <Text style={styles.addBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      ) : null}

      <View style={styles.mySection}>
        <Text style={styles.mySectionLabel}>Profilimde · {myMovies.length} film</Text>
        {loading ? (
          <ActivityIndicator color={Colors.red} style={{ marginTop: 24 }} />
        ) : myMovies.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>🎬</Text>
            <Text style={styles.emptyTitle}>Henuz film yok</Text>
            <Text style={styles.emptySub}>Film ara ve profiline ekle</Text>
          </View>
        ) : (
          <FlatList
            data={myMovies}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            ItemSeparatorComponent={() => <View style={styles.listSep} />}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.myMovieRow}
                onPress={() => goDetail(item)}
                activeOpacity={0.8}
              >
                <Poster uri={item.poster} size={52} radius={10} />
                <View style={styles.myMovieInfo}>
                  <Text style={styles.myMovieTitle} numberOfLines={2}>{item.title}</Text>
                  {item.year ? <Text style={styles.myMovieYear}>{item.year}</Text> : null}
                </View>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeMovie(item.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </View>
  );
}

function Poster({ uri, size, radius }) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size * 1.4, borderRadius: radius, backgroundColor: Colors.bgCard }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size * 1.4,
        borderRadius: radius,
        backgroundColor: Colors.bgElevated,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.4 }}>🎬</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 16,
    backgroundColor: Colors.redDim,
    borderRadius: Radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 0.5,
    borderColor: Colors.redBorder,
  },
  headerActionIcon: { fontSize: 13, color: Colors.red },
  headerActionText: { color: Colors.red, fontSize: 12, fontWeight: '700' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: Colors.bgInput,
    borderRadius: Radii.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 4,
  },
  searchRowFocused: { borderColor: Colors.red, backgroundColor: Colors.redDim },
  searchIcon: { fontSize: 14, color: Colors.textMuted },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
    paddingVertical: 10,
  },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.bgElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBtnText: { fontSize: 10, color: Colors.textSecondary },
  searchBtn: {
    backgroundColor: Colors.red,
    borderRadius: Radii.md - 2,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  resultsBox: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 10,
  },
  resultInfo: { flex: 1 },
  resultTitle: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  resultYear: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 20, lineHeight: 22, fontWeight: '700' },
  resultSep: { height: 0.5, backgroundColor: Colors.borderDim, marginHorizontal: 10 },
  mySection: { flex: 1, paddingHorizontal: 16 },
  mySectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: 12,
  },
  myMovieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  myMovieInfo: { flex: 1 },
  myMovieTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  myMovieYear: { fontSize: 11, color: Colors.textMuted, marginTop: 3 },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.bgElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnText: { fontSize: 11, color: Colors.textSecondary },
  listSep: { height: 0.5, backgroundColor: Colors.borderDim },
  emptyWrap: { alignItems: 'center', paddingTop: 48 },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { color: Colors.textPrimary, fontSize: 17, fontWeight: '700', marginBottom: 6 },
  emptySub: { color: Colors.textSecondary, fontSize: 13 },
});
