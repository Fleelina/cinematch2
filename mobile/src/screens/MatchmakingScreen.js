import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, Image, ImageBackground, StyleSheet, ActivityIndicator,
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
import { normalizeImageUri } from '../services/imageUri';
import { Radii, Shadows } from '../theme';
import MatchModal from '../components/MatchModal';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useAppDrawer } from '../context/DrawerContext';

const { width: SW, height: SH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SW * 0.25;
const DEFAULT_BACKGROUND = require('../../assets/default-bg.png');
const DUNE_ICON = require('../../assets/dune-icon.png');
const MATCH_ACTION_ICON_SOURCES = {
  dune: DUNE_ICON,
};

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

const getProfilePhotos = (user) => {
  const photos = Array.isArray(user?.profilePhotos) ? user.profilePhotos.filter(Boolean) : [];
  const merged = user?.avatar ? [user.avatar, ...photos.filter((photo) => photo !== user.avatar)] : photos;
  return merged.slice(0, 3).map(normalizeImageUri).filter(Boolean);
};

const getMatchmakingCardTheme = (themeColors = {}, movieTheme = {}, isDark = true) => {
  const theme = movieTheme?.matchmakingCard || {};
  if (!isDark) {
    const cardBackground = themeColors.bgSoft || '#c8d0dc';
    return {
      background: cardBackground,
      border: themeColors.border || 'rgba(33,45,62,0.14)',
      infoBackground: cardBackground,
      photoBackground: cardBackground,
      placeholderBackground: cardBackground,
      rowBackground: 'rgba(33,45,62,0.06)',
      rowGoldBackground: 'rgba(240,180,41,0.14)',
      rowBorder: themeColors.borderSoft || 'rgba(33,45,62,0.08)',
      rowGoldBorder: 'rgba(240,180,41,0.26)',
      shadow: 'rgba(33,45,62,0.24)',
      shadowOpacity: 0.18,
      textPrimary: themeColors.textPrimary || '#121214',
      textSecondary: themeColors.textSecondary || '#495057',
      textMuted: themeColors.textMuted || '#adb5bd',
      accent: themeColors.red || '#ff3b55',
      accentSoft: themeColors.redSoft || 'rgba(255,59,85,0.1)',
      accentBorder: themeColors.redBorder || 'rgba(255,59,85,0.2)',
      gold: themeColors.gold || '#f0b429',
      topBadgeBackground: 'rgba(255,255,255,0.76)',
      topBadgeBorder: 'rgba(33,45,62,0.12)',
      likeBackground: 'rgba(255,255,255,0.78)',
      likeBorder: themeColors.redBorder || 'rgba(255,59,85,0.2)',
    };
  }

  return {
    background: theme.background || themeColors.bgElevated || themeColors.bgSoft || '#11131b',
    border: theme.border || themeColors.borderStrong || themeColors.border || '#242734',
    infoBackground: theme.infoBackground || themeColors.surface || themeColors.bgSoft || '#11131b',
    photoBackground: theme.photoBackground || themeColors.bg || '#08090e',
    placeholderBackground: theme.placeholderBackground || themeColors.bgElevated || '#171923',
    rowBackground: theme.rowBackground || themeColors.glassStrong || '#191b26',
    rowGoldBackground: theme.rowGoldBackground || themeColors.goldSoft || 'rgba(240,180,41,0.12)',
    rowBorder: theme.rowBorder || themeColors.border || '#242734',
    rowGoldBorder: theme.rowGoldBorder || themeColors.primaryBorder || 'rgba(240,180,41,0.2)',
    shadow: theme.shadow || themeColors.shadow || '#000',
    shadowOpacity: 0.55,
    textPrimary: themeColors.textPrimary || '#ffffff',
    textSecondary: themeColors.textSecondary || '#8888aa',
    textMuted: themeColors.textMuted || '#444466',
    accent: themeColors.red || '#ff4058',
    accentSoft: themeColors.redSoft || 'rgba(255,64,88,0.18)',
    accentBorder: themeColors.redBorder || 'rgba(255,64,88,0.45)',
    gold: themeColors.gold || '#f0b429',
    topBadgeBackground: 'rgba(0,0,0,0.58)',
    topBadgeBorder: 'rgba(255,255,255,0.18)',
    likeBackground: 'rgba(18,6,8,0.72)',
    likeBorder: 'rgba(220,60,80,0.25)',
  };
};

const getMatchActionTheme = (themeColors = {}, movieTheme = {}, cardTheme = {}) => {
  const accent = cardTheme.accent || themeColors.red || '#ff4058';
  const iconSource = MATCH_ACTION_ICON_SOURCES[movieTheme?.id];
  const iconText = movieTheme?.icons?.like || '♥';

  return {
    iconSource,
    iconText,
    accent,
    background: iconSource ? 'transparent' : cardTheme.likeBackground || 'rgba(18,6,8,0.72)',
    borderColor: iconSource ? `${accent}8C` : cardTheme.likeBorder || 'rgba(220,60,80,0.25)',
    glowColor: iconSource ? accent : cardTheme.accent || accent,
    glowOpacity: iconSource ? 0.18 : 0.12,
    idleGlowOpacity: iconSource ? 0.35 : 0.18,
    pressedGlowOpacity: iconSource ? 1 : 0.65,
    size: iconSource ? 64 : 48,
    frameSize: iconSource ? 58 : 48,
    iconSize: iconSource ? 58 : 18,
    borderRadius: iconSource ? 19 : 16,
    pressMarginRight: iconSource ? -6 : 0,
    pressScale: iconSource ? 0.9 : 0.88,
  };
};

// ─────────────────────────────────────────────────────────────────────────────

export default function MatchmakingScreen({ navigation }) {
  const { user: currentUser } = useAuth();
  const { theme: themeColors, movieTheme, isDark } = useTheme();
  const { openDrawer } = useAppDrawer();
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
        <GradientShell center themeColors={themeColors} movieTheme={movieTheme} isDark={isDark}>
          <ActivityIndicator color={T.accent} size="large" />
          <Text style={styles.loadingText}>Kişiler yükleniyor...</Text>
        </GradientShell>
      </GestureHandlerRootView>
    );
  }

  const current = users[currentIndex];
  const next = users[currentIndex + 1];
  const cardTheme = getMatchmakingCardTheme(themeColors, movieTheme, isDark);
  const matchActionTheme = getMatchActionTheme(themeColors, movieTheme, cardTheme);
  const isDuneTheme = movieTheme?.id === 'dune';
  const cardShellStyle = {
    backgroundColor: cardTheme.background,
    borderColor: cardTheme.border,
    shadowColor: cardTheme.shadow,
    shadowOpacity: cardTheme.shadowOpacity,
  };

  if (!current) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GradientShell center themeColors={themeColors} movieTheme={movieTheme} isDark={isDark}>
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
      <GradientShell themeColors={themeColors} movieTheme={movieTheme} isDark={isDark}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.titleGroup}>
              <Pressable
                style={[
                  styles.drawerButton,
                  { backgroundColor: themeColors.glass, borderColor: themeColors.border },
                ]}
                onPress={openDrawer}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <View style={[styles.drawerLine, { width: 20 }]} />
                <View style={[styles.drawerLine, styles.drawerLineAccent, { width: 14 }]} />
                <View style={[styles.drawerLine, { width: 20 }]} />
              </Pressable>
              <Text
                style={[styles.title, !isDark && { color: themeColors.textPrimary }]}
                numberOfLines={1}
              >
                Match
              </Text>
            </View>
            <Pressable style={styles.matchesPill} onPress={() => navigation.navigate('Matches')}>
              <View style={[styles.matchesPillIcon, isDuneTheme && styles.duneIconSlotClean]}>
                {isDuneTheme ? (
                  <Image source={DUNE_ICON} style={styles.dunePillIcon} resizeMode="contain" />
                ) : (
                  <Text style={styles.matchesPillIconText}>♥</Text>
                )}
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
              !isDark && { backgroundColor: themeColors.glass, borderColor: themeColors.border },
              (!!actionLoading || currentIndex === 0 || !lastSwipedRef.current || lastSwipedRef.current?.matched) && { opacity: 0.2 }
            ]}
            onPress={handleUndo}
            disabled={!!actionLoading || currentIndex === 0 || !lastSwipedRef.current || lastSwipedRef.current?.matched}
          >
            <Text style={styles.undoFloatingIcon}>↺</Text>
          </Pressable>
          {/* Arka kart */}
          {next ? (
            <Animated.View style={[styles.card, cardShellStyle, { transform: [{ scale: backCardScale }], opacity: backCardOpacity }]}>
              <BackCardContent user={next} cardTheme={cardTheme} />
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
                style={[styles.card, cardShellStyle, {
                  transform: [{ translateX }, { translateY: Animated.multiply(translateY, 0.15) }, { rotate }],
                }]}
              >
                <Animated.View pointerEvents="none" style={[styles.overlayLike, { opacity: likeOpacity }]}>
                  <View style={styles.badge}>
                    <View style={styles.badgeContent}>
                      <Text style={styles.badgeLikeText}>LIKE</Text>
                      {isDuneTheme ? (
                        <Image source={DUNE_ICON} style={styles.duneBadgeIcon} resizeMode="contain" />
                      ) : (
                        <Text style={styles.badgeLikeText}>♥</Text>
                      )}
                    </View>
                  </View>
                </Animated.View>
                <Animated.View pointerEvents="none" style={[styles.overlayNope, { opacity: nopeOpacity }]}>
                  <View style={[styles.badge, styles.badgeNope]}><Text style={styles.badgeNopeText}>NOPE ✕</Text></View>
                </Animated.View>

                <UserCardContent user={current} listRef={cardListRef} panRef={cardPanRef} onLike={triggerSwipeRight} cardTheme={cardTheme} matchActionTheme={matchActionTheme} />
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

function GradientShell({ children, center, themeColors, movieTheme, isDark }) {
  const backgroundImage = isDark ? (movieTheme?.matchmakingBackgroundImage || DEFAULT_BACKGROUND) : null;
  const themeGradient = movieTheme?.gradient || null;
  const defaultGradient = ['#260408', '#07080d', '#030407'];
  const lightGradient = ['#d7dce5', '#c8d0dc', '#b8c2d0'];
  const colors = backgroundImage
    ? ['rgba(8,5,2,0.28)', 'rgba(7,8,13,0.72)', 'rgba(3,4,7,0.95)']
    : isDark
      ? themeGradient || defaultGradient
      : lightGradient;
  const locations = backgroundImage ? [0, 0.46, 1] : [0, 0.42, 1];
  const content = (
    <>
      <LinearGradient
        colors={colors}
        locations={locations}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.shellContent, center && styles.shellContentCenter]}>
        {children}
      </View>
    </>
  );

  if (backgroundImage) {
    return (
      <ImageBackground
        source={backgroundImage}
        style={[styles.container, center && styles.center]}
        resizeMode="cover"
      >
        {content}
      </ImageBackground>
    );
  }

  return (
    <View style={[styles.container, center && styles.center]}>
      {content}
    </View>
  );
}

