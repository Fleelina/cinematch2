import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import api from '../services/api';

// --- TEMA OBJESİ (Tasarım dilimiz) ---
const T = {
  bg: '#050506',
  bgSoft: '#0B0B10',
  glass: 'rgba(255,255,255,0.06)',
  glassStrong: 'rgba(255,255,255,0.10)',
  border: 'rgba(255,255,255,0.10)',
  borderSoft: 'rgba(255,255,255,0.06)',
  red: '#ff3b55',
  redSoft: 'rgba(255,59,85,0.15)',
  redBorder: 'rgba(255,59,85,0.35)',
  purple: '#9b5cff',
  purpleSoft: 'rgba(155,92,255,0.15)',
  purpleBorder: 'rgba(155,92,255,0.30)',
  gold: '#f8c84a',
  text: '#ffffff',
  textSoft: '#b9b8c7',
  textMuted: '#737286',
};

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
        <ActivityIndicator color={T.purple} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Arka plan glow efektleri */}
      <View style={styles.glowRed} />
      <View style={styles.glowPurple} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color={T.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>İstatistiklerim</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* GENEL */}
        <SectionTitle icon="activity" title="Genel Durum" />
        <View style={styles.grid}>
          <BigStatCard value={stats?.movieCount ?? 0} label="Film İzlendi" icon="film" iconColor={T.purple} />
          <BigStatCard value={stats?.matchCount ?? 0} label="Eşleşme" icon="heart" iconColor={T.red} />
        </View>
        <View style={styles.grid}>
          <BigStatCard
            value={stats?.totalMinutes ? `${stats.totalMinutes.toLocaleString()} dk` : '—'}
            label="Toplam Süre"
            icon="clock"
            iconColor={T.textSoft}
          />
          <BigStatCard
            value={stats?.totalDays ? `${stats.totalDays} gün` : '—'}
            label="Harcanan Zaman"
            icon="calendar"
            iconColor={T.gold}
          />
        </View>

        {/* FAVORİ TÜRLER */}
        {stats?.topGenres?.length > 0 && (
          <>
            <SectionTitle icon="pie-chart" title="Favori Türler" />
            <View style={styles.card}>
              {stats.topGenres.map((item, i) => (
                <View key={i} style={[styles.barRow, i === stats.topGenres.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={styles.barLabel}>{item.genre}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${(item.count / stats.topGenres[0].count) * 100}%` },
                        i === 0 ? { backgroundColor: T.purple } : { backgroundColor: T.glassStrong },
                      ]}
                    />
                  </View>
                  <Text style={styles.barCount}>{item.count}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* YÖNETMEN & OYUNCU */}
        <SectionTitle icon="users" title="En Çok İzlediklerin" />
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

        {/* İZLEME ALIŞKANLIKLARI */}
        <SectionTitle icon="sliders" title="İzleme Analizi" />
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
              value={stats.watchStyle.label}
              sub={stats.watchStyle.emoji}
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

// --- BİLEŞENLER ---

function SectionTitle({ icon, title }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Feather name={icon} size={16} color={T.textSoft} style={{ marginRight: 8 }} />
      <Text style={styles.sectionTitleText}>{title}</Text>
    </View>
  );
}

function BigStatCard({ value, label, icon, iconColor }) {
  return (
    <View style={styles.bigStatCard}>
      <View style={styles.bigStatHeader}>
        <Feather name={icon} size={18} color={iconColor || T.textMuted} />
      </View>
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

// --- STİLLER ---

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  center: { flex: 1, backgroundColor: T.bg, justifyContent: 'center', alignItems: 'center' },

  /* Glow Arka Planlar */
  glowPurple: { position: 'absolute', top: -100, left: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(155,92,255,0.14)' },
  glowRed: { position: 'absolute', top: 350, right: -100, width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(255,59,85,0.08)' },

  /* Header */
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { color: T.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },

  content: { paddingHorizontal: 20, paddingBottom: 48, gap: 14 },
  grid: { flexDirection: 'row', gap: 12, marginBottom: -2 },

  /* Büyük İstatistik Kartları */
  bigStatCard: {
    flex: 1, backgroundColor: T.glass, borderRadius: 16,
    borderWidth: 1, borderColor: T.borderSoft,
    padding: 16, gap: 4,
  },
  bigStatHeader: { marginBottom: 4 },
  bigStatValue: { color: T.text, fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  bigStatLabel: { color: T.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 },

  /* Bölüm Başlıkları */
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18, marginBottom: 4, paddingLeft: 4 },
  sectionTitleText: { color: T.textSoft, fontSize: 14, fontWeight: '700', letterSpacing: 0.2 },

  /* Genel Kart Yapısı (Liste Taşıyıcıları) */
  card: {
    backgroundColor: T.glass, borderRadius: 16,
    borderWidth: 1, borderColor: T.borderSoft,
    overflow: 'hidden',
  },

  /* İlerleme Çubukları (Türler) */
  barRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    borderBottomWidth: 1, borderBottomColor: T.borderSoft,
  },
  barLabel: { color: T.text, fontSize: 14, fontWeight: '600', width: 85 },
  barTrack: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  barCount: { color: T.textMuted, fontSize: 13, fontWeight: '700', width: 28, textAlign: 'right' },

  /* Düz Satır Öğeleri */
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: T.borderSoft,
  },
  infoLabel: { color: T.textSoft, fontSize: 14 },
  infoRight: { alignItems: 'flex-end' },
  infoValue: { color: T.text, fontSize: 14, fontWeight: '600' },
  infoSub: { color: T.textMuted, fontSize: 12, marginTop: 3, fontWeight: '500' },

  emptyText: { color: T.textMuted, fontSize: 13, textAlign: 'center', padding: 24, fontStyle: 'italic' },
});