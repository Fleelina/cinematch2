import React, { useState, useCallback } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import {
  View, Text, Image, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext'; // Tema eklendi
import api from '../services/api';
import { Radii } from '../theme';

export default function ProfileScreen({ navigation }) {
  const { user } = useAuth();
  const { theme, isDark } = useTheme(); // Temayı dinliyoruz
  const [stats, setStats] = useState(null);
  const [blockedCount, setBlockedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [importError, setImportError] = useState('');
  const [showUnmatched, setShowUnmatched] = useState(false);

  const styles = createStyles(theme, isDark); // Dinamik stiller fırlatıldı

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
    setImportError(''); setImportSummary(null); setShowUnmatched(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/zip', 'application/x-zip-compressed'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const file = result.assets[0];
      const formData = new FormData();
      formData.append('file', { uri: file.uri, name: file.name || 'letterboxd-export.zip', type: file.mimeType || 'application/zip' });
      setImporting(true);
      const res = await api.post('/import/letterboxd', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImportSummary(res.data);
      fetchProfileData();
    } catch (err) {
      setImportError(err.response?.data?.error || 'İçe aktarma başarısız oldu');
    } finally { setImporting(false); }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
      {isDark && <><View style={styles.glowRed} /><View style={styles.glowPurple} /></>}

      <View style={styles.appBar}>
        <View style={styles.appBarLeft}>
          <Feather name="lock" size={13} color={theme.textMuted} style={{ marginRight: 6 }} />
          <Text style={styles.appBarUsername}>{user?.username || 'profil'}</Text>
        </View>
        <TouchableOpacity style={styles.appBarIcon} onPress={() => navigation.navigate('Settings')}>
          <Feather name="menu" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.purple} style={{ marginTop: 60 }} />
      ) : (
        <>
          <View style={styles.header}>
            <Avatar user={user} theme={theme} size={82} />
            <View style={styles.statsRow}>
              <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('MyMovies')}>
                <Text style={styles.statValue}>{stats?.movieCount ?? 0}</Text>
                <Text style={styles.headerStatLabel}>Film</Text>
              </TouchableOpacity>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats?.matchCount ?? 0}</Text>
                <Text style={styles.headerStatLabel}>Eşleşme</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.gold }]}>{stats?.avgRating || '—'}</Text>
                <Text style={styles.headerStatLabel}>Ort. Puan</Text>
              </View>
            </View>
          </View>

          <View style={styles.bioSection}>
            <Text style={styles.displayName}>{displayName}</Text>
            {user?.bio ? <Text style={styles.bioText}>{user.bio}</Text> : null}
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.navigate('EditProfile')}>
              <Text style={styles.btnPrimaryText}>Profili Düzenle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.navigate('Stats')}>
              <Text style={styles.btnSecondaryText}>İstatistikler</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {stats?.topMovies?.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Son Eklenenler</Text>
                <TouchableOpacity onPress={() => navigation.navigate('MyMovies')}>
                  <Text style={styles.sectionLink}>Tümünü Gör ›</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
                {stats.topMovies.map((movie, index) => (
                  <TouchableOpacity key={index} onPress={() => navigation.navigate('MovieDetail', { tmdbId: movie.tmdbId, title: movie.title })}>
                    <View style={styles.movieThumb}>
                      {movie.poster ? (
                        <Image source={{ uri: movie.poster }} style={styles.movieThumbImg} />
                      ) : (
                        <View style={[styles.movieThumbImg, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.glass }]}><Feather name="film" size={24} color={theme.textMuted} /></View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.listSection}>
            <TouchableOpacity style={styles.listItem} onPress={() => navigation.navigate('BlockedUsers')}>
              <View style={styles.listItemLeft}>
                <View style={styles.listIconWrap}><Feather name="user-x" size={16} color={theme.textSecondary} /></View>
                <Text style={styles.listItemText}>Engellenen Hesaplar</Text>
              </View>
              <View style={styles.listItemRight}>
                {blockedCount > 0 && <View style={styles.listBadge}><Text style={styles.listBadgeText}>{blockedCount}</Text></View>}
                <Feather name="chevron-right" size={18} color={theme.textMuted} />
              </View>
            </TouchableOpacity>

            {stats?.favoriteEra ? (
              <View style={styles.listItem}>
                <View style={styles.listItemLeft}>
                  <View style={styles.listIconWrap}><Feather name="clock" size={16} color={theme.textSecondary} /></View>
                  <Text style={styles.listItemText}>Favori Dönem</Text>
                </View>
                <Text style={styles.listItemValue}>{stats.favoriteEra}</Text>
              </View>
            ) : null}

            {stats?.watchStyle ? (
              <View style={styles.listItem}>
                <View style={styles.listItemLeft}>
                  <View style={styles.listIconWrap}><Feather name="eye" size={16} color={theme.textSecondary} /></View>
                  <Text style={styles.listItemText}>İzleme Tarzı</Text>
                </View>
                <Text style={styles.listItemValue}>{stats.watchStyle.label}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.divider} />

          <View style={styles.importCard}>
            <View style={styles.importCardRow}>
              <View style={[styles.importIconWrap, { backgroundColor: theme.purple }]}>
                <Feather name="download-cloud" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.importTitle}>Letterboxd'den Taşı</Text>
                <Text style={styles.importSub}>Geçmişini ZIP dosyası ile aktar</Text>
              </View>
              <TouchableOpacity style={[styles.importBtn, importing && { opacity: 0.5 }]} disabled={importing} onPress={importLetterboxd}>
                {importing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.importBtnText}>Yükle</Text>}
              </TouchableOpacity>
            </View>
            {importError ? <Text style={styles.importError}>{importError}</Text> : null}
            {importSummary ? (
              <View style={styles.importResult}>
                <Text style={styles.importResultText}>✓ <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>{importSummary.importedSuccessfully}</Text> film aktarıldı</Text>
                {importSummary.unmatchedFilms > 0 && <Text style={styles.importResultText}><Text style={{ color: theme.textSecondary }}>{importSummary.unmatchedFilms}</Text> eşleşmedi</Text>}
              </View>
            ) : null}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function Avatar({ user, theme, size }) {
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: theme.glass, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: theme.purpleBorder }]}>
      {user?.avatar ? (
        <Image source={{ uri: user.avatar }} style={{ width: '100%', height: '100%', borderRadius: size / 2 }} />
      ) : (
        <Text style={{ color: theme.textPrimary, fontSize: size * 0.38, fontWeight: '900' }}>{user?.name?.[0]?.toUpperCase() || '?'}</Text>
      )}
    </View>
  );
}

