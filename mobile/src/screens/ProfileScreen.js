import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function Avatar({ user, size = 90 }) {
  if (user?.avatar) {
    return (
      <Image
        source={{ uri: user.avatar }}
        style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: '#E50914' }}
      />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: '#E50914', justifyContent: 'center', alignItems: 'center',
      borderWidth: 3, borderColor: '#E50914',
    }}>
      <Text style={{ color: '#fff', fontSize: size * 0.4, fontWeight: '700' }}>
        {user?.name?.[0]?.toUpperCase()}
      </Text>
    </View>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({ emoji, title }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionEmoji}>{emoji}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/users/profile/stats');
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchStats();
  }, []));

  const displayName = user?.showAge && user?.age
    ? `${user.name}, ${user.age}`
    : user?.name;

  if (loadingStats) return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.topBar}>
        <Text style={styles.headerTitle}>Profil</Text>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#1e1e1e' }} />
      </View>
      <View style={styles.heroSection}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#1e1e1e', marginBottom: 14 }} />
        <View style={{ width: 140, height: 20, borderRadius: 8, backgroundColor: '#1e1e1e', marginBottom: 8 }} />
        <View style={{ width: 100, height: 14, borderRadius: 6, backgroundColor: '#1e1e1e' }} />
      </View>
      <View style={{ flexDirection: 'row', marginHorizontal: 16, gap: 10 }}>
        {[1,2,3].map((i) => <View key={i} style={{ flex: 1, height: 80, borderRadius: 16, backgroundColor: '#1e1e1e' }} />)}
      </View>
    </ScrollView>
  );

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Header */}
      <View style={styles.topBar}>
        <Text style={styles.headerTitle}>Profil</Text>
        <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Avatar + isim */}
      <View style={styles.heroSection}>
        <View style={styles.avatarWrap}>
          <Avatar user={user} size={96} />
          {user?.avatarType === 'character' && (
            <View style={styles.avatarBadge}>
              <Text style={{ fontSize: 14 }}>🎭</Text>
            </View>
          )}
        </View>
        <Text style={styles.displayName}>{displayName}</Text>
        {user?.bio
          ? <Text style={styles.bioText}>{user.bio}</Text>
          : null}
        {user?.username && (
          <Text style={styles.usernameText}>@{user.username}</Text>
        )}
      </View>

      {/* İstatistik kartları */}
      {loadingStats
        ? <ActivityIndicator color="#E50914" style={{ marginVertical: 20 }} />
        : (
          <View style={styles.statsRow}>
            <StatCard icon="🎬" value={stats?.movieCount ?? 0} label="Film" />
            <StatCard icon="❤️" value={stats?.matchCount ?? 0} label="Eşleşme" />
            <StatCard
              icon="⭐"
              value={stats?.avgRating ? stats.avgRating : '—'}
              label="Ort. Puan"
            />
          </View>
        )
      }

      {/* Top Movies */}
      {stats?.topMovies?.length > 0 && (
        <View style={styles.section}>
          <SectionHeader emoji="⭐" title="Son Eklenenler" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
            {stats.topMovies.map((m, i) => (
              <TouchableOpacity
                key={i}
                style={styles.movieThumb}
                onPress={() => navigation.navigate('MovieDetail', { tmdbId: m.tmdbId, title: m.title })}
              >
                {m.poster
                  ? <Image source={{ uri: m.poster }} style={styles.movieThumbImg} />
                  : (
                    <View style={[styles.movieThumbImg, { backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' }]}>
                      <Text style={{ fontSize: 28 }}>🎬</Text>
                    </View>
                  )
                }
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Viewing Habits */}
      {stats && (
        <View style={styles.section}>
          <SectionHeader emoji="🎞️" title="İzleme Alışkanlıkları" />
          <View style={styles.habitsCard}>
            {stats.avgRating && (
              <View style={styles.habitRow}>
                <Text style={styles.habitLabel}>Ortalama puan</Text>
                <Text style={styles.habitValue}>⭐ {stats.avgRating}</Text>
              </View>
            )}
            {stats.favoriteEra && (
              <View style={styles.habitRow}>
                <Text style={styles.habitLabel}>Favori dönem</Text>
                <Text style={styles.habitValue}>{stats.favoriteEra}</Text>
              </View>
            )}
            {stats.watchStyle && (
              <View style={styles.habitRow}>
                <Text style={styles.habitLabel}>İzleme tarzı</Text>
                <Text style={styles.habitValue}>{stats.watchStyle.label} {stats.watchStyle.emoji}</Text>
              </View>
            )}
            {stats.movieCount === 0 && (
              <Text style={styles.habitEmpty}>Film ekledikçe istatistiklerin burada görünür.</Text>
            )}
          </View>
        </View>
      )}

      {/* Boost CTA — az film eklendiyse */}
      {stats && stats.movieCount < 10 && (
        <View style={styles.boostCard}>
          <View style={styles.boostLeft}>
            <Text style={styles.boostEmoji}>🔥</Text>
            <View>
              <Text style={styles.boostTitle}>Profilini güçlendir</Text>
              <Text style={styles.boostSub}>Daha fazla film ekle, daha iyi eşleş</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.boostBtn}
            onPress={() => navigation.navigate('Filmlerim')}
          >
            <Text style={styles.boostBtnText}>Film Ekle</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8,
  },
  headerTitle: { color: '#fff', fontSize: 26, fontWeight: '700' },
  settingsIcon: { fontSize: 22 },

  heroSection: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20 },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatarBadge: {
    position: 'absolute', bottom: 2, right: 2,
    backgroundColor: '#1c1c1c', borderRadius: 12, width: 26, height: 26,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333',
  },
  displayName: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  bioText: { color: '#aaa', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 6 },
  usernameText: { color: '#E50914', fontSize: 13, fontWeight: '600' },

  statsRow: { flexDirection: 'row', marginHorizontal: 16, gap: 10, marginBottom: 8 },
  statCard: {
    flex: 1, backgroundColor: '#181818', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#242424',
  },
  statIcon: { fontSize: 20 },
  statValue: { color: '#fff', fontSize: 20, fontWeight: '700' },
  statLabel: { color: '#666', fontSize: 11 },

  section: { marginHorizontal: 16, marginTop: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionEmoji: { fontSize: 20 },
  sectionTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },

  movieThumb: { marginRight: 10 },
  movieThumbImg: { width: 100, height: 148, borderRadius: 12, backgroundColor: '#1c1c1c' },

  habitsCard: {
    backgroundColor: '#181818', borderRadius: 16, marginTop: 12,
    borderWidth: 1, borderColor: '#242424', overflow: 'hidden',
  },
  habitRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#222',
  },
  habitLabel: { color: '#888', fontSize: 14 },
  habitValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  habitEmpty: { color: '#444', fontSize: 13, textAlign: 'center', padding: 20, fontStyle: 'italic' },

  boostCard: {
    marginHorizontal: 16, marginTop: 24,
    backgroundColor: '#1a0505', borderRadius: 16,
    borderWidth: 1, borderColor: '#3a0a0a',
    padding: 16, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  boostLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  boostEmoji: { fontSize: 28 },
  boostTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  boostSub: { color: '#888', fontSize: 12 },
  boostBtn: {
    backgroundColor: '#E50914', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  boostBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
