import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, Image, StyleSheet, ActivityIndicator,
  Animated, Dimensions, Alert, Pressable, FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  GestureHandlerRootView,
  NativeViewGestureHandler,
  PanGestureHandler,
  State,
} from 'react-native-gesture-handler';
import api from '../services/api';
import { Radii, Shadows } from '../theme';
import MatchModal from '../components/MatchModal';
import { useAuth } from '../context/AuthContext';

const { width: SW, height: SH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SW * 0.25;

const T = {
  bg: '#05060a',
  accent: '#ff4058',
  accentSecondary: '#ff7788',
  gold: '#f0b429',
  green: '#00c864',
  greenDim: 'rgba(0,200,100,0.12)',
  red: '#ff2840',
  textPrimary: '#ffffff',
  textSecondary: '#8888aa',
  textMuted: '#444466',
};

// ─────────────────────────────────────────────────────────────────────────────

export default function MatchmakingScreen({ navigation }) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [round, setRound] = useState(1);
  const [cardVisible, setCardVisible] = useState(true);

  const [matchModalVisible, setMatchModalVisible] = useState(false);
  const [matchedUser, setMatchedUser] = useState(null);
  const [pendingMatchId, setPendingMatchId] = useState(null);

  const lastSwipedRef = useRef(null);
  const currentIndexRef = useRef(0);
  const usersRef = useRef([]);

  // Swipe animasyonu
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const backCardScale = useRef(new Animated.Value(0.93)).current;
  const backCardOpacity = useRef(new Animated.Value(0.55)).current;
  const cardPanRef = useRef(null);
  const cardListRef = useRef(null);

  useEffect(() => { fetchUsers(); }, []);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { usersRef.current = users; }, [users]);

  useEffect(() => {
    setCardVisible(true);
    backCardScale.setValue(0.93);
    backCardOpacity.setValue(0.55);
    translateX.setValue(0);
    translateY.setValue(0);
  }, [currentIndex]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/discover');
      setUsers(res.data);
      setCurrentIndex(0);
    } catch {
      Alert.alert('Hata', 'Kullanıcılar yüklenemedi');
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
      lastSwipedRef.current = null;
    } catch {}
    finally { setActionLoading(null); }
  };

  const refresh = async () => {
    setRound((v) => v + 1);
    await fetchUsers();
  };

  // Animasyonlu swipe tetikleyiciler
  const animateSwipe = (toX) => {
    setCardVisible(false);
    Animated.parallel([
      Animated.timing(backCardScale, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(backCardOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: toX, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const triggerSwipeRight = () => {
    const user = usersRef.current[currentIndexRef.current];
    if (!user?.id) return;
    animateSwipe(SW + 100);
    setTimeout(() => handleLike(user), 260);
  };

  const triggerSwipeLeft = () => {
    const user = usersRef.current[currentIndexRef.current];
    if (!user?.id) return;
    animateSwipe(-SW - 100);
    setTimeout(() => handleDislike(user.id), 260);
  };

  // PanGestureHandler event'i — sadece yatay gesture alır
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = ({ nativeEvent }) => {
    if (nativeEvent.state === State.END) {
      if (nativeEvent.translationX > SWIPE_THRESHOLD) {
        triggerSwipeRight();
      } else if (nativeEvent.translationX < -SWIPE_THRESHOLD) {
        triggerSwipeLeft();
      } else {
        Animated.parallel([
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
        ]).start();
      }
    }
  };

  const handleLike = async (targetUser) => {
    setActionLoading(targetUser.id);
    try {
      const res = await api.post(`/matches/like/${targetUser.id}`);
      const matched = res.data?.matched ?? false;
      const matchId = res.data?.matchId ?? null;
      lastSwipedRef.current = { userId: targetUser.id, matched };
      if (matched) {
        setMatchedUser(targetUser);
        setPendingMatchId(matchId);
        setMatchModalVisible(true);
      }
    } catch {
      lastSwipedRef.current = { userId: targetUser.id, matched: false };
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

  const handleModalMessage = () => {
    setMatchModalVisible(false);
    if (pendingMatchId) {
      navigation.navigate('Chat', { matchId: pendingMatchId, otherUser: matchedUser });
    } else {
      navigation.navigate('Mesajlar');
    }
  };

  const handleModalContinue = () => {
    setMatchModalVisible(false);
    setMatchedUser(null);
    setPendingMatchId(null);
  };

  const rotate = translateX.interpolate({
    inputRange: [-SW / 2, 0, SW / 2], outputRange: ['-7deg', '0deg', '7deg'], extrapolate: 'clamp',
  });
  const likeOpacity = translateX.interpolate({ inputRange: [0, SW / 4], outputRange: [0, 1], extrapolate: 'clamp' });
  const nopeOpacity = translateX.interpolate({ inputRange: [-SW / 4, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  if (loading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GradientShell center>
          <ActivityIndicator color={T.accent} size="large" />
          <Text style={styles.loadingText}>Kişiler yükleniyor...</Text>
        </GradientShell>
      </GestureHandlerRootView>
    );
  }

  const current = users[currentIndex];
  const next = users[currentIndex + 1];

  if (!current) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GradientShell center>
          <Text style={styles.doneEmoji}>🎬</Text>
          <Text style={styles.doneTitle}>Tur {round} tamamlandı!</Text>
          <Text style={styles.doneSub}>Atlananlar 24 saat sonra tekrar görünecek</Text>
          <Pressable style={styles.refreshBtn} onPress={refresh}>
            <Text style={styles.refreshBtnText}>Yenile</Text>
          </Pressable>
        </GradientShell>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GradientShell>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.title}>Match</Text>
            <Pressable style={styles.matchesPill} onPress={() => navigation.navigate('Matches')}>
              <View style={styles.matchesPillIcon}>
                <Text style={styles.matchesPillIconText}>♥</Text>
              </View>
              <Text style={styles.matchesPillText}>Eşleşenler</Text>
              <Text style={styles.matchesPillArrow}>›</Text>
            </Pressable>
          </View>
          <Text style={styles.subtitle}>Uyumlu profilleri keşfet, sinyali yakala.</Text>
        </View>

        <View style={styles.cardArea}>
          {/* Geri al — kartın sağ üstünde floating */}
          <Pressable
            style={[
              styles.undoFloating,
              (!!actionLoading || currentIndex === 0 || !lastSwipedRef.current || lastSwipedRef.current?.matched) && { opacity: 0.2 }
            ]}
            onPress={handleUndo}
            disabled={!!actionLoading || currentIndex === 0 || !lastSwipedRef.current || lastSwipedRef.current?.matched}
          >
            <Text style={styles.undoFloatingIcon}>↺</Text>
          </Pressable>
          {/* Arka kart */}
          {next ? (
            <Animated.View style={[styles.card, { transform: [{ scale: backCardScale }], opacity: backCardOpacity }]}>
              <BackCardContent user={next} />
            </Animated.View>
          ) : null}

          {/* Ön kart — PanGestureHandler sadece yatay swipe alır */}
          {cardVisible ? (
            <PanGestureHandler
              ref={cardPanRef}
              simultaneousHandlers={cardListRef}
              onGestureEvent={onGestureEvent}
              onHandlerStateChange={onHandlerStateChange}
              activeOffsetX={[-10, 10]}
              failOffsetY={[-8, 8]}
            >
              <Animated.View
                style={[styles.card, {
                  transform: [{ translateX }, { translateY: Animated.multiply(translateY, 0.15) }, { rotate }],
                }]}
              >
                <Animated.View style={[styles.overlayLike, { opacity: likeOpacity }]}>
                  <View style={styles.badge}><Text style={styles.badgeLikeText}>LIKE ♥</Text></View>
                </Animated.View>
                <Animated.View style={[styles.overlayNope, { opacity: nopeOpacity }]}>
                  <View style={[styles.badge, styles.badgeNope]}><Text style={styles.badgeNopeText}>NOPE ✕</Text></View>
                </Animated.View>

                <UserCardContent user={current} listRef={cardListRef} panRef={cardPanRef} onLike={triggerSwipeRight} />
              </Animated.View>
            </PanGestureHandler>
          ) : null}


        </View>

        <MatchModal
          visible={matchModalVisible}
          matchedUser={matchedUser}
          currentUser={currentUser}
          onMessage={handleModalMessage}
          onContinue={handleModalContinue}
        />
      </GradientShell>
    </GestureHandlerRootView>
  );
}

// ─── GradientShell ────────────────────────────────────────────────────────────

function GradientShell({ children, center }) {
  return (
    <LinearGradient
      colors={['#260408', '#07080d', '#030407']}
      locations={[0, 0.42, 1]}
      style={[styles.container, center && styles.center]}
    >
      <View style={styles.redBloom} />
      <View style={styles.violetBloom} />
      {children}
    </LinearGradient>
  );
}

// ─── BackCardContent ──────────────────────────────────────────────────────────

function BackCardContent({ user }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#11131b' }}>
      {user.avatar
        ? <Image source={{ uri: user.avatar }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        : <View style={[StyleSheet.absoluteFill, { backgroundColor: '#171923', justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: '#fff', fontSize: 72, fontWeight: '900' }}>{user.name?.[0]?.toUpperCase()}</Text>
          </View>
      }
      <LinearGradient colors={['transparent', 'rgba(5,6,10,0.85)']} locations={[0.55, 1]} style={StyleSheet.absoluteFill} />
      <View style={{ position: 'absolute', bottom: 24, left: 22 }}>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900' }}>{user.name}</Text>
      </View>
    </View>
  );
}

// ─── UserCardContent ──────────────────────────────────────────────────────────
//
// Sıra:
//   [0] Foto 1   — avatar, isim, yaş, skor
//   [1] Info 1   — Son eklenen 3 film
//   [2] Foto 2   — boşluk (ileride 2. profil fotoğrafı)
//   [3] Info 2   — Ortak filmler
//   [4] Foto 3   — boşluk (ileride 3. profil fotoğrafı)
//   [5] Info 3   — Hakkında

function UserCardContent({ user, listRef, panRef, onLike }) {
  const recentMovies = user.movies?.slice(0, 3) ?? [];
  const hasCommonMovies = user.commonMovies > 0 && user.movies?.length > 0;

  const slides = [
    { key: 'photo1', type: 'photo1' },
    { key: 'info1',  type: 'info1'  },
    { key: 'photo2', type: 'photo2' },
    { key: 'info2',  type: 'info2'  },
    { key: 'photo3', type: 'photo3' },
    { key: 'info3',  type: 'info3'  },
  ];

  const renderSlide = useCallback(({ item }) => {
    switch (item.type) {

      case 'photo1':
        return (
          <View style={styles.slidePhoto}>
            {user.avatar
              ? <Image source={{ uri: user.avatar }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              : <View style={[StyleSheet.absoluteFill, styles.avatarFallback]}>
                  <Text style={styles.avatarInitialLarge}>{user.name?.[0]?.toUpperCase()}</Text>
                </View>
            }
            <LinearGradient
              colors={['transparent', 'rgba(5,6,10,0.95)']}
              locations={[0.38, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.topBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.topBadgeText}>CINE MATCH</Text>
            </View>
            <View style={styles.photo1Identity}>
              <Text style={styles.heroName} numberOfLines={1}>
                {user.name}
                {user.age ? <Text style={styles.heroAge}>,  {user.age}</Text> : null}
              </Text>
              {user.username ? <Text style={styles.heroUsername}>@{user.username}</Text> : null}
              <View style={styles.photo1Separator} />
              <View style={styles.scoreRowWithLike}>
                <View style={styles.scoreRow}>
                  <View style={styles.matchScorePill}>
                    <Text style={styles.matchScoreValue}>%{user.matchScore}</Text>
                    <Text style={styles.matchScoreLabel}> uyum</Text>
                  </View>
                  {user.commonMovies > 0 ? (
                    <View style={styles.commonMoviePill}>
                      <Text style={styles.commonMovieValue}>{user.commonMovies} ortak film</Text>
                    </View>
                  ) : null}
                </View>
                <Pressable
                  style={styles.likeInPhoto}
                  onPress={onLike}
                  hitSlop={12}
                >
                  <View style={styles.likeInPhotoGradient}>
                    <Text style={styles.likeInPhotoIcon}>♥</Text>
                  </View>
                </Pressable>
              </View>
            </View>
          </View>
        );

      case 'info1':
        return (
          <View style={styles.slideInfo}>
            <Text style={styles.slideLabel}>SON EKLENEN FİLMLER</Text>
            {recentMovies.length > 0
              ? recentMovies.map((movie, i) => (
                  <View key={`r-${movie.movieId}-${i}`} style={styles.movieRow}>
                    <View style={styles.movieDot} />
                    <Text style={styles.movieRowText} numberOfLines={1}>{movie.movie?.title}</Text>
                  </View>
                ))
              : <Text style={styles.slideMuted}>Henüz film eklenmemiş.</Text>
            }
          </View>
        );

      case 'photo2':
        return (
          <View style={[styles.slidePhoto, styles.slidePlaceholder]}>
            <Text style={styles.placeholderIcon}>📷</Text>
            <Text style={styles.placeholderText}>Yakında daha fazla fotoğraf</Text>
          </View>
        );

      case 'info2':
        return (
          <View style={styles.slideInfo}>
            <Text style={styles.slideLabel}>ORTAK FİLMLERİMİZ</Text>
            {hasCommonMovies
              ? user.movies.slice(0, 4).map((movie, i) => (
                  <View key={`c-${movie.movieId}-${i}`} style={[styles.movieRow, styles.movieRowGold]}>
                    <View style={[styles.movieDot, styles.movieDotGold]} />
                    <Text style={styles.movieRowText} numberOfLines={1}>{movie.movie?.title}</Text>
                  </View>
                ))
              : <Text style={styles.slideMuted}>Ortak film yakalandığında burada görünür.</Text>
            }
          </View>
        );

      case 'photo3':
        return (
          <View style={[styles.slidePhoto, styles.slidePlaceholder]}>
            <Text style={styles.placeholderIcon}>🎬</Text>
            <Text style={styles.placeholderText}>Yakında daha fazla fotoğraf</Text>
          </View>
        );

      case 'info3':
        return (
          <View style={[styles.slideInfo, { borderBottomWidth: 0 }]}>
            <Text style={styles.slideLabel}>HAKKINDA</Text>
            <Text style={styles.bioText}>
              {user.bio || 'Bu kullanıcı henüz kendini tanıtmamış.'}
            </Text>
          </View>
        );

      default:
        return null;
    }
  }, [user, recentMovies, hasCommonMovies]);

  return (
    <NativeViewGestureHandler
      ref={listRef}
      simultaneousHandlers={panRef}
      disallowInterruption={false}
    >
      <FlatList
        data={slides}
        keyExtractor={(item) => item.key}
        renderItem={renderSlide}
      decelerationRate="normal"
        showsVerticalScrollIndicator={false}
        bounces={false}
        nestedScrollEnabled
        scrollEnabled
        style={{ flex: 1 }}
      />
    </NativeViewGestureHandler>
  );
}

// ─── ActionBtn ────────────────────────────────────────────────────────────────

function ActionBtn({ onPress, style, disabled, label, icon, iconColor }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={styles.actionBtnSlot}>
        <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          style={[styles.actionBtn, style]}
          onPress={onPress}
          disabled={disabled}
          onPressIn={() => Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, speed: 50 }).start()}
          onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start()}
        >
          <Text style={{ fontSize: 24, color: iconColor, opacity: disabled ? 0.35 : 1 }}>{icon}</Text>
        </Pressable>
        </Animated.View>
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  center: { justifyContent: 'center', alignItems: 'center', padding: 24 },

  redBloom: {
    position: 'absolute', width: 320, height: 320, borderRadius: 160,
    left: -130, top: -95, backgroundColor: 'rgba(200,16,46,0.16)',
  },
  violetBloom: {
    position: 'absolute', width: 230, height: 230, borderRadius: 115,
    right: -95, top: 220, backgroundColor: 'rgba(126,78,255,0.05)',
  },

  header: {
    paddingHorizontal: 24, paddingTop: 54, paddingBottom: 6,
    flexDirection: 'column',
  },
  headerTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2,
  },
  undoFloating: {
    position: 'absolute',
    top: -44,
    right: 16,
    zIndex: 20,
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#12131b',
    borderWidth: 0.5,
    borderColor: 'rgba(255,64,88,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoFloatingIcon: {
    fontSize: 15,
    color: T.accent,
    marginTop: -1,
  },
  title: { color: T.textPrimary, fontSize: 46, fontWeight: '900', letterSpacing: -1.8 },
  subtitle: { color: T.textSecondary, fontSize: 14, marginTop: 2, maxWidth: SW * 0.58 },
  matchesPill: {
    height: 44,
    borderRadius: 22,
    paddingLeft: 7,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#12131b',
    borderWidth: 1,
    borderColor: 'rgba(255,64,88,0.42)',
    shadowColor: T.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 8,
  },
  matchesPillIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,64,88,0.16)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,64,88,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchesPillIconText: { color: T.accent, fontSize: 13, fontWeight: '900', marginTop: -1 },
  matchesPillText: { color: T.textPrimary, fontFamily: 'Inter_800ExtraBold', fontSize: 12, letterSpacing: -0.1 },
  matchesPillArrow: { color: T.accentSecondary, fontSize: 17, marginTop: -1 },
  loadingText: { color: T.textMuted, marginTop: 14, fontSize: 13 },

  cardArea: {
    flex: 1, alignItems: 'center', justifyContent: 'flex-start',
    marginHorizontal: 8, marginTop: 6, marginBottom: 0,
  },
  card: {
    position: 'absolute', top: 0, bottom: 0,
    width: SW - 18,
    borderRadius: 28, backgroundColor: '#11131b',
    borderWidth: 1, borderColor: '#242734', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55, shadowRadius: 24, elevation: 16,
  },

  // ── Slide: photo ──
  slidePhoto: {
    height: SH * 0.72,
    backgroundColor: '#08090e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slidePlaceholder: {
    backgroundColor: '#0d0e14',
    borderTopWidth: 0.5,
    borderTopColor: '#1e1e30',
  },
  placeholderIcon: { fontSize: 40, opacity: 0.2, marginBottom: 10 },
  placeholderText: { color: '#252535', fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  avatarFallback: { backgroundColor: '#171923', justifyContent: 'center', alignItems: 'center' },
  avatarInitialLarge: { color: '#fff', fontSize: 100, fontWeight: '900' },

  topBadge: {
    position: 'absolute', top: 16, left: 16,
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radii.pill,
    backgroundColor: 'rgba(0,0,0,0.58)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.18)',
  },
  liveDot: {
    width: 7, height: 7, borderRadius: 4, backgroundColor: T.accent,
    shadowColor: T.accent, shadowOpacity: 0.9, shadowRadius: 8,
  },
  topBadgeText: { color: T.accentSecondary, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },

  photo1Identity: { position: 'absolute', bottom: 24, left: 22, right: 22 },
  heroName: { color: T.textPrimary, fontSize: 32, fontWeight: '900', letterSpacing: -1, marginBottom: 4 },
  heroAge: { fontSize: 24, fontWeight: '400', opacity: 0.8 },
  heroUsername: { color: T.accentSecondary, fontSize: 14, fontWeight: '700', marginBottom: 12 },

  photo1Separator: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginVertical: 14,
  },
  scoreRowWithLike: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flex: 1 },
  matchScorePill: {
    flexDirection: 'row', alignItems: 'baseline',
    backgroundColor: 'rgba(255,64,88,0.18)',
    borderWidth: 0.5, borderColor: 'rgba(255,64,88,0.45)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  matchScoreValue: { color: T.accent, fontSize: 16, fontWeight: '900' },
  matchScoreLabel: { color: 'rgba(255,64,88,0.7)', fontSize: 11, fontWeight: '700' },
  commonMoviePill: {
    backgroundColor: 'rgba(240,180,41,0.14)',
    borderWidth: 0.5, borderColor: 'rgba(240,180,41,0.4)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  commonMovieValue: { color: T.gold, fontSize: 12, fontWeight: '700' },
  // ── Slide: info ──
  slideInfo: {
    minHeight: 0,
    backgroundColor: '#11131b',
    paddingHorizontal: 24, paddingTop: 30, paddingBottom: 30,
    borderTopWidth: 0.5, borderTopColor: '#1e1e30',
  },
  slideLabel: {
    color: T.accentSecondary, fontSize: 9, fontWeight: '900',
    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20,
  },
  slideMuted: { color: T.textMuted, fontSize: 13, fontStyle: 'italic' },

  movieRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    backgroundColor: '#191b26', borderRadius: 16,
    borderWidth: 0.5, borderColor: '#242734', marginBottom: 10,
  },
  movieRowGold: { backgroundColor: '#171410', borderColor: 'rgba(240,180,41,0.2)' },
  movieDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: T.accent, flexShrink: 0 },
  movieDotGold: { backgroundColor: T.gold },
  movieRowText: { flex: 1, color: T.textSecondary, fontSize: 14, fontWeight: '600' },
  bioText: { color: T.textSecondary, fontSize: 15, lineHeight: 24 },

  // ── Swipe overlays ──
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
    paddingVertical: 8, paddingHorizontal: 18, borderRadius: Radii.pill, borderWidth: 2,
    borderColor: T.green, backgroundColor: T.greenDim, transform: [{ rotate: '-12deg' }],
  },
  badgeNope: { borderColor: T.red, backgroundColor: 'rgba(255,40,64,0.12)', transform: [{ rotate: '12deg' }] },
  badgeLikeText: { color: T.green, fontWeight: '900', fontSize: 14, letterSpacing: 1.5 },
  badgeNopeText: { color: T.red, fontWeight: '900', fontSize: 14, letterSpacing: 1.5 },

  // ── Like in photo ──
  likeInPhoto: {
    width: 48,
    height: 48,
    borderRadius: 16,
    shadowColor: '#6b0f1a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 12,
    flexShrink: 0,
  },
  likeInPhotoGradient: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(220,60,80,0.25)',
    backgroundColor: 'rgba(18,6,8,0.72)',
  },
  likeInPhotoIcon: {
    fontSize: 18,
    color: '#c8374a',
  },

  // ── Done screen ──
  doneEmoji: { fontSize: 60, marginBottom: 16 },
  doneTitle: { color: T.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  doneSub: { color: T.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 28 },
  refreshBtn: { backgroundColor: T.accent, borderRadius: Radii.md, paddingVertical: 14, paddingHorizontal: 40 },
  refreshBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