// ARTIK STİLLER DİNAMİK OLARAK DETECT EDİLİYOR
const createStyles = (theme, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  glowRed: { position: 'absolute', top: -80, left: -80, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,59,85,0.15)' },
  glowPurple: { position: 'absolute', top: 160, right: -100, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(155,92,255,0.1)' },
  appBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 58, paddingBottom: 12 },
  appBarLeft: { flexDirection: 'row', alignItems: 'center' },
  appBarUsername: { fontSize: 20, fontWeight: '900', color: theme.textPrimary, letterSpacing: -0.5 },
  appBarIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.border, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 8, gap: 20 },
  statsRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', backgroundColor: theme.glass, borderRadius: 20, borderWidth: 1, borderColor: theme.border, paddingVertical: 14 },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 20, fontWeight: '900', color: theme.textPrimary, letterSpacing: -0.5 },
  headerStatLabel: { fontSize: 11, color: theme.textMuted, marginTop: 3, fontWeight: '600' },
  statDivider: { width: 1, height: 28, backgroundColor: theme.border },
  bioSection: { paddingHorizontal: 20, marginTop: 16 },
  displayName: { fontSize: 16, fontWeight: '800', color: theme.textPrimary },
  bioText: { fontSize: 14, color: theme.textSecondary, marginTop: 5, lineHeight: 20 },
  actionsRow: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 16, gap: 10 },
  btnPrimary: { flex: 1, height: 38, borderRadius: 10, backgroundColor: theme.purple, justifyContent: 'center', alignItems: 'center', elevation: isDark ? 4 : 1 },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnSecondary: { flex: 1, height: 38, borderRadius: 10, backgroundColor: theme.purpleSoft, borderWidth: 1, borderColor: theme.purpleBorder, justifyContent: 'center', alignItems: 'center' },
  btnSecondaryText: { color: theme.purple, fontSize: 14, fontWeight: '700' },
  divider: { height: 1, backgroundColor: theme.borderSoft, marginVertical: 20, marginHorizontal: 20 },
  section: { marginBottom: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: theme.textPrimary, letterSpacing: -0.4 },
  sectionLink: { fontSize: 13, color: theme.purple, fontWeight: '700' },
  movieThumb: { width: 90, height: 130, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: theme.borderSoft },
  movieThumbImg: { width: '100%', height: '100%', backgroundColor: theme.glassStrong },
  listSection: { paddingHorizontal: 20, gap: 18 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  listIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.border, justifyContent: 'center', alignItems: 'center' },
  listItemText: { color: theme.textPrimary, fontSize: 15, fontWeight: '600' },
  listItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listBadge: { backgroundColor: theme.glassStrong, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  listBadgeText: { color: theme.textSecondary, fontSize: 13, fontWeight: '600' },
  listItemValue: { color: theme.textMuted, fontSize: 14, fontWeight: '600' },
  importCard: { marginHorizontal: 20, padding: 16, backgroundColor: theme.purpleSoft, borderRadius: 16, borderWidth: 1, borderColor: theme.purpleBorder },
  importCardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  importIconWrap: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  importTitle: { color: theme.textPrimary, fontSize: 14, fontWeight: '700' },
  importSub: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
  importBtn: { backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.purpleBorder, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  importBtnText: { color: theme.textPrimary, fontSize: 13, fontWeight: '700' },
  importResult: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.borderSoft, gap: 4 },
  importResultText: { color: theme.textSecondary, fontSize: 13 },
  importError: { color: theme.red, fontSize: 12, marginTop: 10 },
});