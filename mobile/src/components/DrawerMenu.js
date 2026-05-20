import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Dimensions, TouchableWithoutFeedback, Image, Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext'; // 1. Yeni Tema Context'i import edildi
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons'; // 2. Modern ikon kütüphanesi

const { width: screenWidth } = Dimensions.get('window');
const drawerWidth = screenWidth * 0.72;

// Emojilerden arındırılmış modern menü yapısı
const MENU_ITEMS = [
  { screen: 'MyProfile', icon: 'user', label: 'Profilim' },
  { screen: 'EditProfile', icon: 'edit-2', label: 'Profili Düzenle' },
  { screen: 'Stats', icon: 'bar-chart-2', label: 'İstatistiklerim' },
  { screen: 'Watchlist', icon: 'bookmark', label: 'Sonra İzle' },
  { screen: 'Matches', icon: 'heart', label: 'Eşleştirmeler' },
];

export default function DrawerMenu({ visible, onClose }) {
  const { user, logout } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme(); // 3. Aktif tema ve değiştirme fonksiyonu çekildi
  const navigation = useNavigation();
  const slideAnim = useRef(new Animated.Value(-drawerWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -drawerWidth, duration: 220, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [fadeAnim, slideAnim, visible]);

  const navigate = (screen) => {
    onClose();
    setTimeout(() => navigation.navigate(screen), 220);
  };

  const handleLogout = () => {
    onClose();
    setTimeout(() => {
      Alert.alert('Çıkış', 'Çıkış yapmak istediğine emin misin?', [
        { text: 'İptal', style: 'cancel' },
        { text: 'Çıkış Yap', style: 'destructive', onPress: logout },
      ]);
    }, 300);
  };

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      {/* 4. Çekmece arka planı dinamik olarak theme.bgSoft yapıldı */}
      <Animated.View style={[
        styles.drawer, 
        { backgroundColor: theme.bgSoft, borderRightColor: theme.border, transform: [{ translateX: slideAnim }] }
      ]}>
        
        {/* Üst Çizgi Aksanı Modun Rengine Göre Değişir */}
        <View style={[styles.drawerAccent, { backgroundColor: theme.purple }]} />
        <Text style={[styles.drawerLogo, { color: theme.purple }]}>CineMatch</Text>

        {/* Profil Alanı */}
        <TouchableOpacity
          style={styles.profileSection}
          onPress={() => navigate('MyProfile')}
          activeOpacity={0.8}
        >
          <DrawerAvatar user={user} theme={theme} />
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: theme.textPrimary }]}>{user?.name}</Text>
            {user?.username ? (
              <Text style={[styles.profileUsername, { color: theme.purple }]}>@{user.username}</Text>
            ) : null}
          </View>
          <Feather name="chevron-right" size={20} color={theme.textMuted} />
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: theme.borderSoft }]} />

        {/* Menü Listesi */}
        <View style={styles.menuList}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.screen}
              style={styles.menuItem}
              onPress={() => navigate(item.screen)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: theme.glass, borderColor: theme.border }]}>
                <Feather name={item.icon} size={16} color={theme.textSoft} />
              </View>
              <Text style={[styles.menuLabel, { color: theme.textSoft }]}>{item.label}</Text>
              <Feather name="chevron-right" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.divider, { backgroundColor: theme.borderSoft }]} />

        {/* TEMA DEĞİŞTİRME BUTONU (YENİ KISIM) */}
        <TouchableOpacity style={styles.menuItem} onPress={toggleTheme} activeOpacity={0.7}>
          <View style={[styles.menuIconWrap, { backgroundColor: theme.glass, borderColor: theme.border }]}>
            <Feather name={isDark ? "sun" : "moon"} size={16} color={isDark ? theme.gold : theme.purple} />
          </View>
          <Text style={[styles.menuLabel, { color: theme.textSoft }]}>
            {isDark ? 'Aydınlık Mod' : 'Karanlık Mod'}
          </Text>
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: theme.borderSoft }]} />

        {/* Çıkış Yap */}
        <TouchableOpacity style={styles.logoutItem} onPress={handleLogout} activeOpacity={0.7}>
          <View style={styles.menuIconWrapEmpty}>
            <Feather name="log-out" size={16} color={theme.textMuted} />
          </View>
          <Text style={[styles.logoutLabel, { color: theme.textMuted }]}>Çıkış Yap</Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: theme.textMuted }]}>CineMatch v1.0</Text>
      </Animated.View>
    </View>
  );
}

function DrawerAvatar({ user, theme }) {
  if (user?.avatar) {
    return <Image source={{ uri: user.avatar }} style={styles.avatarImg} />;
  }

  return (
    <View style={[styles.avatarFallback, { backgroundColor: theme.purple }]}>
      <Text style={styles.avatarInitial}>{user?.name?.[0]?.toUpperCase() || '?'}</Text>
    </View>
  );
}

// --- STYLES ---

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: drawerWidth,
    borderRightWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 16,
  },
  drawerAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  drawerLogo: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 4,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 12,
  },
  avatarImg: { width: 50, height: 50, borderRadius: 25 },
  avatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { color: '#fff', fontSize: 20, fontWeight: '800' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '700' },
  profileUsername: { fontSize: 13, marginTop: 2, fontWeight: '600' },
  
  divider: {
    height: 1,
    marginHorizontal: 20,
    marginVertical: 6,
  },
  menuList: { paddingVertical: 4 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 14,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIconWrapEmpty: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 14,
  },
  logoutLabel: { fontSize: 15, fontWeight: '600' },
  versionText: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '500',
  },
});