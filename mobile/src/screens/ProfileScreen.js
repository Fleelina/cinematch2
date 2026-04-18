import React, { useState, useCallback } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Colors, Radii, Shadows } from '../theme';

export default function ProfileScreen({ navigation }) {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/users/profile/stats');
      setStats(res.data);
    } catch { /* sessiz */ }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchStats(); }, []));

  const displayName = user?.showAge && user?.age ? `${user.name}, ${user.age}` : user?.name;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 50 }}
    >
      {/* Header */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Profil</Text>
        <Pressable
          style={({ pressed }) => [styles.settingsBtn, pressed && { opacity: 0.7 }]}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </Pressable>
      </View>

      {loading ? <SkeletonProfile /> : (
        <>
          {/* Hero */}
          <View style={styles.hero}>
            <Avatar user={user} size={96} />
            <Text style={styles.displayName}>{displayName}</Text>
            {user?.username ? <Text style={styles.username}>@{user.username}</Text> : null}
            {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatCard icon="🎬" value={stats?.movieCount ?? 0} label="Film" />
            <StatCard icon="❤️" value={stats?.matchCount ?? 0} label="Eşleşme" />
            <StatCard
              icon="⭐"
              value={stats?.avgRating || '—'}
              label="Ort. Puan"
              highlight={!!stats?.avgRating}
            />
          </View>

          {/* Son eklenenler */}
          {stats?.topMovies?.length > 0 && (
            <Section emoji="🎞️" title="Son Eklenenler">
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
                        <View style={[styles.movieThumbImg, styles.movieThumbFallback]}>
                          <Text style={{ fontSize: 24 }}>🎬</Text>
                        </View>
                      )
                    }
                    <View style={styles.movieThumbOverlay} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Section>
          )}

          {/* Alışkanlıklar */}
          {stats && (
            <Section emoji="📊" title="İzleme Alışkanlıkları">
              <View style={styles.habitsCard}>
                {stats.avgRating && (
                  <HabitRow label="Ortalama puan" value={`⭐ ${stats.avgRating}`} />
                )}
                {stats.favoriteEra && (
                  <HabitRow label="Favori dönem" value={stats.favoriteEra} />
                )}
                {stats.watchStyle && (
                  <HabitRow
                    label="İzleme tarzı"
                    value={`${stats.watchStyle.label} ${stats.watchStyle.emoji}`}
                    last
                  />
                )}
                {stats.movieCount === 0 && (
                  <Text style={styles.habitsEmpty}>
                    Film ekledikçe istatistiklerin burada görünür.
                  </Text>
                )}
              </View>
            </Section>
          )}

          {/* Profil güçlendir CTA */}
          {stats && stats.movieCount < 10 && (
            <View style={styles.boostCard}>
              <View style={styles.boostLeft}>
                <Text style={styles.boostEmoji}>🔥</Text>
                <View>
                  <Text style={styles.boostTitle}>Profilini güçlendir</Text>
                  <Text style={styles.boostSub}>
                    {10 - stats.movieCount} film daha ekle, daha iyi eşleş
                  </Text>
                </View>
              </View>
              <Pressable
                style={({ pressed }) => [styles.boostBtn, pressed && { opacity: 0.85 }]}
                onPress={() => navigation.navigate('Filmlerim')}
              >
                <Text style={styles.boostBtnText}>Film Ekle</Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

// ─── Alt bileşenler ─────────────────────────────────────────────────────────

function Avatar({ user, size }) {
  if (user?.avatar) {
    return (
      <View style={styles.avatarWrap}>
        <Image
          source={{ uri: user.avatar }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
        <View style={[styles.avatarRing, {
          width: size + 8, height: size + 8, borderRadius: (size + 8) / 2,
          top: -4, left: -4,
        }]} />
      </View>
    );
  }
  return (
    <View style={styles.avatarWrap}>
      <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={{ color: '#fff', fontSize: size * 0.38, fontWeight: '800' }}>
          {user?.name?.[0]?.toUpperCase()}
        </Text>
      </View>
      <View style={[styles.avatarRing, {
        width: size + 8, height: size + 8, borderRadius: (size + 8) / 2,
        top: -4, left: -4,
      }]} />
    </View>
  );
}

function StatCard({ icon, value, label, highlight }) {
  return (
    <View style={[styles.statCard, highlight && styles.statCardHighlight]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, highlight && { color: Colors.gold }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Section({ emoji, title, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionEmoji}>{emoji}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function HabitRow({ label, value, last }) {
  return (
    <View style={[styles.habitRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.habitLabel}>{label}</Text>
      <Text style={styles.habitValue}>{value}</Text>
    </View>
  );
}

function SkeletonProfile() {
  return (
    <>
      <View style={styles.hero}>
        <View style={[styles.skeletonCircle, { width: 96, height: 96, borderRadius: 48, marginBottom: 14 }]} />
        <View style={[styles.skeletonBlock, { width: 140, height: 18, marginBottom: 8 }]} />
        <View style={[styles.skeletonBlock, { width: 100, height: 13 }]} />
      </View>
      <View style={styles.statsRow}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.statCard, { backgroundColor: Colors.bgCard }]}>
            <View style={[styles.skeletonBlock, { width: 28, height: 28, marginBottom: 8, borderRadius: 6 }]} />
            <View style={[styles.skeletonBlock, { width: 36, height: 22, marginBottom: 6 }]} />
            <View style={[styles.skeletonBlock, { width: 48, height: 10 }]} />
          </View>
        ))}
      </View>
    </>
  );
}

// ─── Stiller ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8,
  },
  topBarTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, color: Colors.textPrimary },
  settingsBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.bgCard, borderWidth: 0.5, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  settingsIcon: { fontSize: 16 },

  // Hero
  hero: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 22 },
  avatarWrap: { position: 'relative', marginBottom: 16 },
  avatarFallback: {
    backgroundColor: Colors.red, justifyContent: 'center', alignItems: 'center',
  },
  avatarRing: {
    position: 'absolute', borderWidth: 1.5, borderColor: Colors.redBorder,
  },
  displayName: {
    fontSize: 22, fontWeight: '800', letterSpacing: -0.4,
    color: Colors.textPrimary, marginBottom: 5, textAlign: 'center',
  },
  username: { fontSize: 12, color: Colors.red, fontWeight: '600', marginBottom: 6 },
  bio: {
    fontSize: 13, color: Colors.textSecondary, textAlign: 'center',
    lineHeight: 19, marginTop: 2,
  },

  // Stats
  statsRow: { flexDirection: 'row', marginHorizontal: 16, gap: 10, marginBottom: 8 },
  statCard: {
    flex: 1, backgroundColor: Colors.bgCard,
    borderRadius: Radii.lg, paddingVertical: 16,
    alignItems: 'center', gap: 4,
    borderWidth: 0.5, borderColor: Colors.border,
  },
  statCardHighlight: { borderColor: 'rgba(240,180,41,0.3)' },
  statIcon: { fontSize: 20 },
  statValue: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: 10, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Section
  section: { marginHorizontal: 16, marginTop: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  sectionEmoji: { fontSize: 17 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },

  // Film thumb
  movieThumb: { marginRight: 10, position: 'relative' },
  movieThumbImg: { width: 98, height: 142, borderRadius: Radii.md, backgroundColor: Colors.bgElevated },
  movieThumbFallback: { justifyContent: 'center', alignItems: 'center' },
  movieThumbOverlay: {
    position: 'absolute', inset: 0, borderRadius: Radii.md,
    borderWidth: 0.5, borderColor: Colors.border,
  },

  // Alışkanlıklar
  habitsCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.lg, marginTop: 12,
    borderWidth: 0.5, borderColor: Colors.border, overflow: 'hidden',
  },
  habitRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: Colors.border,
  },
  habitLabel: { fontSize: 13, color: Colors.textSecondary },
  habitValue: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  habitsEmpty: {
    color: Colors.textHint, fontSize: 12, textAlign: 'center',
    padding: 20, fontStyle: 'italic',
  },

  // Boost CTA
  boostCard: {
    marginHorizontal: 16, marginTop: 24,
    backgroundColor: '#110508',
    borderRadius: Radii.lg, borderWidth: 0.5, borderColor: 'rgba(200,16,46,0.2)',
    padding: 16, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  boostLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  boostEmoji: { fontSize: 26 },
  boostTitle: { color: Colors.textPrimary, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  boostSub: { color: Colors.textMuted, fontSize: 11 },
  boostBtn: {
    backgroundColor: Colors.red, borderRadius: Radii.md,
    paddingHorizontal: 14, paddingVertical: 10,
    ...Shadows.red,
  },
  boostBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  // Skeleton
  skeletonCircle: { backgroundColor: Colors.bgElevated },
  skeletonBlock: { backgroundColor: Colors.bgElevated, borderRadius: Radii.sm },
});
