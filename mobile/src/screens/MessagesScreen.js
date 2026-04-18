import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Colors, Radii } from '../theme';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'şimdi';
  if (diff < 3600) return `${Math.floor(diff / 60)}dk`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}s`;
  return `${Math.floor(diff / 86400)}g`;
}

function Avatar({ user, size = 48 }) {
  const AVATAR_COLORS = ['#c8102e', '#1d6a8a', '#2a6a3a', '#6a2a7a', '#6a4a1a'];
  const idx = user?.name?.charCodeAt(0) % AVATAR_COLORS.length ?? 0;
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
      backgroundColor: AVATAR_COLORS[idx],
      justifyContent: 'center', alignItems: 'center',
    }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.38 }}>
        {user?.name?.[0]?.toUpperCase()}
      </Text>
    </View>
  );
}

export default function MessagesScreen({ navigation }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get('/messages/conversations');
      setConversations(res.data);
    } catch {
      Alert.alert('Hata', 'Konuşmalar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchConversations(); }, []));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.red} size="large" />
      </View>
    );
  }

  if (conversations.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyEmoji}>💬</Text>
        <Text style={styles.emptyTitle}>Henüz mesajın yok</Text>
        <Text style={styles.emptySub}>
          Eşleştiğin kişilerle buradan konuşabilirsin.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mesajlar</Text>
        <Text style={styles.headerSub}>{conversations.length} aktif konuşma</Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.matchId}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16 }}
        renderItem={({ item }) => (
          <ConversationRow
            item={item}
            currentUserId={user?.id}
            onAvatarPress={() =>
              navigation.navigate('UserProfile', {
                userId: item.user.id,
                matchId: item.matchId,
              })
            }
            onPress={() =>
              navigation.navigate('Chat', { matchId: item.matchId, otherUser: item.user })
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

function ConversationRow({ item, currentUserId, onAvatarPress, onPress }) {
  const hasUnread = item.unreadCount > 0;
  const lastMsg = item.lastMessage;
  const previewText = lastMsg
    ? (lastMsg.mine ? `Sen: ${lastMsg.text}` : lastMsg.text)
    : '🎬 Eşleşme oldu — bir şeyler söyle!';

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.8}>
      {/* Avatar */}
      <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.9}>
        <View style={{ position: 'relative' }}>
          <Avatar user={item.user} size={52} />
          {hasUnread && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>

      {/* İçerik */}
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={[styles.rowName, hasUnread && styles.rowNameUnread]}>
            {item.user.name}
          </Text>
          {lastMsg && (
            <Text style={styles.rowTime}>{timeAgo(lastMsg.createdAt)}</Text>
          )}
        </View>
        <View style={styles.rowBottom}>
          <Text
            style={[styles.rowPreview, hasUnread && styles.rowPreviewUnread]}
            numberOfLines={1}
          >
            {previewText}
          </Text>
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: {
    flex: 1, backgroundColor: Colors.bg,
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },

  // Header
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  headerTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, color: Colors.textPrimary },
  headerSub: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },

  // Satır
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13, gap: 14,
  },
  rowContent: { flex: 1 },
  rowTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 4,
  },
  rowName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  rowNameUnread: { fontWeight: '800' },
  rowTime: { fontSize: 11, color: Colors.textMuted },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowPreview: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  rowPreviewUnread: { color: Colors.textPrimary, fontWeight: '600' },

  // Okunmamış göstergeler
  unreadDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: Colors.red, borderWidth: 2, borderColor: Colors.bg,
  },
  unreadBadge: {
    backgroundColor: Colors.red, borderRadius: Radii.pill,
    minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 6, marginLeft: 8,
  },
  unreadBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  separator: { height: 0.5, backgroundColor: Colors.borderDim, marginLeft: 82 },

  // Boş durum
  emptyEmoji: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { color: Colors.textPrimary, fontSize: 19, fontWeight: '800', marginBottom: 8 },
  emptySub: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
