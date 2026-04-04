import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import api from '../services/api';

export default function MatchesScreen() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await api.get('/matches');
        setMatches(res.data);
      } catch (err) {
        Alert.alert('Hata', 'Eşleşmeler yüklenemedi');
      } finally {
        setLoading(false);
      }
    };
    fetchMatches();
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator color="#E50914" size="large" /></View>;

  if (matches.length === 0) return (
    <View style={styles.center}>
      <Text style={styles.emptyText}>Henüz eşleşmen yok 🎬</Text>
      <Text style={styles.emptySubText}>Keşfet ekranından beğendiğin insanlara like at!</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Eşleşmeler</Text>
      <FlatList
        data={matches}
        keyExtractor={item => item.matchId}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.user.name[0].toUpperCase()}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.user.name}</Text>
              {item.user.bio ? <Text style={styles.bio}>{item.user.bio}</Text> : null}
              <Text style={styles.date}>
                {new Date(item.createdAt).toLocaleDateString('tr-TR')} tarihinde eşleştin
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', padding: 16 },
  center: { flex: 1, backgroundColor: '#0f0f0f', justifyContent: 'center', alignItems: 'center' },
  header: { color: '#fff', fontSize: 26, fontWeight: 'bold', marginBottom: 16, marginTop: 8 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  emptySubText: { color: '#888', fontSize: 14, textAlign: 'center', marginTop: 8, paddingHorizontal: 32 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1c1c1c',
    borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#2a2a2a'
  },
  avatar: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: '#E50914',
    justifyContent: 'center', alignItems: 'center', marginRight: 14
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  info: { flex: 1 },
  name: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  bio: { color: '#aaa', fontSize: 13, marginTop: 2 },
  date: { color: '#555', fontSize: 11, marginTop: 4 },
});
