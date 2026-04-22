import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { Colors, Radii } from '../theme';

function Avatar({ user, size = 52 }) {
  if (user?.avatar) {
    return (
      <Image
        source={{ uri: user.avatar }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: Colors.bgCard }}
      />
    );
  }

  return (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.avatarFallbackText}>{user?.name?.[0]?.toUpperCase()}</Text>
    </View>
  );
}

function formatBlockedDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function BlockedUsersScreen({ navigation }) {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBlockedUsers = useCallback(async () => {
    try {
      const res = await api.get('/users/profile/blocked');
      setBlockedUsers(res.data || []);
    } catch {
      setBlockedUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchBlockedUsers();
  }, [fetchBlockedUsers]));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{'\u2190'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Engellenenler</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.red} size="large" />
        </View>
      ) : blockedUsers.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Engellenen profil yok</Text>
          <Text style={styles.emptyText}>Engelledigin kullanicilar burada gorunur.</Text>
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const displayName = item.showAge && item.age ? `${item.name}, ${item.age}` : item.name;

            return (
              <TouchableOpacity
                style={styles.row}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
              >
                <Avatar user={item} />
                <View style={styles.rowBody}>
                  <Text style={styles.name}>{displayName}</Text>
                  {item.username ? <Text style={styles.username}>@{item.username}</Text> : null}
                  <Text style={styles.meta}>Engellendi {formatBlockedDate(item.blockedAt)}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 14,
  },
  backBtn: { width: 40, padding: 4 },
  backBtnText: { color: Colors.textPrimary, fontSize: 24, fontWeight: '600' },
  headerTitle: { color: Colors.textPrimary, fontSize: 19, fontWeight: '800' },
  headerSpacer: { width: 40 },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  emptyTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyText: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center' },

  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  avatarFallback: {
    backgroundColor: Colors.redDim,
    borderWidth: 1,
    borderColor: Colors.redBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: { color: Colors.textPrimary, fontSize: 20, fontWeight: '800' },
  rowBody: { flex: 1 },
  name: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  username: { color: Colors.textSecondary, fontSize: 12, marginBottom: 4 },
  meta: { color: Colors.textMuted, fontSize: 12 },
  chevron: { color: Colors.textMuted, fontSize: 24, lineHeight: 24 },
  separator: { height: 1, backgroundColor: Colors.borderDim, marginLeft: 66 },
});
