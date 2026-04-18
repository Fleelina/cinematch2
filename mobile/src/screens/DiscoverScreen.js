import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, Image, StyleSheet, ActivityIndicator,
  TouchableOpacity, Animated, PanResponder, Dimensions, Alert
} from 'react-native';
import api from '../services/api';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

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
    } catch (err) {
      Alert.alert('Hata', 'Kullanicilar yuklenemedi');
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
      onPanResponderMove: (_, gestureState) => {
        position.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          triggerSwipeRight();
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          triggerSwipeLeft();
        } else {
          Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  const triggerSwipeRight = () => {
    Animated.timing(position, {
      toValue: { x: SCREEN_WIDTH + 100, y: 0 },
      duration: 280, useNativeDriver: false,
    }).start(() => {
      position.setValue({ x: 0, y: 0 });
      handleLike(users[currentIndex].id);
    });
  };

  const triggerSwipeLeft = () => {
    Animated.timing(position, {
      toValue: { x: -SCREEN_WIDTH - 100, y: 0 },
      duration: 280, useNativeDriver: false,
    }).start(() => {
      position.setValue({ x: 0, y: 0 });
      handleDislike(users[currentIndex].id);
    });
  };

  const handleLike = async (targetId) => {
    setActionLoading(targetId);
    try {
      const res = await api.post(`/matches/like/${targetId}`);
      if (res.data.matched) Alert.alert('Eslestiniz! 🎉', 'Ortak film zevkiniz var!');
    } catch (err) {}
    finally {
      setActionLoading(null);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleDislike = async (targetId) => {
    setActionLoading(targetId);
    try { await api.post(`/matches/dislike/${targetId}`); } catch (err) {}
    finally {
      setActionLoading(null);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-8deg', '0deg', '8deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_WIDTH / 4], outputRange: [0, 1], extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 4, 0], outputRange: [1, 0], extrapolate: 'clamp',
  });

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color="#E50914" size="large" />
    </View>
  );

  const currentUser = users[currentIndex];
  const nextUser = users[currentIndex + 1];

  if (!currentUser) return (
    <View style={styles.center}>
      <Text style={styles.doneEmoji}>🎬</Text>
      <Text style={styles.doneText}>Tur {round} tamamlandi!</Text>
      <Text style={styles.doneSubText}>Atlananlar 24 saat sonra tekrar gorunecek</Text>
      <TouchableOpacity style={styles.reloadBtn} onPress={refresh}>
        <Text style={styles.reloadBtnText}>🔄 Yenile</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.cardContainer}>

        {/* Arka kart */}
        {nextUser && (
          <View style={[styles.card, styles.nextCard]}>
            <View style={styles.cardInner}>
              <View style={styles.avatarLarge}>
                {nextUser.avatar
                  ? <Image source={{ uri: nextUser.avatar }} style={styles.avatarImg} />
                  : <Text style={styles.avatarLargeText}>{nextUser.name[0].toUpperCase()}</Text>
                }
              </View>
              <Text style={styles.cardName}>{nextUser.name}</Text>
            </View>
          </View>
        )}

        {/* Aktif kart */}
        <Animated.View
          style={[styles.card, {
            transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }],
          }]}
          {...panResponder.panHandlers}
        >
          <Animated.View style={[styles.badge, styles.badgeLike, { opacity: likeOpacity }]}>
            <Text style={styles.badgeText}>LIKE ♥</Text>
          </Animated.View>
          <Animated.View style={[styles.badge, styles.badgeNope, { opacity: nopeOpacity }]}>
            <Text style={styles.badgeText}>NOPE ✕</Text>
          </Animated.View>

          {/* Karta tıklayınca profil aç */}
          <TouchableOpacity
            style={styles.cardInner}
            activeOpacity={0.92}
            onPress={() => navigation.navigate('UserProfile', { userId: currentUser.id })}
          >
            <View style={styles.avatarLarge}>
              {currentUser.avatar
                ? <Image source={{ uri: currentUser.avatar }} style={styles.avatarImg} />
                : <Text style={styles.avatarLargeText}>{currentUser.name[0].toUpperCase()}</Text>
              }
            </View>
            <Text style={styles.cardName}>{currentUser.name}</Text>
            {currentUser.username
              ? <Text style={styles.cardUsername}>@{currentUser.username}</Text>
              : null}
            {currentUser.bio
              ? <Text style={styles.cardBio}>{currentUser.bio}</Text>
              : null}

            <View style={styles.scoreRow}>
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreNum}>%{currentUser.matchScore}</Text>
                <Text style={styles.scoreLabel}>Uyum</Text>
              </View>
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreNum}>{currentUser.commonMovies}</Text>
                <Text style={styles.scoreLabel}>Ortak Film</Text>
              </View>
            </View>

            {currentUser.movies?.length > 0 && (
              <View style={styles.moviesList}>
                <Text style={styles.moviesTitle}>Izledikleri</Text>
                {currentUser.movies.slice(0, 3).map((m) => (
                  <Text key={m.id} style={styles.movieTag}>🎬 {m.movie.title}</Text>
                ))}
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Aksiyon butonları */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.nopeBtn]}
          onPress={triggerSwipeLeft}
          disabled={!!actionLoading}
        >
          <Text style={styles.actionIcon}>✕</Text>
          <Text style={styles.actionLabel}>Atla</Text>
        </TouchableOpacity>
        <Text style={styles.counter}>{currentIndex + 1} / {users.length}</Text>
        <TouchableOpacity
          style={[styles.actionBtn, styles.likeBtn]}
          onPress={triggerSwipeRight}
          disabled={!!actionLoading}
        >
          <Text style={styles.actionIcon}>♥</Text>
          <Text style={styles.actionLabel}>Begen</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#0f0f0f' },
  cardContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, marginTop: 8 },
  card: {
    position: 'absolute',
    width: SCREEN_WIDTH - 32,
    height: SCREEN_HEIGHT * 0.58,
    borderRadius: 24,
    backgroundColor: '#1c1c1c',
    borderWidth: 1, borderColor: '#2a2a2a',
    elevation: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10,
    overflow: 'hidden',
  },
  nextCard: { transform: [{ scale: 0.95 }], opacity: 0.6 },
  cardInner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  badge: {
    position: 'absolute', top: 24, padding: 8, paddingHorizontal: 16,
    borderRadius: 8, borderWidth: 3, zIndex: 10,
  },
  badgeLike: { left: 16, borderColor: '#00c853', backgroundColor: 'rgba(0,200,83,0.2)', transform: [{ rotate: '-15deg' }] },
  badgeNope: { right: 16, borderColor: '#E50914', backgroundColor: 'rgba(229,9,20,0.2)', transform: [{ rotate: '15deg' }] },
  badgeText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  avatarLarge: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#E50914', justifyContent: 'center', alignItems: 'center',
    marginBottom: 14, overflow: 'hidden',
  },
  avatarImg: { width: 90, height: 90 },
  avatarLargeText: { color: '#fff', fontSize: 40, fontWeight: 'bold' },
  cardName: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 4, textAlign: 'center' },
  cardUsername: { color: '#E50914', fontSize: 13, marginBottom: 8 },
  cardBio: { color: '#aaa', fontSize: 13, textAlign: 'center', marginBottom: 14, paddingHorizontal: 8 },
  scoreRow: { flexDirection: 'row', gap: 14, marginBottom: 18 },
  scoreBadge: {
    backgroundColor: '#0f0f0f', borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 18,
    alignItems: 'center', borderWidth: 1, borderColor: '#2a2a2a',
  },
  scoreNum: { color: '#E50914', fontSize: 20, fontWeight: 'bold' },
  scoreLabel: { color: '#888', fontSize: 11, marginTop: 2 },
  moviesList: { width: '100%' },
  moviesTitle: { color: '#555', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 6, textAlign: 'center' },
  movieTag: { color: '#ccc', fontSize: 12, marginBottom: 3, textAlign: 'center' },
  actions: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 32, paddingBottom: 24, paddingTop: 8,
  },
  actionBtn: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  nopeBtn: { backgroundColor: '#1c1c1c', borderWidth: 2, borderColor: '#E50914' },
  likeBtn: { backgroundColor: '#E50914' },
  actionIcon: { fontSize: 26, color: '#fff' },
  actionLabel: { color: '#888', fontSize: 10, marginTop: 2 },
  counter: { color: '#555', fontSize: 13 },
  doneEmoji: { fontSize: 64, marginBottom: 16 },
  doneText: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  doneSubText: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  reloadBtn: { backgroundColor: '#E50914', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40 },
  reloadBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
