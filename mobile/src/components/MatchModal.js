import React, { useEffect, useRef } from 'react';
import {
  View, Text, Image, StyleSheet, Animated, Pressable,
  Dimensions, Modal,
} from 'react-native';
import { Colors, Radii } from '../theme';

const { width: SW, height: SH } = Dimensions.get('window');

// Tek konfeti parçası
function ConfettiPiece({ delay, color, startX, size }) {
  const y = useRef(new Animated.Value(-20)).current;
  const x = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(y, {
          toValue: SH + 40,
          duration: 2200 + Math.random() * 800,
          useNativeDriver: true,
        }),
        Animated.timing(x, {
          toValue: (Math.random() - 0.5) * 120,
          duration: 2200 + Math.random() * 800,
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: Math.random() > 0.5 ? 6 : -6,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(1600),
          Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, []);

  const rotation = rotate.interpolate({
    inputRange: [-6, 6],
    outputRange: ['-720deg', '720deg'],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: startX,
        top: 0,
        width: size,
        height: size * 0.4,
        borderRadius: 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY: y }, { translateX: x }, { rotate: rotation }],
      }}
    />
  );
}

function Confetti() {
  const colors = [
    Colors.red, '#f0b429', '#00c864', '#6c5ce7',
    '#fd79a8', '#00cec9', '#e17055', '#a29bfe',
  ];
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    delay: Math.random() * 600,
    color: colors[Math.floor(Math.random() * colors.length)],
    startX: Math.random() * SW,
    size: 6 + Math.random() * 8,
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p) => <ConfettiPiece key={p.id} {...p} />)}
    </View>
  );
}

function Avatar({ user, size = 90 }) {
  const colors = ['#c8102e', '#1d6a8a', '#2a6a3a', '#6a2a7a', '#6a4a1a'];
  const colorIndex = user?.name?.charCodeAt(0) % colors.length ?? 0;

  if (user?.avatar) {
    return (
      <Image
        source={{ uri: user.avatar }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: colors[colorIndex],
      justifyContent: 'center', alignItems: 'center',
    }}>
      <Text style={{ color: '#fff', fontSize: size * 0.4, fontWeight: '800' }}>
        {user?.name?.[0]?.toUpperCase()}
      </Text>
    </View>
  );
}

export default function MatchModal({ visible, matchedUser, currentUser, onMessage, onContinue }) {
  // Animasyon değerleri
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0.4)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const leftAvatarX = useRef(new Animated.Value(-SW * 0.5)).current;
  const rightAvatarX = useRef(new Animated.Value(SW * 0.5)).current;
  const avatarScale = useRef(new Animated.Value(0.7)).current;
  const heartScale = useRef(new Animated.Value(0)).current;
  const subOpacity = useRef(new Animated.Value(0)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const btnTranslateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (!visible) return;

    // Sıfırla
    bgOpacity.setValue(0);
    titleScale.setValue(0.4);
    titleOpacity.setValue(0);
    leftAvatarX.setValue(-SW * 0.5);
    rightAvatarX.setValue(SW * 0.5);
    avatarScale.setValue(0.7);
    heartScale.setValue(0);
    subOpacity.setValue(0);
    btnOpacity.setValue(0);
    btnTranslateY.setValue(30);

    Animated.sequence([
      // 1. Arka plan fade in
      Animated.timing(bgOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),

      // 2. Avatarlar ortaya kayar + büyür
      Animated.parallel([
        Animated.spring(leftAvatarX, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.spring(rightAvatarX, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.spring(avatarScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      ]),

      // 3. Kalp patlar
      Animated.spring(heartScale, { toValue: 1, tension: 80, friction: 5, useNativeDriver: true }),

      // 4. Başlık + alt yazı
      Animated.parallel([
        Animated.spring(titleScale, { toValue: 1, tension: 70, friction: 7, useNativeDriver: true }),
        Animated.timing(titleOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(subOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),

      // 5. Butonlar
      Animated.parallel([
        Animated.timing(btnOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(btnTranslateY, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      ]),
    ]).start();
  }, [visible]);

  if (!matchedUser) return null;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: bgOpacity }]}>
        <Confetti />

        {/* Başlık */}
        <Animated.View style={[styles.titleWrap, {
          transform: [{ scale: titleScale }], opacity: titleOpacity,
        }]}>
          <Text style={styles.titleSub}>Film zevki eşleşti!</Text>
          <Text style={styles.titleMain}>Eşleştin! 🎬</Text>
        </Animated.View>

        {/* Avatarlar */}
        <View style={styles.avatarsRow}>
          <Animated.View style={[styles.avatarWrap, {
            transform: [{ translateX: leftAvatarX }, { scale: avatarScale }],
          }]}>
            <View style={styles.avatarRing}>
              <Avatar user={currentUser} size={88} />
            </View>
          </Animated.View>

          {/* Kalp */}
          <Animated.View style={[styles.heartWrap, { transform: [{ scale: heartScale }] }]}>
            <Text style={styles.heartEmoji}>❤️</Text>
          </Animated.View>

          <Animated.View style={[styles.avatarWrap, {
            transform: [{ translateX: rightAvatarX }, { scale: avatarScale }],
          }]}>
            <View style={[styles.avatarRing, styles.avatarRingRight]}>
              <Avatar user={matchedUser} size={88} />
            </View>
          </Animated.View>
        </View>

        {/* İsimler */}
        <Animated.Text style={[styles.namesText, { opacity: subOpacity }]}>
          {currentUser?.name?.split(' ')[0]} & {matchedUser?.name?.split(' ')[0]}
        </Animated.Text>

        <Animated.Text style={[styles.subText, { opacity: subOpacity }]}>
          Ortak film zevkiniz var. Hemen sohbet başlatın!
        </Animated.Text>

        {/* Butonlar */}
        <Animated.View style={[styles.btnWrap, {
          opacity: btnOpacity,
          transform: [{ translateY: btnTranslateY }],
        }]}>
          <Pressable style={styles.msgBtn} onPress={onMessage}>
            <Text style={styles.msgBtnText}>💬  Mesaj Gönder</Text>
          </Pressable>
          <Pressable style={styles.continueBtn} onPress={onContinue}>
            <Text style={styles.continueBtnText}>Devam Et</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(6,4,14,0.97)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  titleWrap: {
    alignItems: 'center',
    marginBottom: 40,
  },
  titleSub: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: Colors.red,
    marginBottom: 8,
  },
  titleMain: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
    color: '#fff',
  },

  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    gap: 0,
  },
  avatarWrap: {
    zIndex: 1,
  },
  avatarRing: {
    padding: 3,
    borderRadius: 999,
    borderWidth: 2.5,
    borderColor: Colors.red,
    shadowColor: Colors.red,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
  avatarRingRight: {
    borderColor: '#6c5ce7',
    shadowColor: '#6c5ce7',
  },
  heartWrap: {
    zIndex: 2,
    marginHorizontal: -10,
    backgroundColor: 'rgba(6,4,14,0.97)',
    borderRadius: 999,
    padding: 4,
  },
  heartEmoji: {
    fontSize: 36,
  },

  namesText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  subText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 48,
  },

  btnWrap: {
    width: '100%',
    gap: 12,
  },
  msgBtn: {
    backgroundColor: Colors.red,
    borderRadius: Radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.red,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  msgBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  continueBtn: {
    borderRadius: Radii.lg,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  continueBtnText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
});
