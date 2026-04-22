import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert, Modal,
} from 'react-native';
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
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: '#E50914',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: '#c0392b',
    }}>
      <Text style={{ color: '#fff', fontSize: size * 0.4, fontWeight: '700' }}>
        {user?.name?.[0]?.toUpperCase()}
      </Text>
    </View>
  );
}

function StatCard({ icon, value, label, onPress }) {
  return (
    <TouchableOpacity style={styles.statCard} activeOpacity={onPress ? 0.85 : 1} onPress={onPress} disabled={!onPress}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
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
  const [profileOptionsVisible, setProfileOptionsVisible] = useState(false);
  const [blockedIds, setBlockedIds] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [profileRes, statsRes, blockedRes] = await Promise.all([
          api.get(`/users/${userId}/profile`),
          api.get(`/users/${userId}/stats`),
          api.get('/users/profile/blocked'),
        ]);
        setProfile(profileRes.data);
        setStats(statsRes.data);
        setBlockedIds((blockedRes.data || []).map((item) => item.id));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [userId]);

  const isBlocked = useMemo(() => blockedIds.includes(userId), [blockedIds, userId]);

  const handleBlockUser = async () => {
    setProfileOptionsVisible(false);

    try {
      await api.post(`/matches/block-user/${userId}`);
      setBlockedIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
      Alert.alert('Tamam', 'Kullanici engellendi.');
    } catch (err) {
      Alert.alert('Hata', 'Kullanici engellenemedi');
    }
  };

  const handleUnblockUser = async () => {
    setProfileOptionsVisible(false);

    try {
      await api.post(`/matches/unblock/${userId}`);
      setBlockedIds((prev) => prev.filter((id) => id !== userId));
      Alert.alert('Tamam', 'Engel kaldirildi.');
    } catch (err) {
      Alert.alert('Hata', 'Engel kaldirilamadi');
    }
  };

  const confirmUnblock = () => {
    Alert.alert(
      'Engeli Kaldir',
      'Bu kullanicinin engeli kaldirilsin mi?',
      [
        { text: 'Iptal', style: 'cancel' },
        { text: 'Kaldir', onPress: handleUnblockUser },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#E50914" size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Profil yuklenemedi</Text>
      </View>
    );
  }

  const displayName = profile.showAge && profile.age
    ? `${profile.name}, ${profile.age}`
    : profile.name;

  return (
    <>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>{'\u2190'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profil</Text>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setProfileOptionsVisible(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.menuBtnText}>{'\u22EF'}</Text>
          </TouchableOpacity>
        </View>

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
          {profile.username ? (
            <Text style={styles.usernameText}>@{profile.username}</Text>
          ) : null}
          {profile.bio ? (
            <Text style={styles.bioText}>{profile.bio}</Text>
          ) : null}
          {isBlocked ? (
            <TouchableOpacity activeOpacity={0.8} onPress={confirmUnblock}>
              <Text style={styles.blockedHint}>Engelledin.</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {stats && (
          <View style={styles.statsRow}>
            <StatCard
              icon="🎬"
              value={stats.movieCount ?? 0}
              label="Film"
              onPress={() => navigation.navigate('UserMovies', { userId, name: profile.name })}
            />
            <StatCard icon="❤️" value={stats.matchCount ?? 0} label="Eslesme" />
            <StatCard icon="⭐" value={stats.avgRating ?? '-'} label="Ort. Puan" />
          </View>
        )}

        {stats?.topMovies?.length > 0 && (
          <View style={styles.section}>
            <SectionHeader emoji="⭐" title="Son Eklenenler" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
              {stats.topMovies.map((movie, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.movieThumb}
                  onPress={() => navigation.navigate('MovieDetail', { tmdbId: movie.tmdbId, title: movie.title })}
                >
                  {movie.poster ? (
                    <Image source={{ uri: movie.poster }} style={styles.movieThumbImg} />
                  ) : (
                    <View style={[styles.movieThumbImg, styles.movieThumbFallback]}>
                      <Text style={{ fontSize: 28 }}>🎬</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {stats && (
          <View style={styles.section}>
            <SectionHeader emoji="🎞️" title="Izleme Aliskanliklari" />
            <View style={styles.habitsCard}>
              {stats.avgRating && (
                <View style={styles.habitRow}>
                  <Text style={styles.habitLabel}>Ortalama puan</Text>
                  <Text style={styles.habitValue}>⭐ {stats.avgRating}</Text>
                </View>
              )}
              {stats.favoriteEra && (
                <View style={styles.habitRow}>
                  <Text style={styles.habitLabel}>Favori donem</Text>
                  <Text style={styles.habitValue}>{stats.favoriteEra}</Text>
                </View>
              )}
              {stats.watchStyle && (
                <View style={[styles.habitRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.habitLabel}>Izleme tarzi</Text>
                  <Text style={styles.habitValue}>{stats.watchStyle.label} {stats.watchStyle.emoji}</Text>
                </View>
              )}
              {stats.movieCount === 0 && (
                <Text style={styles.habitEmpty}>Henuz film eklenmemis.</Text>
              )}
            </View>
          </View>
        )}

        {matchId && !isBlocked ? (
          <TouchableOpacity
            style={styles.chatCta}
            onPress={() => navigation.navigate('Chat', { matchId, otherUser: profile })}
          >
            <Text style={styles.chatCtaText}>💬 Mesaj Gonder</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <Modal
        visible={profileOptionsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileOptionsVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setProfileOptionsVisible(false)}
        >
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle}>Profil Secenekleri</Text>

            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.85}
              onPress={() => {
                if (isBlocked) {
                  confirmUnblock();
                  return;
                }

                Alert.alert(
                  'Engelle',
                  'Bu kullanici engellenecek. Emin misin?',
                  [
                    { text: 'Iptal', style: 'cancel' },
                    { text: 'Engelle', style: 'destructive', onPress: handleBlockUser },
                  ]
                );
              }}
            >
              <Text
                style={[styles.menuItemText, isBlocked ? styles.menuItemTextNeutral : styles.menuItemTextDanger]}
              >
                {isBlocked ? 'Engeli kaldir' : 'Engelle'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemDisabled]}
              activeOpacity={1}
            >
              <Text style={styles.menuItemTextDisabled}>Bildir</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemCancel]}
              onPress={() => setProfileOptionsVisible(false)}
            >
              <Text style={styles.menuItemTextCancel}>Iptal</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  center: { flex: 1, backgroundColor: '#0f0f0f', justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#888', fontSize: 15 },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 8,
  },
  backBtn: { width: 40, padding: 4 },
  backBtnText: { color: '#fff', fontSize: 24, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  menuBtn: { width: 40, alignItems: 'flex-end', justifyContent: 'center' },
  menuBtnText: { color: '#fff', fontSize: 26, fontWeight: '700', lineHeight: 26 },

  heroSection: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20 },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#1c1c1c',
    borderRadius: 12,
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  displayName: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  usernameText: { color: '#E50914', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  bioText: { color: '#aaa', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  blockedHint: {
    color: '#7d7d86',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    textDecorationLine: 'underline',
    textDecorationColor: '#4d4d53',
  },

  statsRow: { flexDirection: 'row', marginHorizontal: 16, gap: 10, marginBottom: 8 },
  statCard: {
    flex: 1,
    backgroundColor: '#181818',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#242424',
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
  movieThumbFallback: { backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' },

  habitsCard: {
    backgroundColor: '#181818',
    borderRadius: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#242424',
    overflow: 'hidden',
  },
  habitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  habitLabel: { color: '#888', fontSize: 14 },
  habitValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  habitEmpty: { color: '#444', fontSize: 13, textAlign: 'center', padding: 20, fontStyle: 'italic' },

  chatCta: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: '#E50914',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  chatCtaText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: '#181818',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderColor: '#242424',
  },
  menuTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#202020',
    marginBottom: 10,
  },
  menuItemDisabled: { opacity: 0.55 },
  menuItemCancel: { backgroundColor: '#111' },
  menuItemText: { color: '#fff', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  menuItemTextDanger: { color: '#ff6b6b' },
  menuItemTextNeutral: { color: '#d4d4d8' },
  menuItemTextDisabled: { color: '#888', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  menuItemTextCancel: { color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' },
});
