import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Dimensions, TouchableWithoutFeedback, Image, Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

const { width: SW } = Dimensions.get('window');
const DRAWER_W = SW * 0.72;

export default function DrawerMenu({ visible, onClose }) {
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const slideAnim = useRef(new Animated.Value(-DRAWER_W)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -DRAWER_W, duration: 220, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

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
      {/* Arka plan overlay */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      {/* Drawer */}
      <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
        {/* Profil özeti */}
        <View style={styles.profileSection}>
          {user?.avatar
            ? <Image source={{ uri: user.avatar }} style={styles.avatar} />
            : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase()}</Text>
              </View>
            )
          }
          <Text style={styles.profileName}>{user?.name}</Text>
          {user?.username && <Text style={styles.profileUsername}>@{user.username}</Text>}
        </View>

        <View style={styles.divider} />

        {/* Menü öğeleri */}
        <TouchableOpacity style={styles.menuItem} onPress={() => navigate('EditProfile')}>
          <Text style={styles.menuIcon}>✏️</Text>
          <Text style={styles.menuText}>Profili Düzenle</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigate('Watchlist')}>
          <Text style={styles.menuIcon}>📋</Text>
          <Text style={styles.menuText}>Daha Sonra İzle</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigate('Matches')}>
          <Text style={styles.menuIcon}>❤️</Text>
          <Text style={styles.menuText}>Eşleşmeler</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={[styles.menuItem, styles.menuItemLogout]} onPress={handleLogout}>
          <Text style={styles.menuIcon}>🚪</Text>
          <Text style={styles.menuTextLogout}>Çıkış Yap</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  drawer: {
    position: 'absolute', top: 0, left: 0, bottom: 0,
    width: DRAWER_W,
    backgroundColor: '#111',
    paddingTop: 60,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 20,
  },
  profileSection: {
    paddingHorizontal: 20, paddingBottom: 20, alignItems: 'flex-start', gap: 8,
  },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarPlaceholder: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#E50914', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  profileName: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 4 },
  profileUsername: { color: '#E50914', fontSize: 13 },

  divider: { height: 1, backgroundColor: '#222', marginVertical: 8 },

  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 15,
  },
  menuIcon: { fontSize: 20, width: 26, textAlign: 'center' },
  menuText: { color: '#ddd', fontSize: 16, fontWeight: '500' },
  menuItemLogout: { marginTop: 4 },
  menuTextLogout: { color: '#888', fontSize: 16, fontWeight: '500' },
});
