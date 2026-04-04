import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
      borderWidth: 3, borderColor: '#c0392b',
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

export default function UserProfileScreen({ route, navigation }) {
  const { userId, matchId } = route.params;
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [profileRes, statsRes] = await Promise.all([
          api.get(`/users/${userId}/profile`),
          api.get(`/users/${userId}/stats`),
        ]);
        setProfile(profileRes.data);
        setStats(statsRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [userId]);

  if (loading) return (
    <View style={styles.center}><ActivityIndicator color="#E50914" size="large" /></View>
  );

  if (!profile) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>Profil yüklenemedi</Text>
    </View>
  );

  const displayName = profile.showAge && profile.age
    ? `${profile.name}, ${profile.age}`
    : profile.name;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil</Text>
        {/* Mesaj gönder butonu — matchId varsa */}
        {matchId && (
          <TouchableOpacity
            style={styles.msgBtn}
            onPress={() => navigation.navigate('Chat', { matchId, otherUser: profile })}
          >
            <Text style={styles.msgBtnText}>💬</Text>
          </TouchableOpacity>
        )}
        {!matchId && <View style={{ width: 40 }} />}
      </View>

      {/* Avatar + isim */}
      <View style={styles.heroSection}>
        <View style={styles.avatarWrap}>
          <Avatar user={profile} size={96} />
          {profile.avatarType === 'character' && (
            <View style={styles.avatarBadge}>
              <Text style={{ fontSize: 14 }}>🎭</Text>
            </View>
          )}
        </View>
        <Text style={styles.displayName}>{displayName}</Text>
        {profile.username && (
          <Text style={styles.usernameText}>@{profile.username}</Text>
        )}
        {profile.bio && (
          <Text style={styles.bioText}>{profile.bio}</Text>
        )}
      </View>

      {/* İstatistik kartları */}
      {stats && (
        <View style={styles.statsRow}>
          <StatCard icon="🎬" value={stats.movieCount ?? 0} label="Film" />
          <StatCard icon="❤️" value={stats.matchCount ?? 0} label="Eşleşme" />
          <StatCard
            icon="⭐"
            value={stats.avgRating ?? '—'}
            label="Ort. Puan"
          />
        </View>
      )}

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
              <View style={[styles.habitRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.habitLabel}>İzleme tarzı</Text>
                <Text style={styles.habitValue}>{stats.watchStyle.label} {stats.watchStyle.emoji}</Text>
              </View>
            )}
            {stats.movieCount === 0 && (
              <Text style={styles.habitEmpty}>Henüz film eklenmemiş.</Text>
            )}
          </View>
        </View>
      )}

      {/* Mesaj gönder — alt CTA */}
      {matchId && (
        <TouchableOpacity
          style={styles.chatCta}
          onPress={() => navigation.navigate('Chat', { matchId, otherUser: profile })}
        >
          <Text style={styles.chatCtaText}>💬 Mesaj Gönder</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  center: { flex: 1, backgroundColor: '#0f0f0f', justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#888', fontSize: 15 },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 8,
  },
  backBtn: { width: 40, padding: 4 },
  backBtnText: { color: '#fff', fontSize: 24, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  msgBtn: { width: 40, alignItems: 'flex-end' },
  msgBtnText: { fontSize: 22 },

  heroSection: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20 },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatarBadge: {
    position: 'absolute', bottom: 2, right: 2,
    backgroundColor: '#1c1c1c', borderRadius: 12, width: 26, height: 26,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333',
  },
  displayName: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  usernameText: { color: '#E50914', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  bioText: { color: '#aaa', fontSize: 14, textAlign: 'center', lineHeight: 20 },

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

  chatCta: {
    marginHorizontal: 16, marginTop: 24,
    backgroundColor: '#E50914', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  chatCtaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
