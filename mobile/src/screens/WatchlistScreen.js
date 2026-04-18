import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, Image, StyleSheet,
  ActivityIndicator, TouchableOpacity, Alert, Pressable,
} from 'react-native';
import api from '../services/api';
import { Colors, Radii, Shadows } from '../theme';

export default function WatchlistScreen({ navigation }) {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWatchlist = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/movies/watchlist');
      setWatchlist(res.data);
    } catch {
      Alert.alert('Hata', 'Liste yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWatchlist(); }, []);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Swipe');
    }
  };

  const handleRemove = async (tmdbId) => {
    try {
      await api.delete(`/movies/watchlist/${tmdbId}`);
      setWatchlist((prev) => prev.filter((m) => m.tmdbId !== tmdbId));
    } catch {
      Alert.alert('Hata', 'Kaldırılamadı');
    }
  };

  const handleMoveToProfile = async (item) => {
    try {
      await api.post('/movies/add', {
        tmdbId: item.tmdbId, title: item.title, poster: item.poster, year: item.year,
      });
      await api.delete(`/movies/watchlist/${item.tmdbId}`);
      setWatchlist((prev) => prev.filter((m) => m.tmdbId !== item.tmdbId));
      Alert.alert('Eklendi!', `"${item.title}" filmlerine taşındı.`);
    } catch {
      Alert.alert('Hata', 'İşlem başarısız');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.red} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Sonra İzle</Text>
          {watchlist.length > 0 && (
            <Text style={styles.headerSub}>{watchlist.length} film sıranda</Text>
          )}
        </View>
        <View style={{ width: 36 }} />
      </View>

      {watchlist.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>Liste boş</Text>
          <Text style={styles.emptySub}>
            Swipe ekranında yukarı kaydırarak film ekleyebilirsin
          </Text>
          <Pressable
            style={styles.goSwipeBtn}
            onPress={() => navigation.navigate('Swipe')}
          >
            <Text style={styles.goSwipeBtnText}>Film Keşfet</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={watchlist}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <WatchlistCard
              item={item}
              onDetail={() => navigation.navigate('MovieDetail', { tmdbId: item.tmdbId, title: item.title })}
              onMove={() => handleMoveToProfile(item)}
              onRemove={() => handleRemove(item.tmdbId)}
            />
          )}
        />
      )}
    </View>
  );
}

function WatchlistCard({ item, onDetail, onMove, onRemove }) {
  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={onDetail} activeOpacity={0.9}>
        {item.poster
          ? <Image source={{ uri: item.poster }} style={styles.poster} />
          : (
            <View style={styles.posterFallback}>
              <Text style={{ fontSize: 24 }}>🎬</Text>
            </View>
          )
        }
      </TouchableOpacity>

      <TouchableOpacity style={styles.info} onPress={onDetail} activeOpacity={0.8}>
        <Text style={styles.movieTitle} numberOfLines={2}>{item.title}</Text>
        {item.year && <Text style={styles.movieYear}>{item.year}</Text>}
        <Text style={styles.addedAt}>
          {new Date(item.addedAt).toLocaleDateString('tr-TR')} · eklendi
        </Text>
      </TouchableOpacity>

      <View style={styles.cardActions}>
        <Pressable style={styles.moveBtn} onPress={onMove}>
          <Text style={styles.moveBtnText}>İzledim ✓</Text>
        </Pressable>
        <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
          <Text style={styles.removeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.bgCard, borderWidth: 0.5, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  backBtnText: { fontSize: 18, color: Colors.textPrimary, lineHeight: 20 },
  headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, color: Colors.textPrimary, textAlign: 'center' },
  headerSub: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginTop: 2 },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.lg, borderWidth: 0.5, borderColor: Colors.border,
    overflow: 'hidden',
  },
  poster: { width: 72, height: 108 },
  posterFallback: {
    width: 72, height: 108, backgroundColor: Colors.bgElevated,
    justifyContent: 'center', alignItems: 'center',
  },
  info: { flex: 1, padding: 12, justifyContent: 'center' },
  movieTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4, lineHeight: 19 },
  movieYear: { fontSize: 12, color: Colors.textSecondary, marginBottom: 6 },
  addedAt: { fontSize: 10, color: Colors.textMuted },
  cardActions: { justifyContent: 'space-between', alignItems: 'flex-end', padding: 10 },
  moveBtn: {
    backgroundColor: Colors.red, borderRadius: Radii.sm,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  moveBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  removeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.bgElevated, justifyContent: 'center', alignItems: 'center',
    borderWidth: 0.5, borderColor: Colors.border,
  },
  removeBtnText: { fontSize: 12, color: Colors.textSecondary },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { color: Colors.textPrimary, fontSize: 19, fontWeight: '800', marginBottom: 8 },
  emptySub: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 28 },
  goSwipeBtn: {
    backgroundColor: Colors.red, borderRadius: Radii.md,
    paddingVertical: 14, paddingHorizontal: 32,
  },
  goSwipeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
