import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';
import { Colors, Radii } from '../theme';

export default function StatsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/profile/stats')
      .then((res) => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={Colors.red} size="large" />
      </View>
    );
  }

  const totalHours = stats?.totalMinutes ? (stats.totalMinutes / 60).toFixed(0) : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>İstatistiklerim</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Genel */}
        <SectionTitle emoji="🎬" title="Genel" />
        <View style={styles.grid}>
          <BigStatCard value={stats?.movieCount ?? 0} label="Film İzlendi" emoji="🎬" />
          <BigStatCard value={stats?.matchCount ?? 0} label="Eşleşme" emoji="❤️" />
        </View>
        <View style={styles.grid}>
          <BigStatCard
            value={stats?.totalMinutes ? `${stats.totalMinutes.toLocaleString()} dk` : '—'}
            label="Toplam Süre"
            emoji="⏱️"
          />
          <BigStatCard
            value={stats?.totalDays ? `${stats.totalDays} gün` : '—'}
            label="Hayattan Harcanan"
            emoji="📅"
          />
        </View>

        {/* Favori tür */}
        {stats?.topGenres?.length > 0 && (
          <>
            <SectionTitle emoji="🎭" title="Favori Türler" />
            <View style={styles.card}>
              {stats.topGenres.map((item, i) => (
                <View key={i} style={[styles.barRow, i === stats.topGenres.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={styles.barLabel}>{item.genre}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${(item.count / stats.topGenres[0].count) * 100}%` },
                        i === 0 && { backgroundColor: Colors.red },
                      ]}
                    />
                  </View>
                  <Text style={styles.barCount}>{item.count}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Yönetmen & Oyuncu */}
        <SectionTitle emoji="🎥" title="En Çok İzlediklerin" />
        <View style={styles.card}>
          {stats?.topDirector ? (
            <InfoRow
              label="Yönetmen"
              value={stats.topDirector.name}
              sub={`${stats.topDirector.count} film`}
            />
          ) : null}
          {stats?.topActor ? (
            <InfoRow
              label="Oyuncu"
              value={stats.topActor.name}
              sub={`${stats.topActor.count} filmde`}
              last
            />
          ) : null}
          {!stats?.topDirector && !stats?.topActor && (
            <Text style={styles.emptyText}>Yeterli veri yok.</Text>
          )}
        </View>

        {/* İzleme alışkanlıkları */}
        <SectionTitle emoji="📊" title="İzleme Alışkanlıkları" />
        <View style={styles.card}>
          {stats?.avgRating ? (
            <InfoRow label="Ortalama Puan" value={`⭐ ${stats.avgRating}`} />
          ) : null}
          {stats?.favoriteEra ? (
            <InfoRow label="Favori Dönem" value={stats.favoriteEra} />
          ) : null}
          {stats?.watchStyle ? (
            <InfoRow
              label="İzleme Tarzı"
              value={`${stats.watchStyle.label} ${stats.watchStyle.emoji}`}
              last
            />
          ) : null}
          {!stats?.avgRating && !stats?.favoriteEra && !stats?.watchStyle && (
            <Text style={styles.emptyText}>Film ekledikçe burası dolacak.</Text>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

function SectionTitle({ emoji, title }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionEmoji}>{emoji}</Text>
      <Text style={styles.sectionTitleText}>{title}</Text>
    </View>
  );
}

function BigStatCard({ value, label, emoji }) {
  return (
    <View style={styles.bigStatCard}>
      <Text style={styles.bigStatEmoji}>{emoji}</Text>
      <Text style={styles.bigStatValue}>{value}</Text>
      <Text style={styles.bigStatLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({ label, value, sub, last }) {
  return (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoRight}>
        <Text style={styles.infoValue}>{value}</Text>
        {sub ? <Text style={styles.infoSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  backBtn: { padding: 6 },
  backBtnText: { color: '#fff', fontSize: 24, fontWeight: '600' },
  headerTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '800' },

  content: { padding: 16, paddingBottom: 48, gap: 12 },

  grid: { flexDirection: 'row', gap: 12 },

  bigStatCard: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  bigStatEmoji: { fontSize: 24 },
  bigStatValue: { color: Colors.textPrimary, fontSize: 20, fontWeight: '800' },
  bigStatLabel: { color: Colors.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },

  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  sectionEmoji: { fontSize: 16 },
  sectionTitleText: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },

  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
    overflow: 'hidden',
  },

  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  barLabel: { color: Colors.textSecondary, fontSize: 13, width: 80 },
  barTrack: { flex: 1, height: 6, backgroundColor: Colors.bgElevated, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#444', borderRadius: 3 },
  barCount: { color: Colors.textMuted, fontSize: 12, fontWeight: '600', width: 24, textAlign: 'right' },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  infoLabel: { color: Colors.textSecondary, fontSize: 13 },
  infoRight: { alignItems: 'flex-end' },
  infoValue: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },
  infoSub: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },

  emptyText: { color: Colors.textHint, fontSize: 12, textAlign: 'center', padding: 20, fontStyle: 'italic' },
});
