import React, { useState, useCallback } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import {
  View, Text, Image, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Colors, Radii, Shadows } from '../theme';

export default function ProfileScreen({ navigation }) {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [blockedCount, setBlockedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [importError, setImportError] = useState('');
  const [showUnmatched, setShowUnmatched] = useState(false);

  const fetchProfileData = useCallback(async () => {
    try {
      const [statsRes, blockedRes] = await Promise.all([
        api.get('/users/profile/stats'),
        api.get('/users/profile/blocked'),
      ]);
      setStats(statsRes.data);
      setBlockedCount(blockedRes.data?.length ?? 0);
    } catch {
      // sessiz
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchProfileData();
  }, [fetchProfileData]));

  const displayName = user?.showAge && user?.age ? `${user.name}, ${user.age}` : user?.name;

  const importLetterboxd = async () => {
    if (importing) return;

    setImportError('');
    setImportSummary(null);
    setShowUnmatched(false);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/zip', 'application/x-zip-compressed'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name || 'letterboxd-export.zip',
        type: file.mimeType || 'application/zip',
      });

      setImporting(true);
      const res = await api.post('/import/letterboxd', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setImportSummary(res.data);
      fetchProfileData();
    } catch (err) {
      setImportError(err.response?.data?.error || 'Letterboxd import basarisiz oldu');
    } finally {
      setImporting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 50 }}
    >
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Profil</Text>
        <Pressable
          style={({ pressed }) => [styles.settingsBtn, pressed && { opacity: 0.7 }]}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </Pressable>
      </View>

      {loading ? <SkeletonProfile /> : (
        <>
          <View style={styles.hero}>
            <Avatar user={user} size={96} />
            <Text style={styles.displayName}>{displayName}</Text>
            {user?.username ? <Text style={styles.username}>@{user.username}</Text> : null}
            {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
          </View>

          <View style={styles.statsRow}>
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('MyMovies')}
            >
              <StatCard icon="🎬" value={stats?.movieCount ?? 0} label="Film" />
            </TouchableOpacity>
            <StatCard icon="❤️" value={stats?.matchCount ?? 0} label="Eslesme" />
            <StatCard
              icon="⭐"
              value={stats?.avgRating || '-'}
              label="Ort. Puan"
              highlight={!!stats?.avgRating}
            />
          </View>

          <TouchableOpacity
            style={styles.blockedEntry}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('BlockedUsers')}
          >
            <View style={styles.blockedEntryLeft}>
              <View style={styles.blockedIconWrap}>
                <Text style={styles.blockedIcon}>🚫</Text>
              </View>
              <View>
                <Text style={styles.blockedTitle}>Engellenenler</Text>
                <Text style={styles.blockedSub}>Engelledigin profilleri gor</Text>
              </View>
            </View>
            <View style={styles.blockedEntryRight}>
              <Text style={styles.blockedCount}>{blockedCount}</Text>
              <Text style={styles.blockedArrow}>›</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.importCard}>
            <View style={styles.importHeader}>
              <View style={styles.importBadge}>
                <Text style={styles.importBadgeText}>LB</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.importTitle}>Letterboxd'den ice aktar</Text>
                <Text style={styles.importSub}>
                  ZIP export dosyani yukle, filmlerini tek seferde tasiyalim.
                </Text>
              </View>
            </View>

            {importSummary && (
              <>
                <View style={styles.importSummary}>
                  <ImportSummaryItem label="Film" value={importSummary.importedSuccessfully} />
                  <ImportSummaryItem label="Puan" value={importSummary.ratingsImported} />
                  <ImportSummaryItem label="Liste" value={importSummary.watchlistEntriesImported} />
                  <ImportSummaryItem label="Eslesmedi" value={importSummary.unmatchedFilms} muted />
                </View>

                {importSummary.unmatched?.length > 0 && (
                  <>
                    <Pressable
                      style={({ pressed }) => [styles.unmatchedToggle, pressed && { opacity: 0.75 }]}
                      onPress={() => setShowUnmatched((value) => !value)}
                    >
                      <Text style={styles.unmatchedToggleText}>
                        {showUnmatched ? 'Eslesmeyenleri gizle' : 'Eslesmeyenleri goster'}
                      </Text>
                      <Text style={styles.unmatchedToggleArrow}>{showUnmatched ? '⌃' : '⌄'}</Text>
                    </Pressable>

                    {showUnmatched && (
                      <View style={styles.unmatchedList}>
                        {importSummary.unmatched.slice(0, 12).map((movie, index) => (
                          <View key={`${movie.title}-${movie.year || index}`} style={styles.unmatchedRow}>
                            <Text style={styles.unmatchedTitle} numberOfLines={1}>
                              {movie.title}
                            </Text>
                            <Text style={styles.unmatchedYear}>{movie.year || '-'}</Text>
                          </View>
                        ))}
                        {importSummary.unmatched.length > 12 && (
                          <Text style={styles.unmatchedMore}>
                            +{importSummary.unmatched.length - 12} film daha
                          </Text>
                        )}
                      </View>
                    )}
                  </>
                )}
              </>
            )}

            {importError ? <Text style={styles.importError}>{importError}</Text> : null}

            <Pressable
              style={({ pressed }) => [
                styles.importBtn,
                importing && styles.importBtnDisabled,
                pressed && !importing && { opacity: 0.86 },
              ]}
              disabled={importing}
              onPress={importLetterboxd}
            >
              {importing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.importBtnText}>ZIP Yukle</Text>
              )}
            </Pressable>
          </View>

          {stats?.topMovies?.length > 0 && (
            <Section emoji="🎞️" title="Son Eklenenler">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                {stats.topMovies.map((movie, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.movieThumb}
                    onPress={() => navigation.navigate('MovieDetail', { tmdbId: movie.tmdbId, title: movie.title })}
                  >
                    {movie.poster ? (
                      <Image source={{ uri: movie.poster }} style={styles.movieThumbImg} />
                    ) : (
                      <View style={[styles.movieThumbImg, styles.movieThumbFallback]}>
                        <Text style={{ fontSize: 24 }}>🎬</Text>
                      </View>
                    )}
                    <View style={styles.movieThumbOverlay} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Section>
          )}

          {stats && (
            <Section emoji="📊" title="Izleme Aliskanliklari">
              <View style={styles.habitsCard}>
                {stats.avgRating && (
                  <HabitRow label="Ortalama puan" value={`⭐ ${stats.avgRating}`} />
                )}
                {stats.favoriteEra && (
                  <HabitRow label="Favori donem" value={stats.favoriteEra} />
                )}
                {stats.watchStyle && (
                  <HabitRow
                    label="Izleme tarzi"
                    value={`${stats.watchStyle.label} ${stats.watchStyle.emoji}`}
                    last
                  />
                )}
                {stats.movieCount === 0 && (
                  <Text style={styles.habitsEmpty}>
                    Film ekledikce istatistiklerin burada gorunur.
                  </Text>
                )}
              </View>
            </Section>
          )}

          <TouchableOpacity
            style={styles.statsCta}
            onPress={() => navigation.navigate('Stats')}
          >
            <Text style={styles.statsCtaText}>📈 Istatistiklerimi Gor</Text>
            <Text style={styles.statsCtaArrow}>›</Text>
          </TouchableOpacity>

          {stats && stats.movieCount < 10 && (
            <View style={styles.boostCard}>
              <View style={styles.boostLeft}>
                <Text style={styles.boostEmoji}>🔥</Text>
                <View>
                  <Text style={styles.boostTitle}>Profilini guclendir</Text>
                  <Text style={styles.boostSub}>
                    {10 - stats.movieCount} film daha ekle, daha iyi esles
                  </Text>
                </View>
              </View>
              <Pressable
                style={({ pressed }) => [styles.boostBtn, pressed && { opacity: 0.85 }]}
                onPress={() => navigation.navigate('Filmlerim')}
              >
                <Text style={styles.boostBtnText}>Film Ekle</Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function Avatar({ user, size }) {
  if (user?.avatar) {
    return (
      <View style={styles.avatarWrap}>
        <Image
          source={{ uri: user.avatar }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
        <View style={[styles.avatarRing, {
          width: size + 8, height: size + 8, borderRadius: (size + 8) / 2, top: -4, left: -4,
        }]}
        />
      </View>
    );
  }

  return (
    <View style={styles.avatarWrap}>
      <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={{ color: '#fff', fontSize: size * 0.38, fontWeight: '800' }}>
          {user?.name?.[0]?.toUpperCase()}
        </Text>
      </View>
      <View style={[styles.avatarRing, {
        width: size + 8, height: size + 8, borderRadius: (size + 8) / 2, top: -4, left: -4,
      }]}
      />
    </View>
  );
}

function StatCard({ icon, value, label, highlight }) {
  return (
    <View style={[styles.statCard, highlight && styles.statCardHighlight]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, highlight && { color: Colors.gold }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Section({ emoji, title, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionEmoji}>{emoji}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function HabitRow({ label, value, last }) {
  return (
    <View style={[styles.habitRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.habitLabel}>{label}</Text>
      <Text style={styles.habitValue}>{value}</Text>
    </View>
  );
}

function ImportSummaryItem({ label, value, muted }) {
  return (
    <View style={styles.importSummaryItem}>
      <Text style={[styles.importSummaryValue, muted && styles.importSummaryValueMuted]}>{value ?? 0}</Text>
      <Text style={styles.importSummaryLabel}>{label}</Text>
    </View>
  );
}

function SkeletonProfile() {
  return (
    <>
      <View style={styles.hero}>
        <View style={[styles.skeletonCircle, { width: 96, height: 96, borderRadius: 48, marginBottom: 14 }]} />
        <View style={[styles.skeletonBlock, { width: 140, height: 18, marginBottom: 8 }]} />
        <View style={[styles.skeletonBlock, { width: 100, height: 13 }]} />
      </View>
      <View style={styles.statsRow}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.statCard, { backgroundColor: Colors.bgCard }]}>
            <View style={[styles.skeletonBlock, { width: 28, height: 28, marginBottom: 8, borderRadius: 6 }]} />
            <View style={[styles.skeletonBlock, { width: 36, height: 22, marginBottom: 6 }]} />
            <View style={[styles.skeletonBlock, { width: 48, height: 10 }]} />
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8,
  },
  topBarTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, color: Colors.textPrimary },
  settingsBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.bgCard, borderWidth: 0.5, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  settingsIcon: { fontSize: 16 },

  hero: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 22 },
  avatarWrap: { position: 'relative', marginBottom: 16 },
  avatarFallback: {
    backgroundColor: Colors.red, justifyContent: 'center', alignItems: 'center',
  },
  avatarRing: {
    position: 'absolute', borderWidth: 1.5, borderColor: Colors.redBorder,
  },
  displayName: {
    fontSize: 22, fontWeight: '800', letterSpacing: -0.4,
    color: Colors.textPrimary, marginBottom: 5, textAlign: 'center',
  },
  username: { fontSize: 12, color: Colors.red, fontWeight: '600', marginBottom: 6 },
  bio: {
    fontSize: 13, color: Colors.textSecondary, textAlign: 'center',
    lineHeight: 19, marginTop: 2,
  },

  statsRow: { flexDirection: 'row', marginHorizontal: 16, gap: 10, marginBottom: 8 },
  statCard: {
    flex: 1, backgroundColor: Colors.bgCard,
    borderRadius: Radii.lg, paddingVertical: 16,
    alignItems: 'center', gap: 4,
    borderWidth: 0.5, borderColor: Colors.border,
  },
  statCardHighlight: { borderColor: 'rgba(240,180,41,0.3)' },
  statIcon: { fontSize: 20 },
  statValue: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: 10, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  blockedEntry: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: Radii.lg,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  blockedEntryLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  blockedIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(200,16,46,0.10)',
    borderWidth: 0.5,
    borderColor: 'rgba(200,16,46,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockedIcon: { fontSize: 16 },
  blockedTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  blockedSub: { color: Colors.textSecondary, fontSize: 12 },
  blockedEntryRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  blockedCount: { color: Colors.textPrimary, fontSize: 14, fontWeight: '800' },
  blockedArrow: { color: Colors.textMuted, fontSize: 20 },

  importCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 15,
    borderRadius: Radii.lg,
    backgroundColor: '#101008',
    borderWidth: 0.5,
    borderColor: 'rgba(240,180,41,0.18)',
  },
  importHeader: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  importBadge: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(240,180,41,0.14)',
    borderWidth: 0.5,
    borderColor: 'rgba(240,180,41,0.28)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  importBadgeText: { color: Colors.gold, fontSize: 12, fontWeight: '900', letterSpacing: 0.4 },
  importTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '800', marginBottom: 3 },
  importSub: { color: Colors.textSecondary, fontSize: 12, lineHeight: 17 },
  importSummary: {
    flexDirection: 'row',
    marginTop: 14,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255,255,255,0.035)',
    overflow: 'hidden',
  },
  importSummaryItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRightWidth: 0.5,
    borderRightColor: 'rgba(255,255,255,0.06)',
  },
  importSummaryValue: { color: Colors.gold, fontSize: 15, fontWeight: '900' },
  importSummaryValueMuted: { color: Colors.textMuted },
  importSummaryLabel: { color: Colors.textMuted, fontSize: 9, marginTop: 2, textTransform: 'uppercase' },
  importError: { color: '#ff8d8d', fontSize: 12, marginTop: 10, lineHeight: 17 },
  unmatchedToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  unmatchedToggleText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },
  unmatchedToggleArrow: { color: Colors.textMuted, fontSize: 14, fontWeight: '800' },
  unmatchedList: {
    marginTop: 8,
    borderRadius: Radii.md,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  unmatchedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  unmatchedTitle: { flex: 1, color: Colors.textSecondary, fontSize: 12 },
  unmatchedYear: { color: Colors.textMuted, fontSize: 12, fontWeight: '700' },
  unmatchedMore: { color: Colors.textMuted, fontSize: 11, padding: 10, textAlign: 'center' },
  importBtn: {
    height: 42,
    borderRadius: Radii.md,
    backgroundColor: Colors.red,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    ...Shadows.red,
  },
  importBtnDisabled: { opacity: 0.65 },
  importBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  section: { marginHorizontal: 16, marginTop: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  sectionEmoji: { fontSize: 17 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },

  movieThumb: { marginRight: 10, position: 'relative' },
  movieThumbImg: { width: 98, height: 142, borderRadius: Radii.md, backgroundColor: Colors.bgElevated },
  movieThumbFallback: { justifyContent: 'center', alignItems: 'center' },
  movieThumbOverlay: {
    position: 'absolute', inset: 0, borderRadius: Radii.md,
    borderWidth: 0.5, borderColor: Colors.border,
  },

  habitsCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.lg, marginTop: 12,
    borderWidth: 0.5, borderColor: Colors.border, overflow: 'hidden',
  },
  habitRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: Colors.border,
  },
  habitLabel: { fontSize: 13, color: Colors.textSecondary },
  habitValue: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  habitsEmpty: {
    color: Colors.textHint, fontSize: 12, textAlign: 'center',
    padding: 20, fontStyle: 'italic',
  },

  boostCard: {
    marginHorizontal: 16, marginTop: 24,
    backgroundColor: '#110508',
    borderRadius: Radii.lg, borderWidth: 0.5, borderColor: 'rgba(200,16,46,0.2)',
    padding: 16, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  boostLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  boostEmoji: { fontSize: 26 },
  boostTitle: { color: Colors.textPrimary, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  boostSub: { color: Colors.textMuted, fontSize: 11 },
  boostBtn: {
    backgroundColor: Colors.red, borderRadius: Radii.md,
    paddingHorizontal: 14, paddingVertical: 10,
    ...Shadows.red,
  },
  boostBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  skeletonCircle: { backgroundColor: Colors.bgElevated },
  skeletonBlock: { backgroundColor: Colors.bgElevated, borderRadius: Radii.sm },
});
