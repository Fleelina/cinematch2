import React, { useCallback, useState, useRef, useMemo, useLayoutEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Alert, Animated, Pressable,
  ImageBackground, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { Colors, Radii, Shadows } from '../theme';
import MatchModal from '../components/MatchModal';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const DEFAULT_BACKGROUND = require('../../assets/default-bg.png');

const DEFAULT_T = {
  bg: '#050506',
  bgSoft: '#0B0B10',
  glass: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.10)',
  borderSoft: 'rgba(255,255,255,0.06)',
  red: '#ff3b55',
  redSoft: 'rgba(255,59,85,0.15)',
  redBorder: 'rgba(255,59,85,0.35)',
  text: '#ffffff',
  textSoft: '#b9b8c7',
  textMuted: '#737286',
  success: '#27c46b',
  primary: '#9b5cff',
};

let styles = createStyles(DEFAULT_T);

function formatLikedAt(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'Şimdi';
  if (diff < 3600) return `${Math.floor(diff / 60)} dk`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa`;
  return `${Math.floor(diff / 86400)} gün`;
}

function Avatar({ user, size = 52, T }) {
  const avatarColors = ['#c8102e', '#1d6a8a', '#2a6a3a', '#6a2a7a', '#6a4a1a'];
  const colorIndex = user?.name?.charCodeAt(0) % avatarColors.length ?? 0;

  if (user?.avatar) {
    return (
      <Image
        source={{ uri: user.avatar }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: (T || DEFAULT_T).bgSoft }}
      />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: avatarColors[colorIndex],
      justifyContent: 'center', alignItems: 'center',
    }}>
      <Text style={{ color: '#fff', fontSize: size * 0.38, fontWeight: '800' }}>
        {user?.name?.[0]?.toUpperCase()}
      </Text>
    </View>
  );
}

function EmptyState({ activeTab, T }) {
  return (
    <View style={styles.center}>
      <Text style={styles.emptyEmoji}>{activeTab === 'likedMe' ? '❤️' : '🎬'}</Text>
      <Text style={styles.emptyTitle}>
        {activeTab === 'likedMe' ? 'Seni beğenen yok' : 'Henüz kimseyi beğenmedin'}
      </Text>
      <Text style={styles.emptySub}>
        {activeTab === 'likedMe'
          ? 'Yeni beğeniler geldiğinde burada görünecek.'
          : 'Keşfet ekranından kişi beğenince burada göreceksin.'}
      </Text>
    </View>
  );
}

// Seni beğenenler — aksiyon butonlu kart
function LikedMeRow({ item, onLike, onPass, onProfilePress, T }) {
  const [actioned, setActioned] = useState(null); // 'liked' | 'passed'
  const [matched, setMatched] = useState(false);
  const likeScale = useRef(new Animated.Value(1)).current;
  const passScale = useRef(new Animated.Value(1)).current;

  const handleLike = async () => {
    if (actioned) return;
    Animated.sequence([
      Animated.spring(likeScale, { toValue: 1.3, useNativeDriver: true, speed: 50, bounciness: 12 }),
      Animated.spring(likeScale, { toValue: 1, useNativeDriver: true, speed: 30 }),
    ]).start();
    setActioned('liked');
    try {
      const res = await onLike(item.id);
      if (res?.matched) setMatched(true);
    } catch {
      setActioned(null);
    }
  };

  const handlePass = async () => {
    if (actioned) return;
    Animated.sequence([
      Animated.spring(passScale, { toValue: 1.2, useNativeDriver: true, speed: 50, bounciness: 8 }),
      Animated.spring(passScale, { toValue: 1, useNativeDriver: true, speed: 30 }),
    ]).start();
    setActioned('passed');
    try {
      await onPass(item.id);
    } catch {
      setActioned(null);
    }
  };

  const isPassed = actioned === 'passed';

  return (
    <View style={[
      styles.card,
      matched && styles.cardMatched,
      isPassed && styles.cardPassed,
    ]}>
      <TouchableOpacity
        style={styles.cardLeft}
        activeOpacity={0.85}
        onPress={() => onProfilePress(item.id)}
      >
        <View style={styles.avatarWrap}>
          <Avatar user={item} T={T} />
          <View style={styles.heartBadge}>
            <Text style={styles.heartBadgeText}>❤️</Text>
          </View>
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.cardTop}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.cardTime}>{formatLikedAt(item.likedAt)}</Text>
          </View>
          {matched ? (
            <View style={styles.matchedPill}>
              <Text style={styles.matchedPillText}>🎉 Eşleştin!</Text>
            </View>
          ) : isPassed ? (
            <Text style={styles.cardBioMuted}>Geçildi</Text>
          ) : item.bio ? (
            <Text style={styles.cardBio} numberOfLines={1}>{item.bio}</Text>
          ) : (
            <Text style={styles.cardBioMuted}>Seni beğendi · Profile bak</Text>
          )}
        </View>
      </TouchableOpacity>

      {!actioned ? (
        <View style={styles.actions}>
          <Animated.View style={{ transform: [{ scale: passScale }] }}>
            <Pressable style={styles.passBtn} onPress={handlePass}>
              <Text style={styles.passBtnText}>✕</Text>
            </Pressable>
          </Animated.View>
          <Animated.View style={{ transform: [{ scale: likeScale }] }}>
            <Pressable style={styles.likeBtn} onPress={handleLike}>
              <Text style={styles.likeBtnText}>♥</Text>
            </Pressable>
          </Animated.View>
        </View>
      ) : (
        <View style={[styles.actionedState, matched && styles.actionedStateMatch]}>
          <Text style={styles.actionedStateText}>{matched ? '❤️' : '✕'}</Text>
        </View>
      )}
    </View>
  );
}

// Ben beğendiklerim — sadece profil linki
function ILikedRow({ item, onProfilePress, T }) {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => onProfilePress(item.id)}
    >
      <View style={styles.cardLeft}>
        <Avatar user={item} T={T} />
        <View style={styles.cardInfo}>
          <View style={styles.cardTop}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.cardTime}>{formatLikedAt(item.likedAt)}</Text>
          </View>
          {item.bio ? (
            <Text style={styles.cardBio} numberOfLines={1}>{item.bio}</Text>
          ) : (
            <Text style={styles.cardBioMuted}>Karşılık bekleniyor...</Text>
          )}
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

export default function LikesScreen({ navigation, route }) {
  const { user: currentUser } = useAuth();
  const { theme: themeColors, movieTheme } = useTheme();

  const T = useMemo(() => ({
    bg: themeColors.bg,
    bgSoft: themeColors.bgSoft,
    glass: themeColors.glass,
    glassStrong: themeColors.glassStrong || themeColors.glass,
    border: themeColors.border,
    borderSoft: themeColors.borderSoft,
    red: themeColors.red,
    redSoft: themeColors.redSoft,
    redBorder: themeColors.redBorder || 'rgba(255,59,85,0.35)',
    primary: themeColors.primary || themeColors.purple || '#9b5cff',
    primarySoft: themeColors.primarySoft || themeColors.purpleSoft || 'rgba(155,92,255,0.15)',
    primaryBorder: themeColors.primaryBorder || themeColors.purpleBorder || 'rgba(155,92,255,0.30)',
    gold: themeColors.gold,
    text: themeColors.textPrimary,
    textSoft: themeColors.textSecondary,
    textMuted: themeColors.textMuted,
    success: themeColors.success,
  }), [themeColors]);

  styles = useMemo(() => createStyles(T), [T]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const backgroundImage = movieTheme?.backgroundImage || DEFAULT_BACKGROUND;
  const overlayColors = movieTheme?.backgroundImage
    ? ['rgba(5,5,6,0.18)', 'rgba(5,5,6,0.62)', 'rgba(5,5,6,0.92)']
    : (movieTheme?.gradient
        ? [movieTheme.gradient[0] + 'ee', movieTheme.gradient[1] + 'cc', movieTheme.gradient[2] || T.bg]
        : ['rgba(5,5,6,0.10)', 'rgba(5,5,6,0.55)', 'rgba(5,5,6,0.88)']);

  const [activeTab, setActiveTab] = useState('likedMe');
  const [matchModalVisible, setMatchModalVisible] = useState(false);
  const [matchedUser, setMatchedUser] = useState(null);
  const [pendingMatchId, setPendingMatchId] = useState(null);
  const [likedMe, setLikedMe] = useState([]);
  const [iLiked, setILiked] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLikes = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const [likedMeRes, iLikedRes] = await Promise.all([
        api.get('/matches/liked-me'),
        api.get('/matches/i-liked'),
      ]);
      setLikedMe(likedMeRes.data || []);
      setILiked(iLikedRes.data || []);
    } catch {
      Alert.alert('Hata', 'Beğeniler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const isFirstLoad = likedMe.length === 0 && iLiked.length === 0;
      fetchLikes(isFirstLoad);
    }, [fetchLikes])
  );

  const handleLike = async (targetId) => {
    const res = await api.post(`/matches/like/${targetId}`);
    if (res.data?.matched) {
      const likedUser = likedMe.find((u) => u.id === targetId);
      setMatchedUser(likedUser || null);
      setPendingMatchId(res.data?.matchId || null);
      setMatchModalVisible(true);
    }
    return res.data;
  };

  const handlePass = async (targetId) => {
    await api.post(`/matches/dislike/${targetId}`);
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

  const goToProfile = (userId) => navigation.navigate('UserProfile', { userId });

  const data = activeTab === 'likedMe' ? likedMe : iLiked;

  if (loading) {
    return (
      <ImageBackground source={backgroundImage} style={{ flex: 1 }} resizeMode="cover">
        <LinearGradient colors={overlayColors} style={styles.center}>
          <ActivityIndicator color={T.red} size="large" />
        </LinearGradient>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={backgroundImage} style={{ flex: 1 }} resizeMode="cover">
    <LinearGradient colors={overlayColors} style={styles.container}>

      {/* ── Hero Header ── */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Likes</Text>
        <Text style={styles.heroSubtitle}>
          Birini <Text style={styles.heroAccent}>beğen</Text>, eşleş
        </Text>
      </View>

      <View style={styles.segmentWrap}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'likedMe' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('likedMe')}
        >
          <Text style={[styles.segmentText, activeTab === 'likedMe' && styles.segmentTextActive]}>
            Seni Beğenenler
          </Text>
          <View style={[styles.segmentCount, activeTab === 'likedMe' && styles.segmentCountActive]}>
            <Text style={[styles.segmentCountText, activeTab === 'likedMe' && styles.segmentCountTextActive]}>
              {likedMe.length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'iLiked' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('iLiked')}
        >
          <Text style={[styles.segmentText, activeTab === 'iLiked' && styles.segmentTextActive]}>
            Beğendiklerim
          </Text>
          <View style={[styles.segmentCount, activeTab === 'iLiked' && styles.segmentCountActive]}>
            <Text style={[styles.segmentCountText, activeTab === 'iLiked' && styles.segmentCountTextActive]}>
              {iLiked.length}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>
        {activeTab === 'likedMe'
          ? '♥ ile beğen, ✕ ile geç — karşılıklı beğeni eşleşmeye dönüşür'
          : 'Karşı taraf da beğenirse eşleşirsiniz'}
      </Text>

      {data.length === 0 ? (
        <EmptyState activeTab={activeTab} T={T} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) =>
            activeTab === 'likedMe' ? (
              <LikedMeRow
                item={item}
                onLike={handleLike}
                onPass={handlePass}
                onProfilePress={goToProfile}
                T={T}
              />
            ) : (
              <ILikedRow item={item} onProfilePress={goToProfile} T={T} />
            )
          }
        />
      )}
    </LinearGradient>
    </ImageBackground>
  );
}

function createStyles(T) {
  return StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },

  segmentWrap: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
  },
  segmentBtn: {
    flex: 1, minHeight: 52, borderRadius: Radii.lg,
    backgroundColor: T.glass, borderWidth: 0.5, borderColor: T.border,
    paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'space-between',
  },
  segmentBtnActive: { backgroundColor: T.redSoft, borderColor: T.redBorder },
  segmentText: { fontSize: 12, fontWeight: '700', color: T.textSoft },
  segmentTextActive: { color: T.text },
  segmentCount: {
    alignSelf: 'flex-start', marginTop: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radii.max, backgroundColor: 'rgba(0,0,0,0.3)',
  },
  segmentCountActive: { backgroundColor: T.red },
  segmentCountText: { fontSize: 11, fontWeight: '800', color: T.textMuted },
  segmentCountTextActive: { color: '#fff' },

  hint: {
    fontSize: 11, color: T.textMuted,
    textAlign: 'center', marginBottom: 10, paddingHorizontal: 20,
  },

  listContent: { paddingHorizontal: 16, paddingBottom: 24 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.glass, borderRadius: Radii.lg,
    borderWidth: 0.5, borderColor: T.border,
    padding: 12, marginBottom: 10,
  },
  cardMatched: { borderColor: T.redBorder, backgroundColor: T.redSoft },
  cardPassed: { opacity: 0.4 },

  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },

  avatarWrap: { position: 'relative' },
  heartBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(5,5,6,0.8)',
    justifyContent: 'center', alignItems: 'center',
  },
  heartBadgeText: { fontSize: 11 },

  cardInfo: { flex: 1 },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 3, gap: 8,
  },
  cardName: { fontSize: 15, fontWeight: '700', color: T.text, flex: 1 },
  cardTime: { fontSize: 11, color: T.textMuted },
  cardBio: { fontSize: 12, color: T.textSoft },
  cardBioMuted: { fontSize: 12, color: T.textMuted },

  matchedPill: {
    marginTop: 4, alignSelf: 'flex-start',
    backgroundColor: T.red, borderRadius: Radii.max,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  matchedPillText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  actions: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingLeft: 8 },
  passBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: T.glass,
    borderWidth: 1.5, borderColor: T.redBorder,
    justifyContent: 'center', alignItems: 'center',
  },
  passBtnText: { fontSize: 15, color: T.red },
  likeBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: T.red,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: T.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  likeBtnText: { fontSize: 20, color: '#fff' },

  actionedState: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: T.glass,
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 8,
  },
  actionedStateMatch: { backgroundColor: T.red },
  actionedStateText: { fontSize: 20 },

  chevron: { fontSize: 18, color: T.textMuted, paddingLeft: 8 },

  emptyEmoji: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { color: T.text, fontSize: 19, fontWeight: '800', marginBottom: 8 },
  emptySub: { color: T.textSoft, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  });
}
