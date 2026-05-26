import React, { useState, useCallback } from 'react';
import ThemePicker from '../components/ThemePicker';
import * as DocumentPicker from 'expo-document-picker';
import {
  View, Text, Image, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Pressable, Modal,
  FlatList, Dimensions, ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext'; // Tema eklendi
import api from '../services/api';
import { normalizeImageUri } from '../services/imageUri';
import { Radii } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_BACKGROUND = require('../../assets/default-bg.png');

export default function ProfileScreen({ navigation }) {
  const { user, setUser } = useAuth();
  const { theme, isDark, movieTheme } = useTheme();
  const [themePickerVisible, setThemePickerVisible] = useState(false);
  const [stats, setStats] = useState(null);
  const [blockedCount, setBlockedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [importError, setImportError] = useState('');
  const [showUnmatched, setShowUnmatched] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);

  const styles = createStyles(theme, isDark); // Dinamik stiller fırlatıldı
  const backgroundImage = isDark ? (movieTheme?.backgroundImage || DEFAULT_BACKGROUND) : null;
  const overlayColors = movieTheme?.backgroundImage
    ? ['rgba(5,5,6,0.18)', 'rgba(5,5,6,0.62)', 'rgba(5,5,6,0.92)']
    : (movieTheme?.gradient
        ? [movieTheme.gradient[0] + 'ee', movieTheme.gradient[1] + 'cc', movieTheme.gradient[2] || theme.bg]
        : isDark
          ? ['rgba(5,5,6,0.10)', 'rgba(5,5,6,0.55)', 'rgba(5,5,6,0.88)']
          : ['#d7dce5', '#c8d0dc', '#b8c2d0']);

  const fetchProfileData = useCallback(async () => {
    try {
      const [profileRes, statsRes, blockedRes] = await Promise.all([
        api.get('/users/profile'),
        api.get('/users/profile/stats'),
        api.get('/users/profile/blocked'),
      ]);
      setUser((prev) => ({ ...prev, ...profileRes.data }));
      setStats(statsRes.data);
      setBlockedCount(blockedRes.data?.length ?? 0);
    } catch {
      // sessiz
    } finally {
      setLoading(false);
    }
  }, [setUser]);

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

  const content = (
    <LinearGradient colors={overlayColors} style={styles.container}>
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

      <View style={styles.appBar}>
        <View style={styles.appBarLeft}>
          <Feather name="lock" size={13} color={theme.textMuted} style={{ marginRight: 6 }} />
          <Text style={styles.appBarUsername}>{user?.username || 'profil'}</Text>
        </View>
        <View style={styles.appBarActions}>
          <TouchableOpacity style={styles.appBarIcon} onPress={() => setThemePickerVisible(true)}>
            <Text style={{ fontSize: 16 }}>{movieTheme ? movieTheme.emoji : '🎬'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.appBarIcon} onPress={() => navigation.navigate('EditProfile')}>
            <Feather name="more-horizontal" size={22} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ThemePicker visible={themePickerVisible} onClose={() => setThemePickerVisible(false)} />

      {loading ? (
        <ActivityIndicator size="large" color={theme.purple} style={{ marginTop: 60 }} />
      ) : (
        <>
          <View style={styles.header}>
            <Avatar user={user} theme={theme} size={82} onPress={() => setAvatarModalVisible(true)} />
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
      <AvatarModal
        visible={avatarModalVisible}
        user={user}
        theme={theme}
        onClose={() => setAvatarModalVisible(false)}
      />
    </ScrollView>
    </LinearGradient>
  );

  return backgroundImage ? (
    <ImageBackground source={backgroundImage} style={styles.container} resizeMode="cover">
      {content}
    </ImageBackground>
  ) : (
    content
  );
}

function Avatar({ user, theme, size, onPress }) {
  const avatarUri = normalizeImageUri(user?.avatar);
  return (
    <TouchableOpacity
      activeOpacity={avatarUri ? 0.82 : 1}
      onPress={avatarUri ? onPress : undefined}
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: theme.glass, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: theme.purpleBorder, overflow: 'hidden' }]}
    >
      {avatarUri ? (
        <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%', borderRadius: size / 2 }} />
      ) : (
        <Text style={{ color: theme.textPrimary, fontSize: size * 0.38, fontWeight: '900' }}>{user?.name?.[0]?.toUpperCase() || '?'}</Text>
      )}
    </TouchableOpacity>
  );
}

function AvatarModal({ visible, user, theme, onClose }) {
  const photos = getProfilePhotos(user);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const listRef = React.useRef(null);
  React.useEffect(() => {
    if (visible) {
      setActiveIndex(0);
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
      });
    }
  }, [visible]);
  if (photos.length === 0) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={stylesStatic.avatarModalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={stylesStatic.avatarModalContent}>
          <FlatList
            ref={listRef}
            data={photos}
            keyExtractor={(item, index) => `${item}-${index}`}
            horizontal
            pagingEnabled
            scrollEnabled={photos.length > 1}
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
            directionalLockEnabled
            bounces={false}
            renderItem={({ item }) => (
              <View style={stylesStatic.avatarModalPage}>
                <Image source={{ uri: item }} style={stylesStatic.avatarModalImage} resizeMode="contain" />
              </View>
            )}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setActiveIndex(index);
            }}
          />
          {photos.length > 1 ? (
            <View style={stylesStatic.avatarModalDots}>
              {photos.map((_, index) => (
                <View
                  key={index}
                  style={[stylesStatic.avatarModalDot, index === activeIndex && stylesStatic.avatarModalDotActive]}
                />
              ))}
            </View>
          ) : null}
          <TouchableOpacity
            style={[stylesStatic.avatarModalClose, { backgroundColor: theme.glassStrong || theme.glass }]}
            onPress={onClose}
          >
            <Feather name="x" size={22} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function getProfilePhotos(user) {
  const photos = Array.isArray(user?.profilePhotos) ? user.profilePhotos.filter(Boolean) : [];
  const merged = user?.avatar ? [user.avatar, ...photos.filter((photo) => photo !== user.avatar)] : photos;
  return merged.slice(0, 3).map(normalizeImageUri).filter(Boolean);
}

const stylesStatic = StyleSheet.create({
  avatarModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarModalContent: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
    backgroundColor: '#050506',
  },
  avatarModalPage: {
    width: SCREEN_WIDTH,
    aspectRatio: 1,
  },
  avatarModalImage: {
    width: '100%',
    height: '100%',
  },
  avatarModalDots: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  avatarModalDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.36)',
  },
  avatarModalDotActive: {
    width: 18,
    backgroundColor: '#fff',
  },
  avatarModalClose: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// ARTIK STİLLER DİNAMİK OLARAK DETECT EDİLİYOR
const createStyles = (theme, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  scroll: { flex: 1 },
  appBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 58, paddingBottom: 12 },
  appBarLeft: { flexDirection: 'row', alignItems: 'center' },
  appBarUsername: { fontSize: 20, fontWeight: '900', color: theme.textPrimary, letterSpacing: -0.5 },
  appBarActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
