import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  FlatList, Image, Alert,
} from 'react-native';
import api from '../services/api';
import { Colors } from '../theme';

function Poster({ uri }) {
  if (uri) {
    return <Image source={{ uri }} style={styles.poster} />;
  }
  return (
    <View style={[styles.poster, styles.posterFallback]}>
      <Text style={{ fontSize: 20 }}>🎬</Text>
    </View>
  );
}

export default function MyMoviesScreen({ navigation }) {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMovies = useCallback(async () => {
    try {
      const res = await api.get('/movies/my');
      setMovies(res.data || []);
    } catch {
      Alert.alert('Hata', 'Filmler yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMovies(); }, [fetchMovies]);

  const removeMovie = async (movieId) => {
    try {
      await api.delete(`/movies/${movieId}`);
      setMovies((prev) => prev.filter((m) => m.id !== movieId));
    } catch {
      Alert.alert('Hata', 'Film kaldirilamadi');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Filmlerim</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.red} size="large" />
        </View>
      ) : (
        <FlatList
          data={movies}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            <Text style={styles.count}>{movies.length} film</Text>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyEmoji}>🎬</Text>
              <Text style={styles.emptyTitle}>Henuz film yok</Text>
              <Text style={styles.emptySub}>Filmlerim sekmesinden film ekleyebilirsin</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('MovieDetail', {
                tmdbId: item.tmdbId,
                title: item.title,
                poster: item.poster,
                year: item.year,
              })}
            >
              <Poster uri={item.poster} />
              <View style={styles.body}>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                {item.year ? <Text style={styles.meta}>{item.year}</Text> : null}
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
  },
  backBtn: { width: 40, padding: 4 },
  backBtnText: { color: '#fff', fontSize: 24, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerSpacer: { width: 40 },
  count: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1.2,
    textTransform: 'uppercase', color: Colors.textMuted,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  listContent: { paddingBottom: 28 },
  separator: { height: 0.5, backgroundColor: Colors.border, marginLeft: 78 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  poster: { width: 50, height: 72, borderRadius: 10, backgroundColor: Colors.bgCard },
  posterFallback: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#222' },
  body: { flex: 1 },
  title: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  meta: { color: Colors.textMuted, fontSize: 12 },
  removeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.bgElevated,
    justifyContent: 'center', alignItems: 'center',
  },
  removeBtnText: { fontSize: 11, color: Colors.textSecondary },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { color: Colors.textPrimary, fontSize: 17, fontWeight: '700', marginBottom: 6 },
  emptySub: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center' },
});
