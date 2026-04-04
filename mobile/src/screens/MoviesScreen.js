import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  Image, StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import api from '../services/api';

export default function MoviesScreen({ navigation }) {
  const [myMovies, setMyMovies] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMyMovies = async () => {
    try {
      const res = await api.get('/movies/my');
      setMyMovies(res.data);
    } catch (err) {
      Alert.alert('Hata', 'Filmler yuklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMyMovies(); }, []);

  const searchMovies = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await api.get(`/movies/search?query=${query}`);
      setSearchResults(res.data);
    } catch (err) {
      Alert.alert('Hata', 'Arama basarisiz');
    } finally {
      setSearching(false);
    }
  };

  const addMovie = async (movie) => {
    try {
      await api.post('/movies/add', movie);
      setSearchResults([]);
      setQuery('');
      fetchMyMovies();
    } catch (err) {
      Alert.alert('Hata', err.response?.data?.error || 'Film eklenemedi');
    }
  };

  const removeMovie = async (movieId) => {
    try {
      await api.delete(`/movies/${movieId}`);
      fetchMyMovies();
    } catch (err) {
      Alert.alert('Hata', 'Film kaldirilmadi');
    }
  };

  const goToDetail = (tmdbId, title) => {
    navigation.navigate('MovieDetail', { tmdbId, title });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.watchlistBtn} onPress={() => navigation.navigate('Watchlist')}>
        <Text style={styles.watchlistBtnText}>📋 Sonra İzle Listem</Text>
      </TouchableOpacity>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Film ara..."
          placeholderTextColor="#888"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={searchMovies}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={searchMovies}>
          <Text style={styles.searchBtnText}>Ara</Text>
        </TouchableOpacity>
      </View>

      {searching && <ActivityIndicator color="#E50914" style={{ marginVertical: 12 }} />}

      {searchResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.sectionTitle}>Sonuclar</Text>
          <FlatList
            data={searchResults}
            keyExtractor={item => item.tmdbId.toString()}
            style={{ maxHeight: 250 }}
            renderItem={({ item }) => (
              <View style={styles.resultItem}>
                <TouchableOpacity onPress={() => goToDetail(item.tmdbId, item.title)}>
                  {item.poster
                    ? <Image source={{ uri: item.poster }} style={styles.poster} />
                    : <View style={styles.posterPlaceholder}><Text>🎬</Text></View>
                  }
                </TouchableOpacity>
                <TouchableOpacity style={styles.resultInfo} onPress={() => goToDetail(item.tmdbId, item.title)}>
                  <Text style={styles.resultTitle}>{item.title}</Text>
                  {item.year ? <Text style={styles.resultYear}>{item.year}</Text> : null}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => addMovie(item)}>
                  <Text style={styles.addIcon}>+</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      )}

      <Text style={styles.sectionTitle}>Profilimde ({myMovies.length})</Text>
      {loading
        ? <ActivityIndicator color="#E50914" />
        : myMovies.length === 0
          ? <Text style={styles.emptyText}>Henuz film eklemedin. Ara ve ekle!</Text>
          : <FlatList
              data={myMovies}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.myMovieItem}
                  onPress={() => goToDetail(item.tmdbId, item.title)}
                >
                  {item.poster
                    ? <Image source={{ uri: item.poster }} style={styles.poster} />
                    : <View style={styles.posterPlaceholder}><Text>🎬</Text></View>
                  }
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultTitle}>{item.title}</Text>
                    {item.year ? <Text style={styles.resultYear}>{item.year}</Text> : null}
                  </View>
                  <TouchableOpacity onPress={() => removeMovie(item.id)}>
                    <Text style={styles.removeIcon}>✕</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
            />
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', padding: 16 },
  watchlistBtn: {
    backgroundColor: '#1c1c1c', borderRadius: 12, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: '#333',
    flexDirection: 'row', alignItems: 'center',
  },
  watchlistBtnText: { color: '#aaa', fontSize: 13, fontWeight: '600' },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  searchInput: {
    flex: 1, backgroundColor: '#1c1c1c', color: '#fff', borderRadius: 12,
    padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#333'
  },
  searchBtn: { backgroundColor: '#E50914', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontWeight: 'bold' },
  resultsContainer: { backgroundColor: '#1c1c1c', borderRadius: 12, padding: 8, marginBottom: 16 },
  sectionTitle: { color: '#aaa', fontSize: 12, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' },
  resultItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  myMovieItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    gap: 10, borderBottomWidth: 1, borderBottomColor: '#222'
  },
  poster: { width: 40, height: 56, borderRadius: 6 },
  posterPlaceholder: { width: 40, height: 56, borderRadius: 6, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
  resultInfo: { flex: 1 },
  resultTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  resultYear: { color: '#888', fontSize: 12 },
  addIcon: { color: '#E50914', fontSize: 24, fontWeight: 'bold' },
  removeIcon: { color: '#555', fontSize: 18 },
  emptyText: { color: '#555', fontSize: 14, textAlign: 'center', marginTop: 24 },
});
