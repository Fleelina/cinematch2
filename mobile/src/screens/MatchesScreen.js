import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  Alert, TouchableOpacity, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';
import { Colors, Radii, Shadows } from '../theme';

export default function MatchesScreen({ navigation }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await api.get('/matches');
        setMatches(res.data);
      } catch {
        Alert.alert('Hata', 'Eslesmeler yuklenemedi');
      } finally {
        setLoading(false);
      }
    };
    fetchMatches();
  }, []);

  const sorted = useMemo(
    () => [...matches].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [matches]
  );
  const today = sorted.filter(isToday);
  const older = sorted.filter((m) => !isToday(m));
  const featured = sorted[0];

  if (loading) {
    return (
      <GradientShell center>
        <ActivityIndicator color={Colors.red} size="large" />
      </GradientShell>
    );
  }

  if (matches.length === 0) {
    return (
      <GradientShell center>
        <View style={styles.emptyGlow} />
        <Text style={styles.emptyKicker}>MATCH RADAR</Text>
        <Text style={styles.emptyTitle}>Henuz eslesmen yok</Text>
        <Text style={styles.emptySub}>
          Begendigin kisiler seni de begendiginde burada parlak bir sinyal yakalayacagiz.
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Eslesmeler')}
        >
          <Text style={styles.emptyButtonText}>Eslesmeye Basla</Text>
        </TouchableOpacity>
      </GradientShell>
    );
  }

  return (
    <GradientShell>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Match</Text>
            <Text style={styles.subtitle}>
              {matches.length} sinyal bulundu, sohbet icin hazir.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.radarButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Eslesmeler')}
          >
            <Text style={styles.radarIcon}>+</Text>
          </TouchableOpacity>
        </View>

        {featured && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('Chat', {
              matchId: featured.matchId,
              otherUser: featured.user,
            })}
          >
            <LinearGradient
              colors={['rgba(200,16,46,0.22)', 'rgba(255,255,255,0.055)', 'rgba(10,10,15,0.94)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroOrb} />
              <View style={styles.heroAvatarWrap}>
                <MatchAvatar user={featured.user} size={82} />
                <View style={styles.heroAvatarRing} />
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.heroKicker}>EN SICAK ESLESME</Text>
                <Text style={styles.heroName} numberOfLines={1}>{featured.user.name}</Text>
                <Text style={styles.heroMeta}>
                  {isToday(featured) ? 'Bugun eslestiniz' : `${getDaysAgo(featured.createdAt)} eslestiniz`}
                </Text>
              </View>
              <View style={styles.heroCta}>
                <Text style={styles.heroCtaText}>Sohbet</Text>
                <Text style={styles.heroCtaArrow}>›</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {today.length > 0 && (
          <SectionHeader label="Yeni eslesmeler" accent="LIVE" />
        )}
        {today.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.todayList}
          >
            {today.map((item) => (
              <TouchableOpacity
                key={`${item.matchId}_today`}
                style={styles.todayCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Chat', {
                  matchId: item.matchId,
                  otherUser: item.user,
                })}
              >
                <LinearGradient
                  colors={['rgba(255,65,89,0.55)', 'rgba(255,255,255,0.04)']}
                  style={styles.todayAvatarShell}
                >
                  <MatchAvatar user={item.user} size={64} />
                </LinearGradient>
                <Text style={styles.todayName} numberOfLines={1}>
                  {item.user.name.split(' ')[0]}
                </Text>
                <Text style={styles.todayHint}>Yeni</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <SectionHeader label={older.length > 0 ? 'Tum eslesmeler' : 'Sohbetler'} accent="CHAT" />
        <View style={styles.matchList}>
          {(older.length > 0 ? older : sorted).map((item) => (
            <MatchRow
              key={item.matchId}
              item={item}
              onPress={() => navigation.navigate('Chat', {
                matchId: item.matchId,
                otherUser: item.user,
              })}
              onAvatarPress={() => navigation.navigate('UserProfile', { userId: item.user.id })}
            />
          ))}
        </View>
      </ScrollView>
    </GradientShell>
  );
}

function GradientShell({ children, center }) {
  return (
    <LinearGradient
      colors={['#210409', '#07080d', '#030407']}
      locations={[0, 0.38, 1]}
      style={[styles.container, center && styles.center]}
    >
      <View style={styles.redBloom} />
      <View style={styles.blueBloom} />
      {children}
    </LinearGradient>
  );
}

function SectionHeader({ label, accent }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionMark} />
      <Text style={styles.sectionTitle}>{label}</Text>
      <View style={styles.sectionLine} />
      <Text style={styles.sectionAccent}>{accent}</Text>
    </View>
  );
}

