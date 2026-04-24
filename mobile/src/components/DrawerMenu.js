import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Dimensions, TouchableWithoutFeedback, Image, Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../theme';

const { width: screenWidth } = Dimensions.get('window');
const drawerWidth = screenWidth * 0.72;

const MENU_ITEMS = [
  { screen: 'MyProfile', icon: '👤', label: 'Profilim' },
  { screen: 'EditProfile', icon: '✏️', label: 'Profili Duzenle' },
  { screen: 'Stats', icon: '📈', label: 'İstatistiklerim' },
  { screen: 'Watchlist', icon: '📋', label: 'Sonra Izle' },
  { screen: 'Matches', icon: '❤️', label: 'Eslestirmeler' },
];

export default function DrawerMenu({ visible, onClose }) {
  const { user, logout } = useAuth();
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
      Alert.alert('Cikis', 'Cikis yapmak istedigine emin misin?', [
        { text: 'Iptal', style: 'cancel' },
        { text: 'Cikis Yap', style: 'destructive', onPress: logout },
      ]);
    }, 300);
  };

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.drawerAccent} />
        <Text style={styles.drawerLogo}>CineMatch</Text>

        <TouchableOpacity
          style={styles.profileSection}
          onPress={() => navigate('MyProfile')}
          activeOpacity={0.8}
        >
          <DrawerAvatar user={user} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name}</Text>
            {user?.username ? <Text style={styles.profileUsername}>@{user.username}</Text> : null}
          </View>
          <Text style={styles.profileChevron}>›</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <View style={styles.menuList}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.screen}
              style={styles.menuItem}
              onPress={() => navigate(item.screen)}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconWrap}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.logoutItem} onPress={handleLogout} activeOpacity={0.7}>
          <View style={[styles.menuIconWrap, styles.menuIconLogout]}>
            <Text style={styles.menuIcon}>🚪</Text>
          </View>
          <Text style={styles.logoutLabel}>Cikis Yap</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>CineMatch v1.0</Text>
      </Animated.View>
    </View>
  );
}

function DrawerAvatar({ user }) {
  if (user?.avatar) {
    return <Image source={{ uri: user.avatar }} style={styles.avatarImg} />;
  }

  return (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarInitial}>{user?.name?.[0]?.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: drawerWidth,
    backgroundColor: '#0d0d18',
    borderRightWidth: 0.5,
    borderRightColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 24,
  },
  drawerAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.red,
  },
  drawerLogo: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 4,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 4,
    color: Colors.red,
    textTransform: 'uppercase',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 12,
  },
  avatarImg: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { color: '#fff', fontSize: 22, fontWeight: '800' },
  profileInfo: { flex: 1 },
  profileName: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  profileUsername: { color: Colors.red, fontSize: 12, marginTop: 2, fontWeight: '500' },
  profileChevron: { fontSize: 20, color: Colors.textMuted },
  divider: {
    height: 0.5,
    backgroundColor: Colors.border,
    marginHorizontal: 20,
    marginVertical: 4,
  },
  menuList: { paddingVertical: 4 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    gap: 14,
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.bgCard,
    borderWidth: 0.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIconLogout: { borderColor: 'transparent', backgroundColor: 'transparent' },
  menuIcon: { fontSize: 16 },
  menuLabel: { flex: 1, color: '#d0d0e0', fontSize: 15, fontWeight: '500' },
  menuChevron: { fontSize: 16, color: Colors.textHint },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    gap: 14,
  },
  logoutLabel: { color: Colors.textMuted, fontSize: 15, fontWeight: '500' },
  versionText: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 11,
    color: Colors.textHint,
  },
});
