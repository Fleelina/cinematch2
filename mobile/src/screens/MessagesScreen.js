import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

function Avatar({ user, size = 48 }) {
  if (user?.avatar) {
    return <Image source={{ uri: user.avatar }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#222' }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#E50914', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.4 }}>{user?.name?.[0]?.toUpperCase()}</Text>
    </View>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'simdi';
  if (diff < 3600) return `${Math.floor(diff / 60)}dk`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}s`;
  return `${Math.floor(diff / 86400)}g`;
}

export default function MessagesScreen({ navigation }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get('/messages/conversations');
      setConversations(res.data);
    } catch (err) {
      Alert.alert('Hata', 'Konusmalar yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchConversations(); }, []));

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color="#E50914" size="large" />
    </View>
  );

  return (
    <View style={styles.container}>
      {conversations.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyTitle}>Henuz mesajin yok</Text>
          <Text style={styles.emptySubtitle}>Eslestigi kimselerle burada konusabilirsin.</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.matchId}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.row}>
              {/* Avatar'a tıklayınca profil, satıra tıklayınca chat */}
              <TouchableOpacity
                onPress={() => navigation.navigate('UserProfile', {
                  userId: item.user.id,
                  matchId: item.matchId,
                })}
              >
                <Avatar user={item.user} size={52} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rowContent}
                onPress={() => navigation.navigate('Chat', { matchId: item.matchId, otherUser: item.user })}
              >
                <View style={styles.rowTop}>
                  <Text style={styles.rowName}>{item.user.name}</Text>
                  {item.lastMessage && <Text style={styles.rowTime}>{timeAgo(item.lastMessage.createdAt)}</Text>}
                </View>
                <Text style={styles.rowLast} numberOfLines={1}>
                  {item.lastMessage
                    ? (item.lastMessage.mine ? 'Sen: ' : '') + item.lastMessage.text
                    : '🎬 Eşleşme oldu — bir şeyler söyle!'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  center: { flex: 1, backgroundColor: '#0f0f0f', justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, padding: 32 },
  emptyEmoji: { fontSize: 52, marginBottom: 4 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  emptySubtitle: { color: '#555', fontSize: 14, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  rowContent: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  rowName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  rowTime: { color: '#555', fontSize: 12 },
  rowLast: { color: '#666', fontSize: 13 },
  separator: { height: 1, backgroundColor: '#1a1a1a', marginLeft: 80 },
});
