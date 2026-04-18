import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity, FlatList, Alert
} from 'react-native';
import api from '../services/api';
import CineMatchRating from '../components/CineMatchRating';

// Skeleton placeholder kutusu
function Skeleton({ width, height, borderRadius = 8, style }) {
  return (
    <View style={[
      { width, height, borderRadius, backgroundColor: '#1e1e1e' },
      style,
    ]} />
  );
}

function MovieDetailSkeleton() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0f0f0f' }}>
      {/* Backdrop */}
      <Skeleton width="100%" height={220} borderRadius={0} />
      <View style={{ padding: 16, marginTop: -20 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', gap: 14, marginBottom: 16 }}>
          <Skeleton width={110} height={160} borderRadius={12} style={{ marginTop: -40 }} />
          <View style={{ flex: 1, paddingTop: 8, gap: 8 }}>
            <Skeleton width="90%" height={20} />
            <Skeleton width="60%" height={14} />
            <Skeleton width="50%" height={14} />
            <Skeleton width="70%" height={14} />
          </View>
        </View>
        {/* Buton */}
        <Skeleton width="100%" height={48} borderRadius={12} style={{ marginBottom: 8 }} />
        <Skeleton width="60%" height={12} borderRadius={6} style={{ alignSelf: 'center', marginBottom: 20 }} />
        {/* Puan kutusu */}
        <Skeleton width="100%" height={90} borderRadius={14} style={{ marginBottom: 20 }} />
        {/* Türler */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {[80, 60, 70].map((w, i) => <Skeleton key={i} width={w} height={28} borderRadius={20} />)}
        </View>
        {/* Overview */}
        <Skeleton width="40%" height={18} style={{ marginBottom: 10 }} />
        <Skeleton width="100%" height={14} style={{ marginBottom: 6 }} />
        <Skeleton width="100%" height={14} style={{ marginBottom: 6 }} />
        <Skeleton width="80%" height={14} />
      </View>
    </ScrollView>
  );
}

export default function MovieDetailScreen({ route, navigation }) {
  const { tmdbId, title, poster: initialPoster, year: initialYear } = route.params;
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [overviewTranslated, setOverviewTranslated] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState(null);

  const fetchDetail = async () => {
    try {
      const res = await api.get(`/movies/detail/${tmdbId}`);
      setMovie(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDetail(); }, [tmdbId]);

  const handleToggle = async () => {
    if (!movie) return;
    setActionLoading(true);
    try {
      if (movie.isAdded) {
        const res = await api.delete(`/movies/remove/${tmdbId}`);
        setMovie(prev => ({ ...prev, isAdded: false, addedByCount: res.data.addedByCount }));
      } else {
        const res = await api.post('/movies/add', {
          tmdbId: movie.tmdbId,
          title: movie.title,
          poster: movie.poster,
          year: movie.year,
        });
        setMovie(prev => ({ ...prev, isAdded: true, addedByCount: res.data.addedByCount }));
      }
    } catch (err) {
      Alert.alert('Hata', 'İşlem başarısız');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRate = async (score) => {
    if (!movie.isAdded) {
      Alert.alert('Uyarı', 'Puan vermek için önce filmi profiline ekle!');
      return;
    }
    setRatingLoading(true);
    try {
      const res = await api.post(`/movies/rate/${tmdbId}`, { rating: score });
      setMovie(prev => ({
        ...prev,
        userRating: res.data.userRating,
        cinematchRating: res.data.cinematchRating,
        ratingCount: res.data.ratingCount,
      }));
    } catch (err) {
      Alert.alert('Hata', err.response?.data?.error || 'Puan verilemedi');
    } finally {
      setRatingLoading(false);
    }
  };

  const handleTranslate = async () => {
    // Geri al
    if (overviewTranslated) {
      setOverviewTranslated(false);
      return;
    }
    // Zaten çevrilmişse tekrar istek atma
    if (translatedText) {
      setOverviewTranslated(true);
      return;
    }
    // TMDB'den gelen TR varsa direkt kullan
    if (movie.overviewTr) {
      setTranslatedText(movie.overviewTr);
      setOverviewTranslated(true);
      return;
    }
    // Yoksa backend'e çeviri isteği at
    setTranslating(true);
    try {
      const res = await api.post('/movies/translate', { text: movie.overview });
      setTranslatedText(res.data.translated);
      setOverviewTranslated(true);
    } catch (err) {
      Alert.alert('Hata', 'Çeviri yapılamadı');
    } finally {
      setTranslating(false);
    }
  };

  if (loading) {
    // initialPoster varsa hemen poster+başlık göster, arka planda yüklensin
    if (initialPoster) {
      return (
        <ScrollView style={{ flex: 1, backgroundColor: '#0f0f0f' }}>
          <View style={{ width: '100%', height: 220, backgroundColor: '#1c1c1c' }} />
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>← Geri</Text>
          </TouchableOpacity>
          <View style={{ padding: 16, marginTop: -20 }}>
            <View style={{ flexDirection: 'row', gap: 14, marginBottom: 16 }}>
              <Image
                source={{ uri: initialPoster }}
                style={[styles.poster, { marginTop: -40 }]}
              />
              <View style={{ flex: 1, paddingTop: 8, gap: 8 }}>
                <Text style={styles.title}>{title}</Text>
                {initialYear && <Text style={styles.meta}>{initialYear}</Text>}
                <View style={{ width: 80, height: 12, borderRadius: 6, backgroundColor: '#1e1e1e' }} />
                <View style={{ width: 100, height: 12, borderRadius: 6, backgroundColor: '#1e1e1e' }} />
              </View>
            </View>
            <View style={{ width: '100%', height: 48, borderRadius: 12, backgroundColor: '#1e1e1e', marginBottom: 20 }} />
            <View style={{ width: '100%', height: 90, borderRadius: 14, backgroundColor: '#1e1e1e' }} />
          </View>
        </ScrollView>
      );
    }
    return <MovieDetailSkeleton />;
  }

  if (!movie) return (
    <View style={styles.center}><Text style={styles.errorText}>Film bilgisi yüklenemedi</Text></View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Backdrop */}
      {movie.backdrop
        ? <Image source={{ uri: movie.backdrop }} style={styles.backdrop} />
        : <View style={styles.backdropPlaceholder} />
      }

      {/* Geri butonu */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>← Geri</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Poster + Temel Bilgi */}
        <View style={styles.header}>
          {movie.poster
            ? <Image source={{ uri: movie.poster }} style={styles.poster} />
            : <View style={styles.posterPlaceholder}><Text style={{ fontSize: 40 }}>🎬</Text></View>
          }
          <View style={styles.headerInfo}>
            <Text style={styles.title}>{movie.title}</Text>
            <Text style={styles.meta}>{movie.year} • {movie.runtime} dk</Text>
            <View style={styles.ratingRow}>
              <Text style={styles.star}>⭐</Text>
              <Text style={styles.imdbRating}>{movie.rating} / 10</Text>
              <Text style={styles.imdbLabel}>IMDb</Text>
            </View>
            {movie.director && movie.directorId && (
              <TouchableOpacity onPress={() => navigation.push('Person', { personId: movie.directorId, name: movie.director })}>
                <Text style={styles.director}>🎬 <Text style={styles.directorLink}>{movie.director}</Text></Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Ekle / Çıkar Butonu */}
        <TouchableOpacity
          style={[styles.toggleBtn, movie.isAdded && styles.toggleBtnAdded]}
          onPress={handleToggle}
          disabled={actionLoading}
        >
          {actionLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.toggleBtnText}>
                {movie.isAdded ? '✓ Filmlerimden Çıkar' : '+ Filmlerime Ekle'}
              </Text>
          }
        </TouchableOpacity>
        <Text style={styles.addedByText}>
          {movie.addedByCount > 0
            ? `${movie.addedByCount} kişi tarafından eklendi`
            : 'Henüz kimse eklemedi, ilk sen ol!'}
        </Text>

        {/* CineMatch Puanı */}
        <View style={styles.cinematchBox}>
          {/* Üst satır: kalp + puan + oy sayısı */}
          <View style={styles.cinematchTop}>
            <CineMatchRating
              rating={movie.cinematchRating}
              ratingCount={movie.ratingCount}
              size={38}
              id={String(movie.tmdbId)}
            />
            <View style={styles.cinematchDivider} />
            <View style={styles.myRatingBox}>
              <Text style={styles.myRatingLabel}>Senin puanın</Text>
              {ratingLoading
                ? <ActivityIndicator color="#E50914" size="small" />
                : <Text style={styles.myRatingValue}>
                    {movie.userRating ? movie.userRating : '—'}
                  </Text>
              }
            </View>
          </View>

          {/* Puan butonları — ince yatay şerit */}
          <View style={styles.scoreRow}>
            {[1,2,3,4,5,6,7,8,9,10].map((score) => {
              const isActive = movie.userRating === score;
              const isPast = movie.userRating && score < movie.userRating;
              return (
                <TouchableOpacity
                  key={score}
                  style={[
                    styles.scoreBtn,
                    isActive && styles.scoreBtnActive,
                    isPast && styles.scoreBtnPast,
                  ]}
                  onPress={() => handleRate(score)}
                  disabled={ratingLoading}
                >
                  <Text style={[
                    styles.scoreBtnText,
                    (isActive || isPast) && styles.scoreBtnTextActive,
                  ]}>
                    {score}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Türler */}
        {movie.genres?.length > 0 && (
          <View style={styles.genreRow}>
            {movie.genres.map((g, i) => (
              <View key={i} style={styles.genreTag}>
                <Text style={styles.genreText}>{g}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Özet */}
        {movie.overview ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Konu</Text>
            <Text style={styles.overview}>
              {overviewTranslated ? translatedText : movie.overview}
            </Text>
            <TouchableOpacity
              style={styles.translateBtn}
              onPress={handleTranslate}
              disabled={translating}
            >
              {translating
                ? <ActivityIndicator size="small" color="#1d9bf0" />
                : <Text style={styles.translateBtnText}>
                    {overviewTranslated ? '🌐 Show original' : '🌐 Türkçeye çevir'}
                  </Text>
              }
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Oyuncular */}
        {movie.cast?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Oyuncular</Text>
            <FlatList
              data={movie.cast}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.castCard}
                  onPress={() => navigation.push('Person', { personId: item.personId, name: item.name })}
                >
                  {item.photo
                    ? <Image source={{ uri: item.photo }} style={styles.castPhoto} />
                    : <View style={styles.castPhotoPlaceholder}><Text style={{ fontSize: 24 }}>👤</Text></View>
                  }
                  <Text style={styles.castName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.castCharacter} numberOfLines={1}>{item.character}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        <View style={{ height: 32 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  center: { flex: 1, backgroundColor: '#0f0f0f', justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#fff', fontSize: 16 },
  backdrop: { width: '100%', height: 220 },
  backdropPlaceholder: { width: '100%', height: 220, backgroundColor: '#1c1c1c' },
  backBtn: {
    position: 'absolute', top: 44, left: 16,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  backBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  content: { padding: 16, marginTop: -20 },
  header: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  poster: { width: 110, height: 160, borderRadius: 12, marginTop: -40 },
  posterPlaceholder: {
    width: 110, height: 160, borderRadius: 12, marginTop: -40,
    backgroundColor: '#1c1c1c', justifyContent: 'center', alignItems: 'center'
  },
  headerInfo: { flex: 1, paddingTop: 8 },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  originalTitle: { color: '#888', fontSize: 13, marginBottom: 6, fontStyle: 'italic' },
  meta: { color: '#aaa', fontSize: 13, marginBottom: 6 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  star: { fontSize: 14 },
  imdbRating: { color: '#FFD700', fontWeight: 'bold', fontSize: 14 },
  imdbLabel: { color: '#888', fontSize: 11 },
  director: { color: '#ccc', fontSize: 13 },
  directorLink: { color: '#E50914', fontWeight: '600', textDecorationLine: 'underline' },
  toggleBtn: {
    backgroundColor: '#E50914', borderRadius: 12, padding: 14,
    alignItems: 'center', marginBottom: 8,
  },
  toggleBtnAdded: { backgroundColor: '#333', borderWidth: 1, borderColor: '#555' },
  toggleBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  addedByText: { color: '#888', fontSize: 12, textAlign: 'center', marginBottom: 20 },

  // CineMatch Puanı
  cinematchBox: {
    backgroundColor: '#181818',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#242424',
    gap: 10,
  },
  cinematchTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cinematchDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#2e2e2e',
    marginHorizontal: 14,
  },
  myRatingBox: {
    flex: 1,
    alignItems: 'flex-end',
  },
  myRatingLabel: {
    color: '#666',
    fontSize: 11,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  myRatingValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreBtn: {
    flex: 1,
    marginHorizontal: 1.5,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#242424',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreBtnActive: {
    backgroundColor: '#E50914',
  },
  scoreBtnPast: {
    backgroundColor: '#5a0a0f',
  },
  scoreBtnText: { color: '#555', fontSize: 11, fontWeight: '700' },
  scoreBtnTextActive: { color: '#fff' },

  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  genreTag: {
    backgroundColor: '#1c1c1c', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#333'
  },
  genreText: { color: '#ccc', fontSize: 12 },
  section: { marginBottom: 24 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  overview: { color: '#bbb', fontSize: 14, lineHeight: 22 },
  translateBtn: { marginTop: 8, alignSelf: 'flex-start', paddingVertical: 4 },
  translateBtnText: { color: '#1d9bf0', fontSize: 13, fontWeight: '600' },
  castCard: { width: 90, marginRight: 12, alignItems: 'center' },
  castPhoto: { width: 70, height: 100, borderRadius: 10, marginBottom: 6 },
  castPhotoPlaceholder: {
    width: 70, height: 100, borderRadius: 10, marginBottom: 6,
    backgroundColor: '#1c1c1c', justifyContent: 'center', alignItems: 'center'
  },
  castName: { color: '#fff', fontSize: 11, textAlign: 'center', fontWeight: '600' },
  castCharacter: { color: '#888', fontSize: 10, textAlign: 'center' },
});
