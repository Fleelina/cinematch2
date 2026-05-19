import React, { useCallback, useState, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Alert, Animated, Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { Colors, Radii, Shadows } from '../theme';
import MatchModal from '../components/MatchModal';
import { useAuth } from '../context/AuthContext';

function formatLikedAt(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'Şimdi';
  if (diff < 3600) return `${Math.floor(diff / 60)} dk`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa`;
  return `${Math.floor(diff / 86400)} gün`;
}

function Avatar({ user, size = 52 }) {
  const avatarColors = ['#c8102e', '#1d6a8a', '#2a6a3a', '#6a2a7a', '#6a4a1a'];
  const colorIndex = user?.name?.charCodeAt(0) % avatarColors.length ?? 0;

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
      backgroundColor: avatarColors[colorIndex],
      justifyContent: 'center', alignItems: 'center',
    }}>
      <Text style={{ color: '#fff', fontSize: size * 0.38, fontWeight: '800' }}>
        {user?.name?.[0]?.toUpperCase()}
      </Text>
    </View>
  );
}

function EmptyState({ activeTab }) {
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
function LikedMeRow({ item, onLike, onPass, onProfilePress }) {
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
          <Avatar user={item} />
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
function ILikedRow({ item, onProfilePress }) {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => onProfilePress(item.id)}
    >
      <View style={styles.cardLeft}>
        <Avatar user={item} />
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

export default function LikesScreen({ navigation }) {
  const { user: currentUser } = useAuth();
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
      <View style={styles.center}>
        <ActivityIndicator color={Colors.red} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
        <EmptyState activeTab={activeTab} />
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
              />
            ) : (
              <ILikedRow item={item} onProfilePress={goToProfile} />
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: {
    flex: 1, backgroundColor: Colors.bg,
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },

  segmentWrap: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
  },
  segmentBtn: {
    flex: 1, minHeight: 52, borderRadius: Radii.lg,
    backgroundColor: Colors.bgCard, borderWidth: 0.5, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'space-between',
  },
  segmentBtnActive: { backgroundColor: Colors.redDim, borderColor: Colors.redBorder },
  segmentText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  segmentTextActive: { color: Colors.textPrimary },
  segmentCount: {
    alignSelf: 'flex-start', marginTop: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radii.pill, backgroundColor: Colors.bg,
  },
  segmentCountActive: { backgroundColor: Colors.red },
  segmentCountText: { fontSize: 11, fontWeight: '800', color: Colors.textMuted },
  segmentCountTextActive: { color: '#fff' },

  hint: {
    fontSize: 11, color: Colors.textMuted,
    textAlign: 'center', marginBottom: 10, paddingHorizontal: 20,
  },

  listContent: { paddingHorizontal: 16, paddingBottom: 24 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgCard, borderRadius: Radii.lg,
    borderWidth: 0.5, borderColor: Colors.border,
    padding: 12, marginBottom: 10,
  },
  cardMatched: { borderColor: Colors.redBorder, backgroundColor: Colors.redDim },
  cardPassed: { opacity: 0.4 },

  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },

  avatarWrap: { position: 'relative' },
  heartBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.bg,
    justifyContent: 'center', alignItems: 'center',
  },
  heartBadgeText: { fontSize: 11 },

  cardInfo: { flex: 1 },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 3, gap: 8,
  },
  cardName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  cardTime: { fontSize: 11, color: Colors.textMuted },
  cardBio: { fontSize: 12, color: Colors.textSecondary },
  cardBioMuted: { fontSize: 12, color: Colors.textMuted },

  matchedPill: {
    marginTop: 4, alignSelf: 'flex-start',
    backgroundColor: Colors.red, borderRadius: Radii.pill,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  matchedPillText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  actions: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingLeft: 8 },
  passBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1.5, borderColor: 'rgba(255,40,64,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  passBtnText: { fontSize: 15, color: '#ff2840' },
  likeBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.red,
    justifyContent: 'center', alignItems: 'center',
    ...Shadows.red,
  },
  likeBtnText: { fontSize: 20, color: '#fff' },

  actionedState: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.bgElevated,
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 8,
  },
  actionedStateMatch: { backgroundColor: Colors.red },
  actionedStateText: { fontSize: 20 },

  chevron: { fontSize: 18, color: Colors.textHint, paddingLeft: 8 },

  emptyEmoji: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { color: Colors.textPrimary, fontSize: 19, fontWeight: '800', marginBottom: 8 },
  emptySub: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
