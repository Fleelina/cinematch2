import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity, FlatList,
} from 'react-native';
import api from '../services/api';

export default function PersonScreen({ route, navigation }) {
  const { personId, name } = route.params;
  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bioExpanded, setBioExpanded] = useState(false);

  useEffect(() => {
    api.get(`/persons/${personId}`)
      .then((res) => setPerson(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [personId]);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color="#E50914" size="large" />
    </View>
  );

  if (!person) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>Bilgi yüklenemedi</Text>
    </View>
  );

  const BIO_LIMIT = 280;
  const bioText = person.biography || '';
  const isBioLong = bioText.length > BIO_LIMIT;
  const displayedBio = bioExpanded || !isBioLong
    ? bioText
    : bioText.slice(0, BIO_LIMIT) + '…';

  const MovieCard = ({ item }) => (
    <TouchableOpacity
      style={styles.movieCard}
      onPress={() => navigation.push('MovieDetail', { tmdbId: item.tmdbId, title: item.title })}
    >
      <Image source={{ uri: item.poster }} style={styles.moviePoster} />
      <View style={styles.movieInfo}>
        <Text style={styles.movieTitle} numberOfLines={2}>{item.title}</Text>
        {item.character ? (
          <Text style={styles.movieSub} numberOfLines={1}>{item.character}</Text>
        ) : null}
        <View style={styles.movieMeta}>
          {item.year ? <Text style={styles.movieYear}>{item.year}</Text> : null}
          {item.rating && parseFloat(item.rating) > 0 ? (
            <Text style={styles.movieRating}>⭐ {item.rating}</Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Geri */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>← Geri</Text>
      </TouchableOpacity>

      {/* Profil */}
      <View style={styles.profileSection}>
        {person.photo
          ? <Image source={{ uri: person.photo }} style={styles.photo} />
          : (
            <View style={styles.photoPlaceholder}>
              <Text style={{ fontSize: 48 }}>👤</Text>
            </View>
          )
        }
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{person.name}</Text>
          {person.knownForDepartment && (
            <Text style={styles.department}>
              {person.knownForDepartment === 'Acting' ? '🎭 Oyuncu' :
               person.knownForDepartment === 'Directing' ? '🎬 Yönetmen' :
               person.knownForDepartment}
            </Text>
          )}
          {person.birthday && (
            <Text style={styles.meta}>🎂 {person.birthday.split('-').reverse().join('.')}</Text>
          )}
          {person.placeOfBirth && (
            <Text style={styles.meta} numberOfLines={2}>📍 {person.placeOfBirth}</Text>
          )}
        </View>
      </View>

      {/* Biyografi */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Biyografi</Text>
        {bioText.length > 0 ? (
          <>
            <Text style={styles.bio}>{displayedBio}</Text>
            {isBioLong && (
              <TouchableOpacity onPress={() => setBioExpanded(!bioExpanded)}>
                <Text style={styles.bioToggle}>
                  {bioExpanded ? 'Daha az göster' : 'Devamını gör'}
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <Text style={styles.bioEmpty}>Bu kişi için biyografi bilgisi bulunamadı.</Text>
        )}
      </View>

      {/* Yönettiği filmler */}
      {person.directed?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yönettiği Filmler</Text>
          <FlatList
            data={person.directed}
            keyExtractor={(item) => String(item.tmdbId)}
            renderItem={({ item }) => <MovieCard item={item} />}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Oynadığı filmler */}
      {person.actedIn?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Filmleri</Text>
          <FlatList
            data={person.actedIn}
            keyExtractor={(item) => String(item.tmdbId)}
            renderItem={({ item }) => <MovieCard item={item} />}
            scrollEnabled={false}
          />
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  center: { flex: 1, backgroundColor: '#0f0f0f', justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#fff', fontSize: 16 },

  backBtn: {
    marginTop: 52, marginLeft: 16, marginBottom: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  backBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  profileSection: {
    flexDirection: 'row', gap: 16,
    paddingHorizontal: 16, paddingVertical: 12,
    alignItems: 'flex-start',
  },
  photo: {
    width: 100, height: 140, borderRadius: 12,
    backgroundColor: '#1c1c1c',
  },
  photoPlaceholder: {
    width: 100, height: 140, borderRadius: 12,
    backgroundColor: '#1c1c1c',
    justifyContent: 'center', alignItems: 'center',
  },
  profileInfo: { flex: 1, paddingTop: 4, gap: 6 },
  name: { color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 26 },
  department: { color: '#E50914', fontSize: 13, fontWeight: '600' },
  meta: { color: '#888', fontSize: 12, lineHeight: 18 },

  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: {
    color: '#fff', fontSize: 16, fontWeight: '700',
    marginBottom: 12, letterSpacing: 0.2,
  },
  bio: { color: '#bbb', fontSize: 14, lineHeight: 22 },
  bioToggle: {
    color: '#E50914', fontSize: 13, fontWeight: '600',
    marginTop: 8,
  },
  bioEmpty: {
    color: '#444', fontSize: 14, fontStyle: 'italic',
  },

  movieCard: {
    flexDirection: 'row', gap: 12,
    marginBottom: 12,
    backgroundColor: '#181818',
    borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: '#222',
  },
  moviePoster: {
    width: 54, height: 80, borderRadius: 8,
    backgroundColor: '#222',
  },
  movieInfo: { flex: 1, justifyContent: 'center', gap: 4 },
  movieTitle: { color: '#fff', fontSize: 14, fontWeight: '600', lineHeight: 20 },
  movieSub: { color: '#888', fontSize: 12, fontStyle: 'italic' },
  movieMeta: { flexDirection: 'row', gap: 10, marginTop: 2 },
  movieYear: { color: '#666', fontSize: 12 },
  movieRating: { color: '#FFD700', fontSize: 12, fontWeight: '600' },
});
