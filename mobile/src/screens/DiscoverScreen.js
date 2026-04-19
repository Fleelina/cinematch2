import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, Image, StyleSheet, ActivityIndicator,
  TouchableOpacity, Animated, PanResponder, Dimensions, Alert, Pressable,
} from 'react-native';
import api from '../services/api';
import { Colors, Radii, Shadows } from '../theme';

const { width: SW, height: SH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SW * 0.25;
const CARD_H = SH * 0.56;

export default function DiscoverScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [round, setRound] = useState(1);

  const position = useRef(new Animated.ValueXY()).current;

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/discover');
      setUsers(res.data);
      setCurrentIndex(0);
      position.setValue({ x: 0, y: 0 });
    } catch {
      Alert.alert('Hata', 'Kullanıcılar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setRound((r) => r + 1);
    await fetchUsers();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => position.setValue({ x: g.dx, y: g.dy }),
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_THRESHOLD) triggerSwipeRight();
        else if (g.dx < -SWIPE_THRESHOLD) triggerSwipeLeft();
        else Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    })
  ).current;

  const triggerSwipeRight = () => {
    Animated.timing(position, {
      toValue: { x: SW + 100, y: 0 }, duration: 280, useNativeDriver: false,
    }).start(() => { position.setValue({ x: 0, y: 0 }); handleLike(users[currentIndex].id); });
  };

  const triggerSwipeLeft = () => {
    Animated.timing(position, {
      toValue: { x: -SW - 100, y: 0 }, duration: 280, useNativeDriver: false,
    }).start(() => { position.setValue({ x: 0, y: 0 }); handleDislike(users[currentIndex].id); });
  };

  const handleLike = async (targetId) => {
    setActionLoading(targetId);
    try {
      const res = await api.post(`/matches/like/${targetId}`);
      if (res.data.matched) {
        Alert.alert('Eşleştiniz! 🎉', 'Ortak film zevkiniz var. Mesaj atmaya başlayın!');
      }
    } catch { /* sessiz */ }
    finally {
      setActionLoading(null);
      setCurrentIndex((p) => p + 1);
    }
  };

  const handleDislike = async (targetId) => {
    setActionLoading(targetId);
    try { await api.post(`/matches/dislike/${targetId}`); } catch { /* sessiz */ }
    finally {
      setActionLoading(null);
      setCurrentIndex((p) => p + 1);
    }
  };

  const rotate = position.x.interpolate({
    inputRange: [-SW / 2, 0, SW / 2], outputRange: ['-7deg', '0deg', '7deg'], extrapolate: 'clamp',
  });
  const likeOpacity = position.x.interpolate({ inputRange: [0, SW / 4], outputRange: [0, 1], extrapolate: 'clamp' });
  const nopeOpacity = position.x.interpolate({ inputRange: [-SW / 4, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const nextScale = position.x.interpolate({
    inputRange: [-SW, 0, SW], outputRange: [1, 0.93, 1], extrapolate: 'clamp',
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.red} size="large" />
        <Text style={styles.loadingText}>Kişiler yükleniyor...</Text>
      </View>
    );
  }

  const current = users[currentIndex];
  const next = users[currentIndex + 1];

  if (!current) {
    return (
      <View style={styles.center}>
        <Text style={styles.doneEmoji}>🎬</Text>
        <Text style={styles.doneTitle}>Tur {round} tamamlandı!</Text>
        <Text style={styles.doneSub}>Atlananlar 24 saat sonra tekrar görünecek</Text>
        <Pressable style={styles.refreshBtn} onPress={refresh}>
          <Text style={styles.refreshBtnText}>Yenile</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Ekran başlığı */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Keşfet</Text>
          <Text style={styles.headerSub}>Film zevkine göre kişiler</Text>
        </View>
        <View style={styles.roundBadge}>
          <Text style={styles.roundText}>Tur {round}</Text>
        </View>
      </View>

      {/* Kart alanı */}
      <View style={styles.cardArea}>
        {/* Arka kart */}
        {next && (
          <Animated.View style={[styles.card, styles.cardBack, { transform: [{ scale: nextScale }] }]}>
            <UserCardContent user={next} compact />
          </Animated.View>
        )}

        {/* Aktif kart */}
        <Animated.View
          style={[styles.card, {
            transform: [
              { translateX: position.x },
              { translateY: position.y },
              { rotate },
            ],
          }]}
          {...panResponder.panHandlers}
        >
          {/* Swipe badge'leri */}
          <Animated.View style={[styles.badge, styles.badgeLike, { opacity: likeOpacity }]}>
            <Text style={styles.badgeLikeText}>LIKE ♥</Text>
          </Animated.View>
          <Animated.View style={[styles.badge, styles.badgeNope, { opacity: nopeOpacity }]}>
            <Text style={styles.badgeNopeText}>NOPE ✕</Text>
          </Animated.View>

          <TouchableOpacity
            activeOpacity={0.95}
            onPress={() => navigation.navigate('UserProfile', { userId: current.id })}
          >
            <UserCardContent user={current} />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Aksiyon butonları */}
      <View style={styles.actions}>
        <ActionBtn
          onPress={triggerSwipeLeft}
          style={styles.skipBtn}
          disabled={!!actionLoading}
          label="Atla"
          icon="✕"
          iconColor="#ff2840"
        />
        <Text style={styles.counter}>{currentIndex + 1} / {users.length}</Text>
        <ActionBtn
          onPress={triggerSwipeRight}
          style={styles.likeBtn}
          disabled={!!actionLoading}
          label="Beğen"
          icon="♥"
          iconColor="#fff"
        />
      </View>
    </View>
  );
}

function UserCardContent({ user, compact = false }) {
  return (
    <View style={[styles.cardInner, compact && styles.cardInnerCompact]}>
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        {user.avatar
          ? <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
          : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>{user.name?.[0]?.toUpperCase()}</Text>
            </View>
          )
        }
        <View style={styles.avatarRing} />
      </View>

      <Text style={styles.cardName}>{user.name}</Text>
      {user.username ? <Text style={styles.cardUsername}>@{user.username}</Text> : null}
      {!compact && user.bio ? (
        <Text style={styles.cardBio} numberOfLines={2}>{user.bio}</Text>
      ) : null}

      {/* Skor satırı */}
      {!compact && (
        <View style={styles.scoreRow}>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreNum}>%{user.matchScore}</Text>
            <Text style={styles.scoreLabel}>Uyum</Text>
          </View>
          <View style={styles.scoreDivider} />
          <View style={styles.scoreBox}>
            <Text style={styles.scoreNum}>{user.commonMovies}</Text>
            <Text style={styles.scoreLabel}>Ortak Film</Text>
          </View>
        </View>
      )}

      {/* Filmler */}
      {!compact && user.movies?.length > 0 && (
        <View style={styles.moviesWrap}>
          <Text style={styles.moviesLabel}>İzledikleri</Text>
          {user.movies.slice(0, 3).map((m, idx) => (
            <Text key={`movie-${m.movieId}-${idx}`} style={styles.movieItem}>🎬 {m.movie?.title}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

function ActionBtn({ onPress, style, disabled, label, icon, iconColor }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <View style={{ alignItems: 'center', gap: 5 }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          style={[styles.actionBtn, style]}
          onPress={onPress}
          disabled={disabled}
          onPressIn={() => Animated.spring(scale, { toValue: 0.9, useNativeDriver: true, speed: 50 }).start()}
          onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start()}
        >
          <Text style={{ fontSize: 26, color: iconColor }}>{icon}</Text>
        </Pressable>
      </Animated.View>
      <Text style={styles.actionLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: {
    flex: 1, backgroundColor: Colors.bg,
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  loadingText: { color: Colors.textMuted, marginTop: 14, fontSize: 13 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 26, fontWeight: '800', letterSpacing: -0.5, color: Colors.textPrimary,
  },
  headerSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  roundBadge: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.pill,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 0.5, borderColor: Colors.border,
  },
  roundText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600' },

  // Kartlar
  cardArea: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 16, marginTop: 4,
  },
  card: {
    position: 'absolute',
    width: SW - 32,
    minHeight: CARD_H,
    borderRadius: Radii.xl,
    backgroundColor: Colors.bgCard,
    borderWidth: 0.5, borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadows.card,
  },
  cardBack: { transform: [{ scale: 0.93 }], opacity: 0.6 },
  cardInner: {
    padding: 28, alignItems: 'center',
  },
  cardInnerCompact: { padding: 24 },

  // Swipe badge'leri
  badge: {
    position: 'absolute', top: 22, zIndex: 10,
    paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: Radii.sm, borderWidth: 2,
  },
  badgeLike: {
    left: 14, borderColor: Colors.green, backgroundColor: Colors.greenDim,
    transform: [{ rotate: '-12deg' }],
  },
  badgeLikeText: { color: Colors.green, fontWeight: '900', fontSize: 14, letterSpacing: 1.5 },
  badgeNope: {
    right: 14, borderColor: '#ff2840', backgroundColor: 'rgba(255,40,64,0.12)',
    transform: [{ rotate: '12deg' }],
  },
  badgeNopeText: { color: '#ff2840', fontWeight: '900', fontSize: 14, letterSpacing: 1.5 },

  // Avatar
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatarImg: { width: 88, height: 88, borderRadius: 44 },
  avatarFallback: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.red,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { color: '#fff', fontSize: 36, fontWeight: '800' },
  avatarRing: {
    position: 'absolute', inset: -3,
    width: 94, height: 94, borderRadius: 47,
    borderWidth: 1.5, borderColor: Colors.redBorder,
    top: -3, left: -3,
  },

  cardName: {
    fontSize: 22, fontWeight: '800', letterSpacing: -0.3,
    color: Colors.textPrimary, marginBottom: 3, textAlign: 'center',
  },
  cardUsername: { fontSize: 12, color: Colors.red, marginBottom: 8, fontWeight: '600' },
  cardBio: {
    fontSize: 12, color: Colors.textSecondary, textAlign: 'center',
    lineHeight: 18, marginBottom: 16, paddingHorizontal: 8,
  },

  // Skor
  scoreRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bg,
    borderRadius: Radii.lg, borderWidth: 0.5, borderColor: Colors.border,
    marginBottom: 18, overflow: 'hidden',
  },
  scoreBox: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  scoreDivider: { width: 0.5, height: 32, backgroundColor: Colors.border },
  scoreNum: { fontSize: 22, fontWeight: '800', color: Colors.red, lineHeight: 24 },
  scoreLabel: { fontSize: 9, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 3 },

  // Filmler
  moviesWrap: { width: '100%' },
  moviesLabel: {
    fontSize: 9, color: Colors.textHint, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7, textAlign: 'center',
  },
  movieItem: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4, textAlign: 'center' },

  // Aksiyonlar
  actions: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 36, paddingBottom: 28, paddingTop: 8,
  },
  actionBtn: {
    borderRadius: Radii.pill, justifyContent: 'center', alignItems: 'center',
  },
  skipBtn: {
    width: 62, height: 62,
    backgroundColor: Colors.bgCard,
    borderWidth: 1.5, borderColor: 'rgba(255,40,64,0.3)',
  },
  likeBtn: {
    width: 68, height: 68,
    backgroundColor: Colors.red,
    ...Shadows.red,
  },
  actionLabel: { fontSize: 10, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  counter: { fontSize: 12, color: Colors.textHint, minWidth: 40, textAlign: 'center' },

  // Done ekranı
  doneEmoji: { fontSize: 60, marginBottom: 16 },
  doneTitle: { color: Colors.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  doneSub: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 28 },
  refreshBtn: {
    backgroundColor: Colors.red, borderRadius: Radii.md,
    paddingVertical: 14, paddingHorizontal: 40,
    ...Shadows.red,
  },
  refreshBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
