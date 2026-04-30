import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, Image, StyleSheet, ActivityIndicator,
  TouchableOpacity, Animated, PanResponder, Dimensions, Alert, Pressable,
} from 'react-native';
import api from '../services/api';
import { Colors, Radii, Shadows } from '../theme';

const { width: SW, height: SH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SW * 0.25;
const CARD_H = SH * 0.62;

const T = {
  bg: '#0d0d14',
  bgCard: '#13131f',
  bgCardElevated: '#1a1a2e',
  accent: '#6c5ce7',
  accentDim: 'rgba(108,92,231,0.18)',
  accentBorder: 'rgba(108,92,231,0.4)',
  accentSecondary: '#a29bfe',
  gold: '#f0b429',
  goldDim: 'rgba(240,180,41,0.15)',
  green: '#00c864',
  greenDim: 'rgba(0,200,100,0.12)',
  red: '#ff2840',
  textPrimary: '#ffffff',
  textSecondary: '#8888aa',
  textMuted: '#444466',
  border: '#1e1e30',
  borderLight: '#2a2a40',
};

export default function MatchmakingScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [round, setRound] = useState(1);
  const [cardVisible, setCardVisible] = useState(true);

  const lastSwipedRef = useRef(null);
  // Her zaman güncel değeri tutan ref'ler — closure sorununu çözer
  const currentIndexRef = useRef(0);
  const usersRef = useRef([]);

  const position = useRef(new Animated.ValueXY()).current;
  const backCardScale = useRef(new Animated.Value(0.93)).current;
  const backCardOpacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  useEffect(() => {
    setCardVisible(true);
    backCardScale.setValue(0.93);
    backCardOpacity.setValue(0.55);
    position.setValue({ x: 0, y: 0 });
  }, [currentIndex]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/discover');
      setUsers(res.data);
      setCurrentIndex(0);
      position.setValue({ x: 0, y: 0 });
    } catch {
      Alert.alert('Hata', 'Kullanicilar yuklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleUndo = async () => {
    if (currentIndexRef.current === 0 || !lastSwipedRef.current) return;
    if (lastSwipedRef.current.matched) return;
    setActionLoading('undo');
    try {
      await api.delete(`/matches/undo/${lastSwipedRef.current.userId}`);
      setCurrentIndex((v) => v - 1);
      position.setValue({ x: 0, y: 0 });
      lastSwipedRef.current = null;
    } catch { }
    finally { setActionLoading(null); }
  };

  const refresh = async () => {
    setRound((v) => v + 1);
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
    // Ref'ten oku — stale closure yok
    const user = usersRef.current[currentIndexRef.current];
    if (!user?.id) return;
    setCardVisible(false);
    Animated.parallel([
      Animated.timing(backCardScale, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(backCardOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    Animated.timing(position, {
      toValue: { x: SW + 100, y: 0 }, duration: 250, useNativeDriver: false,
    }).start(() => handleLike(user.id));
  };

  const triggerSwipeLeft = () => {
    const user = usersRef.current[currentIndexRef.current];
    if (!user?.id) return;
    setCardVisible(false);
    Animated.parallel([
      Animated.timing(backCardScale, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(backCardOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    Animated.timing(position, {
      toValue: { x: -SW - 100, y: 0 }, duration: 250, useNativeDriver: false,
    }).start(() => handleDislike(user.id));
  };

  const handleLike = async (targetId) => {
    setActionLoading(targetId);
    try {
      const res = await api.post(`/matches/like/${targetId}`);
      const matched = res.data?.matched ?? false;
      lastSwipedRef.current = { userId: targetId, matched };
      if (matched) Alert.alert('Eslestiniz!', 'Ortak film zevkiniz var. Mesaj atmaya baslayin!');
    } catch {
      lastSwipedRef.current = { userId: targetId, matched: false };
    } finally {
      setActionLoading(null);
      setCurrentIndex((v) => v + 1);
    }
  };

  const handleDislike = async (targetId) => {
    setActionLoading(targetId);
    try {
      await api.post(`/matches/dislike/${targetId}`);
      lastSwipedRef.current = { userId: targetId, matched: false };
    } catch {
      lastSwipedRef.current = { userId: targetId, matched: false };
    } finally {
      setActionLoading(null);
      setCurrentIndex((v) => v + 1);
    }
  };

  const rotate = position.x.interpolate({
    inputRange: [-SW / 2, 0, SW / 2], outputRange: ['-7deg', '0deg', '7deg'], extrapolate: 'clamp',
  });
  const likeOpacity = position.x.interpolate({ inputRange: [0, SW / 4], outputRange: [0, 1], extrapolate: 'clamp' });
  const nopeOpacity = position.x.interpolate({ inputRange: [-SW / 4, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={T.accent} size="large" />
        <Text style={styles.loadingText}>Kisiler yukleniyor...</Text>
      </View>
    );
  }

  const current = users[currentIndex];
  const next = users[currentIndex + 1];

  if (!current) {
    return (
      <View style={styles.center}>
        <Text style={styles.doneEmoji}>🎬</Text>
        <Text style={styles.doneTitle}>Tur {round} tamamlandi!</Text>
        <Text style={styles.doneSub}>Atlananlar 24 saat sonra tekrar gorunecek</Text>
        <Pressable style={styles.refreshBtn} onPress={refresh}>
          <Text style={styles.refreshBtnText}>Yenile</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cardArea}>
        {next ? (
          <Animated.View style={[styles.card, { transform: [{ scale: backCardScale }], opacity: backCardOpacity }]}>
            <UserCardContent user={next} compact />
          </Animated.View>
        ) : null}

        {cardVisible ? (
          <Animated.View
            style={[styles.card, {
              transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }],
            }]}
            {...panResponder.panHandlers}
          >
            <Animated.View style={[styles.overlayLike, { opacity: likeOpacity }]}>
              <View style={styles.badge}><Text style={styles.badgeLikeText}>LIKE ♥</Text></View>
            </Animated.View>
            <Animated.View style={[styles.overlayNope, { opacity: nopeOpacity }]}>
              <View style={[styles.badge, styles.badgeNope]}><Text style={styles.badgeNopeText}>NOPE ✕</Text></View>
            </Animated.View>
            <TouchableOpacity
              activeOpacity={0.95}
              onPress={() => navigation.navigate('UserProfile', { userId: current.id })}
            >
              <UserCardContent user={current} />
            </TouchableOpacity>
          </Animated.View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <ActionBtn onPress={triggerSwipeLeft} style={styles.skipBtn} disabled={!!actionLoading} label="Atla" icon="✕" iconColor={T.red} />
        <ActionBtn
          onPress={handleUndo}
          style={styles.undoBtn}
          disabled={!!actionLoading || currentIndex === 0 || !lastSwipedRef.current || lastSwipedRef.current?.matched}
          label="Geri Al" icon="↩" iconColor={T.gold}
        />
        <ActionBtn onPress={triggerSwipeRight} style={styles.likeBtn} disabled={!!actionLoading} label="Begen" icon="♥" iconColor="#fff" />
      </View>
    </View>
  );
}

function UserCardContent({ user, compact = false }) {
  return (
    <View style={[styles.cardInner, compact && styles.cardInnerCompact]}>
      <View style={styles.avatarWrap}>
        {user.avatar ? (
          <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>{user.name?.[0]?.toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.avatarRing} />
      </View>
      <Text style={styles.cardName}>{user.name}</Text>
      {user.username ? (
        <View style={styles.usernamePill}><Text style={styles.cardUsername}>@{user.username}</Text></View>
      ) : null}
      {!compact && user.bio ? (
        <Text style={styles.cardBio} numberOfLines={2}>{user.bio}</Text>
      ) : null}
      {!compact ? (
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
      ) : null}
      {!compact && user.movies?.length > 0 ? (
        <View style={styles.moviesWrap}>
          <Text style={styles.moviesLabel}>Izledikleri</Text>
          <View style={styles.moviePills}>
            {user.movies.slice(0, 3).map((movie, index) => (
              <View key={`movie-${movie.movieId}-${index}`} style={styles.moviePill}>
                <Text style={styles.moviePillText} numberOfLines={1}>🎬 {movie.movie?.title}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function ActionBtn({ onPress, style, disabled, label, icon, iconColor }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          style={[styles.actionBtn, style]}
          onPress={onPress}
          disabled={disabled}
          onPressIn={() => Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, speed: 50 }).start()}
          onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start()}
        >
          <Text style={{ fontSize: 24, color: iconColor }}>{icon}</Text>
        </Pressable>
      </Animated.View>
      <Text style={styles.actionLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  center: { flex: 1, backgroundColor: T.bg, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { color: T.textMuted, marginTop: 14, fontSize: 13 },
  cardArea: { flex: 1, alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, marginTop: 4 },
  card: {
    position: 'absolute', width: SW - 32, minHeight: CARD_H, borderRadius: 28,
    backgroundColor: T.bgCard, borderWidth: 1, borderColor: T.border, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.6, shadowRadius: 24, elevation: 16,
  },
  cardInner: { padding: 28, alignItems: 'center' },
  cardInnerCompact: { padding: 22 },
  overlayLike: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,200,100,0.07)', zIndex: 10,
    justifyContent: 'flex-start', alignItems: 'flex-start', padding: 20,
  },
  overlayNope: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,40,64,0.07)', zIndex: 10,
    justifyContent: 'flex-start', alignItems: 'flex-end', padding: 20,
  },
  badge: {
    paddingVertical: 7, paddingHorizontal: 16, borderRadius: Radii.sm, borderWidth: 2,
    borderColor: T.green, backgroundColor: T.greenDim, transform: [{ rotate: '-12deg' }],
  },
  badgeNope: { borderColor: T.red, backgroundColor: 'rgba(255,40,64,0.12)', transform: [{ rotate: '12deg' }] },
  badgeLikeText: { color: T.green, fontWeight: '900', fontSize: 14, letterSpacing: 1.5 },
  badgeNopeText: { color: T.red, fontWeight: '900', fontSize: 14, letterSpacing: 1.5 },
  avatarWrap: { position: 'relative', marginBottom: 16 },
  avatarImg: { width: 92, height: 92, borderRadius: 46 },
  avatarFallback: { width: 92, height: 92, borderRadius: 46, backgroundColor: T.accent, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: '#fff', fontSize: 36, fontWeight: '800' },
  avatarRing: { position: 'absolute', top: -4, left: -4, width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: T.accentBorder },
  cardName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3, color: T.textPrimary, marginBottom: 6, textAlign: 'center' },
  usernamePill: { backgroundColor: T.accentDim, borderRadius: Radii.pill, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 10 },
  cardUsername: { fontSize: 12, color: T.accentSecondary, fontWeight: '600' },
  cardBio: { fontSize: 13, color: T.textSecondary, textAlign: 'center', lineHeight: 19, marginBottom: 18, paddingHorizontal: 8 },
  scoreRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: T.bg, borderRadius: Radii.lg,
    borderWidth: 1, borderColor: T.border, marginBottom: 18, overflow: 'hidden', width: '100%',
  },
  scoreBox: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  scoreDivider: { width: 1, height: 32, backgroundColor: T.border },
  scoreNum: { fontSize: 22, fontWeight: '800', color: T.accent, lineHeight: 24 },
  scoreLabel: { fontSize: 9, color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 3 },
  moviesWrap: { width: '100%', marginTop: 4 },
  moviesLabel: { fontSize: 9, color: T.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, textAlign: 'center' },
  moviePills: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  moviePill: { backgroundColor: T.bgCardElevated, borderRadius: Radii.pill, borderWidth: 1, borderColor: T.borderLight, paddingHorizontal: 10, paddingVertical: 5, maxWidth: SW * 0.55 },
  moviePillText: { fontSize: 11, color: T.textSecondary },
  actions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 32, paddingBottom: 30, paddingTop: 10 },
  actionBtn: { borderRadius: Radii.pill, justifyContent: 'center', alignItems: 'center' },
  undoBtn: { width: 62, height: 62, backgroundColor: T.bgCard, borderWidth: 1.5, borderColor: 'rgba(240,180,41,0.35)' },
  skipBtn: { width: 62, height: 62, backgroundColor: T.bgCard, borderWidth: 1.5, borderColor: 'rgba(255,40,64,0.35)' },
  likeBtn: { width: 70, height: 70, backgroundColor: T.accent, shadowColor: T.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 10 },
  actionLabel: { fontSize: 10, color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  doneEmoji: { fontSize: 60, marginBottom: 16 },
  doneTitle: { color: T.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  doneSub: { color: T.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 28 },
  refreshBtn: { backgroundColor: T.accent, borderRadius: Radii.md, paddingVertical: 14, paddingHorizontal: 40 },
  refreshBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