function MatchRow({ item, onPress, onAvatarPress }) {
  const daysAgo = getDaysAgo(item.createdAt);
  const isNew = isToday(item);

  return (
    <TouchableOpacity style={styles.matchCard} onPress={onPress} activeOpacity={0.78}>
      <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.9}>
        <View style={[styles.rowAvatarShell, isNew && styles.rowAvatarShellNew]}>
          <MatchAvatar user={item.user} size={54} />
        </View>
      </TouchableOpacity>

      <View style={styles.matchInfo}>
        <View style={styles.matchTop}>
          <Text style={styles.matchName} numberOfLines={1}>{item.user.name}</Text>
          {isNew ? (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>Yeni</Text>
            </View>
          ) : (
            <Text style={styles.matchDate}>{daysAgo}</Text>
          )}
        </View>
        {item.user.bio ? (
          <Text style={styles.matchBio} numberOfLines={1}>{item.user.bio}</Text>
        ) : (
          <Text style={styles.matchBioFallback}>Ilk mesaji gonder</Text>
        )}
      </View>

      <View style={styles.chevronBubble}>
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

function MatchAvatar({ user, size }) {
  const avatarColors = ['#c8102e', '#1d6a8a', '#2a6a3a', '#6a2a7a', '#6a4a1a'];
  const colorIndex = user.name?.charCodeAt(0) % avatarColors.length ?? 0;

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
      backgroundColor: avatarColors[colorIndex],
      justifyContent: 'center', alignItems: 'center',
    }}>
      <Text style={{ color: '#fff', fontSize: size * 0.38, fontWeight: '800' }}>
        {user?.name?.[0]?.toUpperCase()}
      </Text>
    </View>
  );
}

function isToday(match) {
  const d = new Date(match.createdAt);
  const now = new Date();
  return d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
}

function getDaysAgo(dateStr) {
  const diff = Math.floor((new Date() - new Date(dateStr)) / 86400000);
  if (diff === 0) return 'Bugun';
  if (diff === 1) return 'Dun';
  return `${diff} gun once`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { justifyContent: 'center', alignItems: 'center', padding: 32 },
  scrollContent: { paddingBottom: 44 },
  redBloom: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    left: -110,
    top: -70,
    backgroundColor: 'rgba(200,16,46,0.24)',
    opacity: 0.9,
  },
  blueBloom: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    right: -90,
    top: 190,
    backgroundColor: 'rgba(66,120,255,0.08)',
  },

  header: {
    paddingHorizontal: 24,
    paddingTop: 58,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 46,
    fontWeight: '900',
    letterSpacing: -1.8,
  },
  subtitle: { color: Colors.textSecondary, fontSize: 15, marginTop: 4 },
  radarButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: 'rgba(255,65,89,0.78)',
    backgroundColor: 'rgba(200,16,46,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.red,
  },
  radarIcon: { color: '#fff', fontSize: 34, fontWeight: '300', marginTop: -3 },

  heroCard: {
    marginHorizontal: 22,
    minHeight: 174,
    borderRadius: 30,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,65,89,0.35)',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.red,
  },
  heroOrb: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -48,
    top: -56,
    backgroundColor: 'rgba(255,65,89,0.16)',
  },
  heroAvatarWrap: { width: 96, height: 96, justifyContent: 'center', alignItems: 'center' },
  heroAvatarRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.3,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  heroCopy: { flex: 1, paddingLeft: 12 },
  heroKicker: { color: Colors.red, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 7 },
  heroName: { color: Colors.textPrimary, fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  heroMeta: { color: Colors.textSecondary, fontSize: 12, marginTop: 5 },
  heroCta: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  heroCtaText: { color: Colors.textPrimary, fontSize: 12, fontWeight: '800' },
  heroCtaArrow: { color: Colors.red, fontSize: 18, marginTop: -1 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 28,
    marginBottom: 13,
    gap: 9,
  },
  sectionMark: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.red,
    shadowColor: Colors.red,
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
  sectionTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  sectionLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
  sectionAccent: { color: '#a984ff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  todayList: { paddingHorizontal: 22, gap: 14 },
  todayCard: {
    width: 104,
    minHeight: 142,
    borderRadius: 26,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  todayAvatarShell: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  todayName: { color: Colors.textPrimary, fontSize: 13, fontWeight: '800', maxWidth: 86 },
  todayHint: { color: Colors.red, fontSize: 10, fontWeight: '800', marginTop: 4 },

  matchList: { paddingHorizontal: 16, gap: 10 },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    minHeight: 86,
    borderRadius: 24,
    padding: 13,
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  rowAvatarShell: {
    padding: 2,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  rowAvatarShellNew: {
    backgroundColor: 'rgba(255,65,89,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,65,89,0.55)',
  },
  matchInfo: { flex: 1 },
  matchTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
    gap: 8,
  },
  matchName: { flex: 1, color: Colors.textPrimary, fontSize: 16, fontWeight: '900' },
  matchDate: { color: Colors.textMuted, fontSize: 11, fontWeight: '700' },
  newBadge: {
    backgroundColor: Colors.redDim,
    borderRadius: Radii.pill,
    borderWidth: 0.5,
    borderColor: Colors.redBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  newBadgeText: { color: Colors.red, fontSize: 10, fontWeight: '900' },
  matchBio: { color: Colors.textSecondary, fontSize: 12 },
  matchBioFallback: { color: Colors.textMuted, fontSize: 12 },
  chevronBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chevron: { color: Colors.textPrimary, fontSize: 22, marginTop: -2 },

  emptyGlow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(200,16,46,0.2)',
  },
  emptyKicker: { color: Colors.red, fontSize: 11, fontWeight: '900', letterSpacing: 1.4, marginBottom: 10 },
  emptyTitle: { color: Colors.textPrimary, fontSize: 27, fontWeight: '900', letterSpacing: -0.8, marginBottom: 9 },
  emptySub: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 22 },
  emptyButton: {
    height: 46,
    paddingHorizontal: 22,
    borderRadius: Radii.pill,
    backgroundColor: Colors.red,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.red,
  },
  emptyButtonText: { color: '#fff', fontSize: 13, fontWeight: '900' },
});
