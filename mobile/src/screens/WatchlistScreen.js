import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, Image, StyleSheet,
  ActivityIndicator, TouchableOpacity, Alert
} from 'react-native';
import api from '../services/api';

export default function WatchlistScreen({ navigation }) {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWatchlist = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/movies/watchlist');
      setWatchlist(res.data);
    } catch (err) {
      Alert.alert('Hata', 'Liste yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWatchlist(); }, []);

  const handleRemove = async (tmdbId) => {
    try {
      await api.delete(`/movies/watchlist/${tmdbId}`);
      setWatchlist((prev) => prev.filter((m) => m.tmdbId !== tmdbId));
    } catch (err) {
      Alert.alert('Hata', 'Kaldirilamadi');
    }
  };

  const handleMoveToProfile = async (item) => {
    try {
      await api.post('/movies/add', {
        tmdbId: item.tmdbId,
        title: item.title,
        poster: item.poster,
        year: item.year,
      });
      await api.delete(`/movies/watchlist/${item.tmdbId}`);
      setWatchlist((prev) => prev.filter((m) => m.tmdbId !== item.tmdbId));
      Alert.alert('Tamam!', `"${item.title}" filmlerine eklendi.`);
    } catch (err) {
      Alert.alert('Hata', 'Islem basarisiz');
    }
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color="#E50914" size="large" />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.header}>Sonra Izle</Text>
        <View style={{ width: 60 }} />
      </View>

      {watchlist.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyText}>Listelerin bos</Text>
          <Text style={styles.emptySubText}>Swipe ekraninda yukari kaydirarak film ekle</Text>
        </View>
      ) : (
        <FlatList
          data={watchlist}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity onPress={() => navigation.navigate('MovieDetail', { tmdbId: item.tmdbId, title: item.title })}>
                {item.poster
                  ? <Image source={{ uri: item.poster }} style={styles.poster} />
                  : <View style={styles.posterPlaceholder}><Text style={{ fontSize: 28 }}>🎬</Text></View>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.info}
                onPress={() => navigation.navigate('MovieDetail', { tmdbId: item.tmdbId, title: item.title })}
              >
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                {item.year ? <Text style={styles.year}>{item.year}</Text> : null}
                <Text style={styles.addedAt}>
                  {new Date(item.addedAt).toLocaleDateString('tr-TR')} tarihinde eklendi
                </Text>
              </TouchableOpacity>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.addBtn} onPress={() => handleMoveToProfile(item)}>
                  <Text style={styles.addBtnText}>+ Izledim</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(item.tmdbId)}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', paddingTop: 52, paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 20,
  },
  backBtn: { color: '#E50914', fontSize: 15, fontWeight: '600' },
  header: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptySubText: { color: '#888', fontSize: 14, textAlign: 'center' },
  card: {
    flexDirection: 'row', backgroundColor: '#1c1c1c',
    borderRadius: 14, marginBottom: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  poster: { width: 70, height: 100 },
  posterPlaceholder: {
    width: 70, height: 100, backgroundColor: '#333',
    justifyContent: 'center', alignItems: 'center',
  },
  info: { flex: 1, padding: 12, justifyContent: 'center' },
  title: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  year: { color: '#888', fontSize: 12, marginBottom: 4 },
  addedAt: { color: '#555', fontSize: 11 },
  cardActions: { justifyContent: 'space-between', padding: 10, alignItems: 'flex-end' },
  addBtn: {
    backgroundColor: '#E50914', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8,
  },
  addBtnText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  removeBtn: {
    backgroundColor: '#2a2a2a', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  removeBtnText: { color: '#888', fontSize: 13 },
});