// ─── BackCardContent ──────────────────────────────────────────────────────────

function BackCardContent({ user, cardTheme }) {
  const photos = getProfilePhotos(user);
  const mainPhoto = photos[0];
  return (
    <View style={{ flex: 1, backgroundColor: cardTheme.background }}>
      {mainPhoto
        ? <Image source={{ uri: mainPhoto }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        : <View style={[StyleSheet.absoluteFill, { backgroundColor: cardTheme.placeholderBackground, justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: cardTheme.textPrimary, fontSize: 72, fontWeight: '900' }}>{user.name?.[0]?.toUpperCase()}</Text>
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

function ProfilePhotoSlide({ uri, cardTheme }) {
  return (
    <View style={[styles.slidePhoto, { backgroundColor: cardTheme.photoBackground }]}>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(5,6,10,0.08)', 'transparent', 'rgba(5,6,10,0.2)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

function EmptyPhotoSlide({ icon, cardTheme }) {
  return (
    <View style={[styles.slidePhoto, styles.slidePlaceholder, { backgroundColor: cardTheme.placeholderBackground, borderTopColor: cardTheme.border }]}>
      <Text style={styles.placeholderIcon}>{icon}</Text>
      <Text style={[styles.placeholderText, { color: cardTheme.textMuted }]}>Daha fazla fotoğraf eklenmemiş</Text>
    </View>
  );
}

function MatchActionButton({ onPress, theme }) {
  const scale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(theme.idleGlowOpacity)).current;

  useEffect(() => {
    scale.setValue(1);
    glowOpacity.setValue(theme.idleGlowOpacity);
  }, [glowOpacity, scale, theme.idleGlowOpacity, theme.iconSource, theme.iconText]);

  const handlePressIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: theme.pressScale,
        useNativeDriver: true,
        speed: 34,
        bounciness: 8,
      }),
      Animated.timing(glowOpacity, {
        toValue: theme.pressedGlowOpacity,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [glowOpacity, scale, theme.pressScale, theme.pressedGlowOpacity]);

  const handlePressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 28,
        bounciness: 10,
      }),
      Animated.timing(glowOpacity, {
        toValue: theme.idleGlowOpacity,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [glowOpacity, scale, theme.idleGlowOpacity]);

  const handlePress = useCallback(() => {
    onPress?.();
  }, [onPress]);

  return (
    <Pressable
      style={[
        styles.matchActionPressable,
        {
          width: theme.size,
          height: theme.size,
          marginRight: theme.pressMarginRight,
        },
      ]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={16}
      pressRetentionOffset={20}
    >
      <Animated.View style={[
        styles.matchActionSlot,
        {
          width: theme.frameSize,
          height: theme.frameSize,
          borderRadius: theme.borderRadius,
          borderColor: theme.borderColor,
          backgroundColor: theme.background,
          transform: [{ scale }],
        },
      ]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.matchActionGlow,
            {
              width: theme.size,
              height: theme.size,
              borderRadius: Math.round(theme.size * 0.34),
              backgroundColor: theme.glowColor,
              opacity: glowOpacity,
            },
          ]}
        />
        {theme.iconSource ? (
          <Image
            source={theme.iconSource}
            style={[
              styles.matchActionImage,
              {
                width: theme.iconSize,
                height: theme.iconSize,
              },
            ]}
            resizeMode="contain"
          />
        ) : (
          <Text style={[styles.matchActionText, { color: theme.accent, fontSize: theme.iconSize }]}>
            {theme.iconText}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

function UserCardContent({ user, listRef, panRef, onLike, cardTheme, matchActionTheme }) {
  const recentMovies = user.movies?.slice(0, 3) ?? [];
  const hasCommonMovies = user.commonMovies > 0 && user.movies?.length > 0;
  const photos = getProfilePhotos(user);

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
          <View style={[styles.slidePhoto, { backgroundColor: cardTheme.photoBackground }]}>
            {photos[0]
              ? <Image source={{ uri: photos[0] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              : <View style={[StyleSheet.absoluteFill, styles.avatarFallback, { backgroundColor: cardTheme.placeholderBackground }]}>
                  <Text style={[styles.avatarInitialLarge, { color: cardTheme.textPrimary }]}>{user.name?.[0]?.toUpperCase()}</Text>
                </View>
            }
            <LinearGradient
              colors={['transparent', 'rgba(5,6,10,0.95)']}
              locations={[0.38, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={[
              styles.topBadge,
              { backgroundColor: cardTheme.topBadgeBackground, borderColor: cardTheme.topBadgeBorder },
            ]}>
              <View style={[styles.liveDot, { backgroundColor: cardTheme.accent, shadowColor: cardTheme.accent }]} />
              <Text style={[styles.topBadgeText, { color: cardTheme.accent }]}>CINE MATCH</Text>
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
                  <View style={[
                    styles.matchScorePill,
                    { backgroundColor: cardTheme.accentSoft, borderColor: cardTheme.accentBorder },
                  ]}>
                    <Text style={[styles.matchScoreValue, { color: cardTheme.accent }]}>%{user.matchScore}</Text>
                    <Text style={[styles.matchScoreLabel, { color: cardTheme.accent }]}> uyum</Text>
                  </View>
                  {user.commonMovies > 0 ? (
                    <View style={[
                      styles.commonMoviePill,
                      { backgroundColor: cardTheme.rowGoldBackground, borderColor: cardTheme.rowGoldBorder },
                    ]}>
                      <Text style={[styles.commonMovieValue, { color: cardTheme.gold }]}>{user.commonMovies} ortak film</Text>
                    </View>
                  ) : null}
                </View>
                <MatchActionButton onPress={onLike} theme={matchActionTheme} />
              </View>
            </View>
          </View>
        );

      case 'info1':
        return (
          <View style={[styles.slideInfo, { backgroundColor: cardTheme.infoBackground, borderTopColor: cardTheme.border }]}>
            <Text style={[styles.slideLabel, { color: cardTheme.accent }]}>SON EKLENEN FİLMLER</Text>
            {recentMovies.length > 0
              ? recentMovies.map((movie, i) => (
                  <View key={`r-${movie.movieId}-${i}`} style={[styles.movieRow, { backgroundColor: cardTheme.rowBackground, borderColor: cardTheme.rowBorder }]}>
                    <View style={styles.movieDot} />
                    <Text style={[styles.movieRowText, { color: cardTheme.textSecondary }]} numberOfLines={1}>{movie.movie?.title}</Text>
                  </View>
                ))
              : <Text style={[styles.slideMuted, { color: cardTheme.textMuted }]}>Henüz film eklenmemiş.</Text>
            }
          </View>
        );

      case 'photo2':
        return photos[1] ? <ProfilePhotoSlide uri={photos[1]} cardTheme={cardTheme} /> : <EmptyPhotoSlide icon="📷" cardTheme={cardTheme} />;

      case 'info2':
        return (
          <View style={[styles.slideInfo, { backgroundColor: cardTheme.infoBackground, borderTopColor: cardTheme.border }]}>
            <Text style={[styles.slideLabel, { color: cardTheme.accent }]}>ORTAK FİLMLERİMİZ</Text>
            {hasCommonMovies
              ? user.movies.slice(0, 4).map((movie, i) => (
                  <View key={`c-${movie.movieId}-${i}`} style={[styles.movieRow, styles.movieRowGold, { backgroundColor: cardTheme.rowGoldBackground, borderColor: cardTheme.rowGoldBorder }]}>
                    <View style={[styles.movieDot, styles.movieDotGold]} />
                    <Text style={[styles.movieRowText, { color: cardTheme.textSecondary }]} numberOfLines={1}>{movie.movie?.title}</Text>
                  </View>
                ))
              : <Text style={[styles.slideMuted, { color: cardTheme.textMuted }]}>Ortak film yakalandığında burada görünür.</Text>
            }
          </View>
        );

      case 'photo3':
        return photos[2] ? <ProfilePhotoSlide uri={photos[2]} cardTheme={cardTheme} /> : <EmptyPhotoSlide icon="🎬" cardTheme={cardTheme} />;

      case 'info3':
        const aboutText = user.bio || 'Bu kullanıcı henüz kendini tanıtmamış.';
        const aboutMinHeight = Math.min(SH * 0.48, Math.max(SH * 0.24, 94 + Math.ceil(aboutText.length / 34) * 24));
        return (
          <View style={[styles.slideInfo, styles.slideInfoLast, { minHeight: aboutMinHeight, backgroundColor: cardTheme.infoBackground, borderTopColor: cardTheme.border }]}>
            <Text style={[styles.slideLabel, { color: cardTheme.accent }]}>HAKKINDA</Text>
            <Text style={[styles.bioText, { color: cardTheme.textSecondary }]}>
              {aboutText}
            </Text>
          </View>
        );

      default:
        return null;
    }
  }, [user, recentMovies, hasCommonMovies, photos, cardTheme, matchActionTheme, onLike]);

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
  shellContent: {
    flex: 1,
    width: '100%',
  },
  shellContentCenter: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  header: {
    paddingHorizontal: 20, paddingTop: 58, paddingBottom: 8,
    flexDirection: 'column',
  },
  headerTop: {
    minHeight: 42,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6,
    gap: 12,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  drawerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  drawerLine: {
    height: 2,
    borderRadius: 2,
    backgroundColor: T.textPrimary,
  },
  drawerLineAccent: {
    backgroundColor: T.accent,
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
  title: { color: T.textPrimary, fontSize: 32, lineHeight: 38, fontWeight: '900', letterSpacing: -1, flexShrink: 1 },
  subtitle: { color: T.textSecondary, fontSize: 14, fontWeight: '600', maxWidth: SW * 0.58 },
  matchesPill: {
    height: 38,
    borderRadius: 19,
    paddingLeft: 6,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,64,88,0.16)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,64,88,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dunePillIcon: {
    width: 36,
    height: 36,
  },
  duneIconSlotClean: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    overflow: 'visible',
  },
  matchesPillIconText: { color: T.accent, fontSize: 12, fontWeight: '900', marginTop: -1 },
  matchesPillText: { color: T.textPrimary, fontFamily: 'Inter_800ExtraBold', fontSize: 12, letterSpacing: -0.1 },
  matchesPillArrow: { color: T.accentSecondary, fontSize: 16, marginTop: -1 },
  loadingText: { color: T.textMuted, marginTop: 14, fontSize: 13 },

  cardArea: {
    flex: 1, alignItems: 'center', justifyContent: 'flex-start',
    marginHorizontal: 8, marginTop: 6, marginBottom: 96,
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
  slideInfoLast: {
    borderBottomWidth: 0,
    paddingBottom: 72,
  },

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
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeNope: { borderColor: T.red, backgroundColor: 'rgba(255,40,64,0.12)', transform: [{ rotate: '12deg' }] },
  badgeLikeText: { color: T.green, fontWeight: '900', fontSize: 14, letterSpacing: 1.5 },
  duneBadgeIcon: {
    width: 36,
    height: 36,
  },
  badgeNopeText: { color: T.red, fontWeight: '900', fontSize: 14, letterSpacing: 1.5 },

  // ── Match action in photo ──
  matchActionPressable: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    flexShrink: 0,
  },
  matchActionSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  matchActionGlow: {
    position: 'absolute',
  },
  matchActionText: {
    fontWeight: '900',
    marginTop: -1,
  },
  matchActionImage: {
    backgroundColor: 'transparent',
  },

  // ── Done screen ──
  doneEmoji: { fontSize: 60, marginBottom: 16 },
  doneTitle: { color: T.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  doneSub: { color: T.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 28 },
  refreshBtn: { backgroundColor: T.accent, borderRadius: Radii.md, paddingVertical: 14, paddingHorizontal: 40 },
  refreshBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
