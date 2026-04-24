import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  Alert, TouchableOpacity, Image,
} from 'react-native';
import api from '../services/api';
import { Colors, Radii, Shadows } from '../theme';

export default function MatchesScreen({ navigation }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await api.get('/matches');
        setMatches(res.data);
      } catch {
        Alert.alert('Hata', 'Eşleşmeler yüklenemedi');
      } finally {
        setLoading(false);
      }
    };
    fetchMatches();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.red} size="large" />
      </View>
    );
  }

  if (matches.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyEmoji}>🎬</Text>
        <Text style={styles.emptyTitle}>Henüz eşleşmen yok</Text>
        <Text style={styles.emptySub}>
          Beğendiğin kişiler seni de beğenince burada görünür.
        </Text>
      </View>
    );
  }

  const sorted = [...matches].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  const today = sorted.filter(isToday);
  const older = sorted.filter((m) => !isToday(m));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Eşleşmeler</Text>
      </View>

      {/* Bugünkü eşleşmeler — yatay scroll */}
      {today.length > 0 && (
        <View style={styles.todaySection}>
          <Text style={styles.sectionLabel}>Yeni</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={today}
            keyExtractor={(item) => item.matchId + '_h'}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.todayCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Chat', {
                  matchId: item.matchId, otherUser: item.user,
                })}
              >
                <View style={styles.todayAvatarRing}>
                  <MatchAvatar user={item.user} size={54} />
                </View>
                <Text style={styles.todayName} numberOfLines={1}>
                  {item.user.name.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Tüm eşleşmeler — dikey liste */}
      <View style={styles.listSection}>
        {older.length > 0 && today.length > 0 && (
          <Text style={[styles.sectionLabel, { marginHorizontal: 16, marginBottom: 10 }]}>Önceki</Text>
        )}
        <FlatList
          data={older.length > 0 ? older : sorted}
          keyExtractor={(item) => item.matchId}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item }) => (
            <MatchRow
              item={item}
              onPress={() => navigation.navigate('Chat', {
                matchId: item.matchId, otherUser: item.user,
              })}
              onAvatarPress={() => navigation.navigate('UserProfile', { userId: item.user.id })}
            />
          )}
        />
      </View>
    </View>
  );
}

function MatchRow({ item, onPress, onAvatarPress }) {
  const daysAgo = getDaysAgo(item.createdAt);
  const isNew = isToday(item);

  return (
    <TouchableOpacity style={styles.matchCard} onPress={onPress} activeOpacity={0.75}>
      <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.9}>
        <View style={isNew ? styles.avatarRingNew : null}>
          <MatchAvatar user={item.user} size={50} />
        </View>
      </TouchableOpacity>

      <View style={styles.matchInfo}>
        <View style={styles.matchTop}>
          <Text style={styles.matchName}>{item.user.name}</Text>
          {isNew
            ? <View style={styles.newBadge}><Text style={styles.newBadgeText}>Yeni</Text></View>
            : <Text style={styles.matchDate}>{daysAgo}</Text>
          }
        </View>
        {item.user.bio
          ? <Text style={styles.matchBio} numberOfLines={1}>{item.user.bio}</Text>
          : <Text style={styles.matchBioFallback}>Sohbet başlat →</Text>
        }
      </View>

      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

function MatchAvatar({ user, size }) {
  const AVATAR_COLORS = ['#c8102e', '#1d6a8a', '#2a6a3a', '#6a2a7a', '#6a4a1a'];
  const colorIndex = user.name?.charCodeAt(0) % AVATAR_COLORS.length ?? 0;

  if (user?.avatar) {
    return (
      <Image
        source={{ uri: user.avatar }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: Colors.bgCard }}
      />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: AVATAR_COLORS[colorIndex],
      justifyContent: 'center', alignItems: 'center',
    }}>
      <Text style={{ color: '#fff', fontSize: size * 0.38, fontWeight: '800' }}>
        {user?.name?.[0]?.toUpperCase()}
      </Text>
    </View>
  );
}

// ─── Yardımcı fonksiyonlar ───────────────────────────────────────────────────

function isToday(match) {
  const d = new Date(match.createdAt);
  const now = new Date();
  return d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
}

function getDaysAgo(dateStr) {
  const diff = Math.floor((new Date() - new Date(dateStr)) / 86400000);
  if (diff === 0) return 'Bugün';
  if (diff === 1) return 'Dün';
  return `${diff} gün önce`;
}

// ─── Stiller ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: {
    flex: 1, backgroundColor: Colors.bg,
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },

  // Header
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, color: Colors.textPrimary },

  // Bugünkü eşleşmeler (yatay)
  todaySection: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1.2,
    textTransform: 'uppercase', color: Colors.textMuted,
    marginBottom: 12, paddingHorizontal: 16,
  },
  todayCard: { alignItems: 'center', gap: 7, width: 70 },
  todayAvatarRing: {
    padding: 2,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: Colors.red,
  },
  todayName: {
    fontSize: 11, color: Colors.textSecondary,
    fontWeight: '600', textAlign: 'center',
  },

  // Liste
  listSection: { flex: 1 },
  matchCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.lg, padding: 14,
    borderWidth: 0.5, borderColor: Colors.border,
    gap: 12,
  },
  avatarRingNew: {
    padding: 2,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: Colors.red,
  },
  matchInfo: { flex: 1 },
  matchTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 4,
  },
  matchName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  matchDate: { fontSize: 10, color: Colors.textMuted },
  newBadge: {
    backgroundColor: Colors.redDim,
    borderRadius: Radii.pill,
    borderWidth: 0.5, borderColor: Colors.redBorder,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  newBadgeText: { fontSize: 10, fontWeight: '800', color: Colors.red },
  matchBio: { fontSize: 12, color: Colors.textSecondary },
  matchBioFallback: { fontSize: 12, color: Colors.textMuted },
  chevron: { fontSize: 18, color: Colors.textHint, marginLeft: -4 },

  // Boş durum
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: Colors.textPrimary, fontSize: 19, fontWeight: '800', marginBottom: 8 },
  emptySub: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
