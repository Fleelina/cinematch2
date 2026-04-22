import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Image,
} from 'react-native';
import api from '../services/api';

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

export default function UserMoviesScreen({ route, navigation }) {
  const { userId, name } = route.params;
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/users/${userId}/stats`)
      .then((res) => setMovies(res.data?.movies || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{'\u2190'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{name} filmleri</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#E50914" size="large" />
        </View>
      ) : (
        <FlatList
          data={movies}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={(
            <View style={styles.center}>
              <Text style={styles.emptyText}>Goruntulenecek film yok.</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('MovieDetail', { tmdbId: item.tmdbId, title: item.title })}
            >
              <Poster uri={item.poster} />
              <View style={styles.body}>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.meta}>
                  {item.year ? `${item.year} · ` : ''}
                  {item.rating != null ? `Puan: ${item.rating}/10` : 'Henuz puanlandirmadi'}
                </Text>
              </View>
              {item.rating != null ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.rating}</Text>
                </View>
              ) : (
                <View style={styles.unratedBadge}>
                  <Text style={styles.unratedBadgeText}>-</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
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
  listContent: { paddingHorizontal: 16, paddingBottom: 28 },
  separator: { height: 1, backgroundColor: '#222' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  poster: { width: 50, height: 72, borderRadius: 10, backgroundColor: '#1c1c1c' },
  posterFallback: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#222' },
  body: { flex: 1 },
  title: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  meta: { color: '#8b8b95', fontSize: 12 },
  badge: {
    minWidth: 42,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(229, 9, 20, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.24)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  badgeText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  unratedBadge: {
    minWidth: 42,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  unratedBadgeText: { color: '#8b8b95', fontSize: 14, fontWeight: '700' },
  emptyText: { color: '#888', fontSize: 14, textAlign: 'center' },
});
