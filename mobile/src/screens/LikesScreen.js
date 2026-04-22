import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { Colors, Radii } from '../theme';

function formatLikedAt(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'Simdi';
  if (diff < 3600) return `${Math.floor(diff / 60)} dk`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa`;
  return `${Math.floor(diff / 86400)} gun`;
}

function Avatar({ user, size = 54 }) {
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
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: avatarColors[colorIndex],
      justifyContent: 'center',
      alignItems: 'center',
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
      <Text style={styles.emptyEmoji}>{activeTab === 'likedMe' ? '❤' : '♡'}</Text>
      <Text style={styles.emptyTitle}>
        {activeTab === 'likedMe' ? 'Seni begenen yok' : 'Henuz kimseyi begenmedin'}
      </Text>
      <Text style={styles.emptySub}>
        {activeTab === 'likedMe'
          ? 'Yeni begeniler geldiginde burada gorunecek.'
          : 'Kesfet ekranindan kisi begenince burada goreceksin.'}
      </Text>
    </View>
  );
}

function UserRow({ item, activeTab, navigation }) {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
    >
      <Avatar user={item} />
      <View style={styles.cardInfo}>
        <View style={styles.cardTop}>
          <Text style={styles.cardName}>{item.name}</Text>
          <Text style={styles.cardTime}>{formatLikedAt(item.likedAt)}</Text>
        </View>
        {item.bio ? (
          <Text style={styles.cardBio} numberOfLines={1}>{item.bio}</Text>
        ) : (
          <Text style={styles.cardBioMuted}>
            {activeTab === 'likedMe' ? 'Profiline goz at' : 'Senden geri donus bekliyor'}
          </Text>
        )}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

export default function LikesScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('likedMe');
  const [likedMe, setLikedMe] = useState([]);
  const [iLiked, setILiked] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLikes = useCallback(async () => {
    try {
      const [likedMeRes, iLikedRes] = await Promise.all([
        api.get('/matches/liked-me'),
        api.get('/matches/i-liked'),
      ]);

      setLikedMe(likedMeRes.data || []);
      setILiked(iLikedRes.data || []);
    } catch {
      Alert.alert('Hata', 'Begeniler yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchLikes();
    }, [fetchLikes])
  );

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
            Seni Begenenler
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
            Benim Begendiklerim
          </Text>
          <View style={[styles.segmentCount, activeTab === 'iLiked' && styles.segmentCountActive]}>
            <Text style={[styles.segmentCountText, activeTab === 'iLiked' && styles.segmentCountTextActive]}>
              {iLiked.length}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {data.length === 0 ? (
        <EmptyState activeTab={activeTab} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <UserRow item={item} activeTab={activeTab} navigation={navigation} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  segmentWrap: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: Radii.lg,
    backgroundColor: Colors.bgCard,
    borderWidth: 0.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  segmentBtnActive: {
    backgroundColor: Colors.redDim,
    borderColor: Colors.redBorder,
  },
  segmentText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  segmentTextActive: { color: Colors.textPrimary },
  segmentCount: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.pill,
    backgroundColor: Colors.bg,
  },
  segmentCountActive: { backgroundColor: Colors.red },
  segmentCountText: { fontSize: 11, fontWeight: '800', color: Colors.textMuted },
  segmentCountTextActive: { color: '#fff' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  cardInfo: { flex: 1 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  cardName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  cardTime: { fontSize: 11, color: Colors.textMuted },
  cardBio: { fontSize: 12, color: Colors.textSecondary },
  cardBioMuted: { fontSize: 12, color: Colors.red },
  chevron: { fontSize: 18, color: Colors.textHint },
  emptyEmoji: { fontSize: 52, marginBottom: 14, color: Colors.red },
  emptyTitle: { color: Colors.textPrimary, fontSize: 19, fontWeight: '800', marginBottom: 8 },
  emptySub: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
