import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext'; // Tema eklendi

function Avatar({ user, theme, size = 82 }) {
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: theme.glass, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: theme.purpleBorder }]}>
      {user?.avatar ? <Image source={{ uri: user.avatar }} style={{ width: '100%', height: '100%', borderRadius: size / 2 }} /> : <Text style={{ color: '#fff', fontSize: size * 0.4, fontWeight: '900' }}>{user?.name?.[0]?.toUpperCase() || '?'}</Text>}
    </View>
  );
}

export default function UserProfileScreen({ route, navigation }) {
  const { userId, matchId } = route.params;
  const { theme, isDark } = useTheme(); // Temayı dinliyoruz
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileOptionsVisible, setProfileOptionsVisible] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  const styles = createStyles(theme, isDark);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [profileRes, statsRes] = await Promise.all([
          api.get(`/users/${userId}/profile`),
          api.get(`/users/${userId}/stats`),
        ]);
        setProfile(profileRes.data); setStats(statsRes.data);
        if (typeof profileRes.data.isBlocked === 'boolean') { setIsBlocked(profileRes.data.isBlocked); }
        else {
          api.get('/users/profile/blocked').then((r) => {
            const ids = (r.data || []).map((item) => item.id); setIsBlocked(ids.includes(userId));
          }).catch(() => {});
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchAll();
  }, [userId]);

  const handleBlockUser = async () => {
    setProfileOptionsVisible(false); setBlockLoading(true);
    try { await api.post(`/matches/block-user/${userId}`); setIsBlocked(true); Alert.alert('Tamam', 'Kullanıcı engellendi.'); }
    catch { Alert.alert('Hata', 'Engellenemedi'); } finally { setBlockLoading(false); }
  };

  const handleUnblockUser = async () => {
    setProfileOptionsVisible(false); setBlockLoading(true);
    try { await api.post(`/matches/unblock/${userId}`); setIsBlocked(false); Alert.alert('Tamam', 'Engel kaldırıldı.'); }
    catch { Alert.alert('Hata', 'Engel kaldırılamadı'); } finally { setBlockLoading(false); }
  };

  const confirmUnblock = () => { Alert.alert('Engeli Kaldır', 'Engel kaldırılsın mı?', [{ text: 'İptal', style: 'cancel' }, { text: 'Kaldır', onPress: handleUnblockUser }]); };

  if (loading) return <View style={styles.center}><ActivityIndicator color={theme.purple} size="large" /></View>;
  if (!profile) return <View style={styles.center}><Text style={styles.errorText}>Profil yüklenemedi</Text></View>;

  const displayName = profile.showAge && profile.age ? `${profile.name}, ${profile.age}` : profile.name;

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {isDark && <><View style={styles.glowPurple} /><View style={styles.glowRed} /></>}
        <View style={styles.appBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.appBarIcon}><Feather name="chevron-left" size={24} color={theme.textPrimary} /></TouchableOpacity>
          <Text style={styles.appBarUsername}>{profile.username ? `@${profile.username}` : 'Profil'}</Text>
          <TouchableOpacity style={styles.appBarIcon} onPress={() => setProfileOptionsVisible(true)}><Feather name="more-horizontal" size={24} color={theme.textPrimary} /></TouchableOpacity>
        </View>

        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Avatar user={profile} theme={theme} size={82} />
            {profile.avatarType === 'character' && <View style={styles.avatarBadge}><Feather name="users" size={12} color="#fff" /></View>}
          </View>
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('UserMovies', { userId, name: profile.name })}><Text style={styles.statValue}>{stats?.movieCount ?? 0}</Text><Text style={styles.statLabel}>Film</Text></TouchableOpacity>
            <View style={styles.statDivider} /><View style={styles.statItem}><Text style={styles.statValue}>{stats?.matchCount ?? 0}</Text><Text style={styles.statLabel}>Ortak</Text></View>
            <View style={styles.statDivider} /><View style={styles.statItem}><Text style={[styles.statValue, { color: theme.gold }]}>{stats?.avgRating ?? '—'}</Text><Text style={styles.statLabel}>Puan</Text></View>
          </View>
        </View>

        <View style={styles.bioSection}>
          <Text style={styles.displayName}>{displayName}</Text>
          {profile.bio ? <Text style={styles.bioText}>{profile.bio}</Text> : null}
          {isBlocked && <TouchableOpacity activeOpacity={0.8} onPress={confirmUnblock} style={{ marginTop: 8 }}><Text style={styles.blockedHint}>Bu kullanıcıyı engelledin.</Text></TouchableOpacity>}
        </View>

        {matchId && !isBlocked ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.navigate('Chat', { matchId, otherUser: profile })}><Feather name="send" size={16} color="#fff" style={{ marginRight: 8 }} /><Text style={styles.btnPrimaryText}>Mesaj Gönder</Text></TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.divider} />

        {stats?.topMovies?.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Son Eklenenler</Text><TouchableOpacity onPress={() => navigation.navigate('UserMovies', { userId, name: profile.name })}><Text style={styles.sectionLink}>Tümünü Gör ›</Text></TouchableOpacity></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
              {stats.topMovies.map((movie, index) => (
                <TouchableOpacity key={index} onPress={() => navigation.navigate('MovieDetail', { tmdbId: movie.tmdbId, title: movie.title })}><View style={styles.movieThumb}>{movie.poster ? <Image source={{ uri: movie.poster }} style={styles.movieThumbImg} /> : <View style={[styles.movieThumbImg, { justifyContent: 'center', alignItems: 'center' }]}><Feather name="film" size={24} color={theme.textMuted} /></View>}</View></TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.divider} />

        {stats && (
          <View style={styles.listSection}>
            <Text style={[styles.sectionTitle, { paddingHorizontal: 20, marginBottom: 14 }]}>İzleme Alışkanlıkları</Text>
            {stats.avgRating && <View style={styles.listItem}><View style={styles.listItemLeft}><View style={styles.listIconWrap}><Feather name="star" size={16} color={theme.gold} /></View><Text style={styles.listItemText}>Ortalama Puan</Text></View><Text style={styles.listItemValue}>{stats.avgRating}</Text></View>}
            {stats.favoriteEra && <View style={styles.listItem}><View style={styles.listItemLeft}><View style={styles.listIconWrap}><Feather name="clock" size={16} color={theme.textSecondary} /></View><Text style={styles.listItemText}>Favori Dönem</Text></View><Text style={styles.listItemValue}>{stats.favoriteEra}</Text></View>}
            {stats.watchStyle && <View style={styles.listItem}><View style={styles.listItemLeft}><View style={styles.listIconWrap}><Feather name="eye" size={16} color={theme.textSecondary} /></View><Text style={styles.listItemText}>İzleme Tarzı</Text></View><Text style={styles.listItemValue}>{stats.watchStyle.label}</Text></View>}
          </View>
        )}
      </ScrollView>

      <Modal visible={profileOptionsVisible} transparent animationType="fade" onRequestClose={() => setProfileOptionsVisible(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setProfileOptionsVisible(false)}>
          <View style={styles.menuSheet}>
            <View style={styles.menuIndicator} /><Text style={styles.menuTitle}>Seçenekler</Text>
            <TouchableOpacity style={styles.menuItem} activeOpacity={0.8} onPress={() => { if (isBlocked) { confirmUnblock(); return; } handleBlockUser(); }}>
              <Feather name={isBlocked ? "unlock" : "slash"} size={18} color={isBlocked ? theme.textPrimary : theme.red} style={{ width: 24 }} /><Text style={[styles.menuItemText, isBlocked ? { color: theme.textPrimary } : { color: theme.red }]}>{isDark ? (isBlocked ? 'Engeli Kaldır' : 'Kullanıcıyı Engelle') : (isBlocked ? 'Engeli Kaldır' : 'Engelle')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const createStyles = (theme, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: theme.textMuted, fontSize: 15 },
  glowPurple: { position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(155,92,255,0.1)' },
  glowRed: { position: 'absolute', top: 150, left: -80, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,59,85,0.08)' },
  appBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 10 },
  appBarUsername: { fontSize: 16, fontWeight: '700', color: theme.textPrimary, letterSpacing: 0.5 },
  appBarIcon: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 10, gap: 20 },
  avatarContainer: { position: 'relative' },
  avatarBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: theme.purple, borderRadius: 10, width: 24, height: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: theme.bg },
  statsRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', backgroundColor: theme.glass, borderRadius: 20, borderWidth: 1, borderColor: theme.border, paddingVertical: 14 },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 20, fontWeight: '900', color: theme.textPrimary, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: theme.textMuted, marginTop: 3, fontWeight: '600' },
  statDivider: { width: 1, height: 28, backgroundColor: theme.border },
  bioSection: { paddingHorizontal: 20, marginTop: 16 },
  displayName: { fontSize: 18, fontWeight: '800', color: theme.textPrimary },
  bioText: { fontSize: 14, color: theme.textSecondary, marginTop: 4, lineHeight: 20 },
  blockedHint: { color: theme.red, fontSize: 13, fontWeight: '600' },
  actionsRow: { paddingHorizontal: 20, marginTop: 20 },
  btnPrimary: { height: 44, borderRadius: 12, backgroundColor: theme.purple, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  divider: { height: 1, backgroundColor: theme.borderSoft, marginVertical: 24, marginHorizontal: 20 },
  section: { marginBottom: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: theme.textPrimary, letterSpacing: -0.4 },
  sectionLink: { fontSize: 13, color: theme.purple, fontWeight: '700' },
  movieThumb: { width: 90, height: 130, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: theme.borderSoft },
  movieThumbImg: { width: '100%', height: '100%', backgroundColor: theme.glassStrong },
  listSection: { paddingHorizontal: 20, gap: 16 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  listIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.border, justifyContent: 'center', alignItems: 'center' },
  listItemText: { color: theme.textPrimary, fontSize: 14, fontWeight: '600' },
  listItemValue: { color: theme.textMuted, fontSize: 14 },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end' },
  menuSheet: { backgroundColor: theme.bgSoft, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, borderWidth: 1, borderColor: theme.borderSoft },
  menuIndicator: { width: 40, height: 4, backgroundColor: theme.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  menuTitle: { color: theme.textSecondary, fontSize: 14, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  menuItemText: { fontSize: 15, fontWeight: '600' },
});