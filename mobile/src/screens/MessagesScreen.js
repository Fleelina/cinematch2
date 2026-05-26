import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Alert, ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Radii } from '../theme';
import { useTheme } from '../context/ThemeContext';

const DEFAULT_BACKGROUND = require('../../assets/default-bg.png');

const DEFAULT_T = {
  bg: '#050506',
  bgSoft: '#0B0B10',
  glass: 'rgba(255,255,255,0.06)',
  glassStrong: 'rgba(255,255,255,0.10)',
  border: 'rgba(255,255,255,0.10)',
  borderSoft: 'rgba(255,255,255,0.06)',
  red: '#ff3b55',
  redSoft: 'rgba(255,59,85,0.15)',
  text: '#ffffff',
  textSoft: '#b9b8c7',
  textMuted: '#737286',
};

let styles = createStyles(DEFAULT_T);

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'şimdi';
  if (diff < 3600) return `${Math.floor(diff / 60)}dk`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}s`;
  return `${Math.floor(diff / 86400)}g`;
}

function Avatar({ user, size = 48, T = DEFAULT_T }) {
  const AVATAR_COLORS = ['#c8102e', '#1d6a8a', '#2a6a3a', '#6a2a7a', '#6a4a1a'];
  const idx = user?.name?.charCodeAt(0) % AVATAR_COLORS.length ?? 0;
  if (user?.avatar) {
    return (
      <Image
        source={{ uri: user.avatar }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: T.bgSoft }}
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
  const { theme: themeColors, movieTheme, isDark } = useTheme();
  const T = React.useMemo(() => ({
    bg: themeColors.bg,
    bgSoft: themeColors.bgSoft,
    glass: themeColors.glass,
    glassStrong: themeColors.glassStrong || themeColors.glass,
    border: themeColors.border,
    borderSoft: themeColors.borderSoft,
    primary: themeColors.primary,
    primarySoft: themeColors.primarySoft,
    primarySofter: themeColors.primaryBorder || themeColors.primarySoft,
    rowBg: isDark ? 'rgba(12,12,18,0.86)' : 'rgba(255,255,255,0.88)',
    rowBgActive: isDark ? 'rgba(18,18,26,0.94)' : 'rgba(255,255,255,0.96)',
    red: themeColors.red,
    redSoft: themeColors.redSoft,
    text: themeColors.textPrimary,
    textSoft: themeColors.textSecondary,
    textMuted: themeColors.textMuted,
  }), [themeColors, isDark]);
  styles = React.useMemo(() => createStyles(T), [T]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const backgroundImage = isDark ? (movieTheme?.backgroundImage || DEFAULT_BACKGROUND) : null;
  const gradientColors = movieTheme?.backgroundImage
    ? ['rgba(5,5,6,0.18)', 'rgba(5,5,6,0.58)', 'rgba(5,5,6,0.9)']
    : (movieTheme?.gradient
        ? [movieTheme.gradient[0] + 'ee', movieTheme.gradient[1] + 'cc', movieTheme.gradient[2] || T.bg]
        : isDark
          ? ['rgba(5,5,6,0.10)', 'rgba(5,5,6,0.55)', 'rgba(5,5,6,0.88)']
          : ['#d7dce5', '#c8d0dc', '#b8c2d0']);

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
      <ThemeShell backgroundImage={backgroundImage} gradientColors={gradientColors}>
        <View style={styles.center}>
          <ActivityIndicator color={T.red} size="large" />
        </View>
      </ThemeShell>
    );
  }

  if (conversations.length === 0) {
    return (
      <ThemeShell backgroundImage={backgroundImage} gradientColors={gradientColors}>
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyTitle}>Henüz mesajın yok</Text>
          <Text style={styles.emptySub}>
            Eşleştiğin kişilerle buradan konuşabilirsin.
          </Text>
        </View>
      </ThemeShell>
    );
  }

  return (
    <ThemeShell backgroundImage={backgroundImage} gradientColors={gradientColors}>
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
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
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
            T={T}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
    </ThemeShell>
  );
}

function ThemeShell({ children, backgroundImage, gradientColors }) {
  const content = (
    <LinearGradient
      colors={gradientColors}
      style={styles.shell}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 0.7, y: 1 }}
    >
      {children}
    </LinearGradient>
  );
  if (!backgroundImage) return <View style={styles.shell}>{content}</View>;
  return (
    <ImageBackground source={backgroundImage} style={styles.shell} resizeMode="cover">
      {content}
    </ImageBackground>
  );
}

function ConversationRow({ item, currentUserId, onAvatarPress, onPress, T }) {
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
          <Avatar user={item.user} size={52} T={T} />
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

function createStyles(T) {
  return StyleSheet.create({
  shell: { flex: 1 },
  container: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },

  // Header
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  headerTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, color: T.text },
  headerSub: { fontSize: 12, color: T.textMuted, marginTop: 4 },

  // Satır
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 13, gap: 14,
    backgroundColor: T.rowBg,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
  },
  rowContent: { flex: 1 },
  rowTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 4,
  },
  rowName: { fontSize: 15, fontWeight: '600', color: T.text },
  rowNameUnread: { fontWeight: '800' },
  rowTime: { fontSize: 11, color: T.textMuted },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowPreview: { fontSize: 13, color: T.textSoft, flex: 1 },
  rowPreviewUnread: { color: T.text, fontWeight: '600' },

  // Okunmamış göstergeler
  unreadDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: T.red, borderWidth: 2, borderColor: T.bg,
  },
  unreadBadge: {
    backgroundColor: T.red, borderRadius: Radii.pill,
    minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 6, marginLeft: 8,
  },
  unreadBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  separator: { height: 10 },

  // Boş durum
  emptyEmoji: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { color: T.text, fontSize: 19, fontWeight: '800', marginBottom: 8 },
  emptySub: { color: T.textSoft, fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
}
