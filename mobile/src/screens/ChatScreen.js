import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  Image, StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, ScrollView, Modal, Animated, ImageBackground, Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';
import { getSocket, connectSocket, emitTyping, emitStopTyping } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const DEFAULT_BACKGROUND = require('../../assets/default-bg.png');
const ANDROID_KEYBOARD_EXTRA_OFFSET = 14;

const DEFAULT_T = {
  bg: '#0f0f0f',
  bgSoft: '#1a1a1a',
  surface: '#161616',
  surfaceSoft: '#202124',
  glass: 'rgba(255,255,255,0.06)',
  border: '#262626',
  borderSoft: '#1a1a1a',
  red: '#E50914',
  redSoft: '#261215',
  redBorder: 'rgba(229,9,20,0.25)',
  text: '#ffffff',
  textSoft: '#d1d1d1',
  textMuted: '#888888',
  bubbleMe: '#C84A52',
  bubbleThem: '#202124',
  inputBg: '#1a1a1a',
  shadow: '#000',
  shadowOpacity: 0.12,
};

let styles = createStyles(DEFAULT_T);

function Avatar({ user, size = 36, T = DEFAULT_T }) {
  if (user?.avatar) {
    return <Image source={{ uri: user.avatar }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: T.bgSoft }} />;
  }

  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: T.red, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.4 }}>{user?.name?.[0]?.toUpperCase()}</Text>
    </View>
  );
}

function MoviePoster({ movie, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.movieChip, selected && styles.movieChipSelected]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {movie.poster ? (
        <Image source={{ uri: movie.poster }} style={styles.moviePoster} />
      ) : (
        <View style={[styles.moviePoster, styles.moviePosterFallback]}>
          <Text style={styles.moviePosterFallbackText}>{movie.title?.[0]?.toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.movieMeta}>
        <View style={styles.movieMetaTop}>
          <Text numberOfLines={2} style={[styles.movieTitle, selected && styles.movieTitleSelected]}>
            {movie.title}
          </Text>
          <View style={[styles.movieMiniAction, selected && styles.movieMiniActionSelected]}>
            <Text style={[styles.movieMiniActionText, selected && styles.movieMiniActionTextSelected]}>
              {selected ? '✓' : '+'}
            </Text>
          </View>
        </View>
        <Text style={[styles.movieSubline, selected && styles.movieSublineSelected]}>
          {movie.year || 'Film'} · Ortak izleme
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ChatScreen({ route, navigation }) {
  const { matchId, otherUser } = route.params;
  const { user } = useAuth();
  const { theme: themeColors, movieTheme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const T = React.useMemo(() => ({
    bg: themeColors.bg,
    bgSoft: themeColors.bgSoft,
    surface: isDark ? (themeColors.bgSoft || '#161616') : 'rgba(255,255,255,0.36)',
    surfaceSoft: isDark ? '#202124' : 'rgba(255,255,255,0.58)',
    glass: themeColors.glass,
    border: themeColors.border,
    borderSoft: themeColors.borderSoft,
    red: themeColors.red || '#E50914',
    redSoft: themeColors.redSoft || 'rgba(255,59,85,0.12)',
    redBorder: themeColors.redBorder || 'rgba(255,59,85,0.26)',
    text: themeColors.textPrimary,
    textSoft: themeColors.textSecondary,
    textMuted: themeColors.textMuted,
    bubbleMe: themeColors.red || '#ff3b55',
    bubbleThem: isDark ? (themeColors.bgSoft || '#202124') : 'rgba(255,255,255,0.72)',
    inputBg: isDark ? (themeColors.bgSoft || '#1a1a1a') : 'rgba(255,255,255,0.72)',
    headerBg: isDark ? 'rgba(8,8,12,0.92)' : 'rgba(244,247,252,0.92)',
    headerButtonBg: isDark ? 'rgba(255,255,255,0.085)' : 'rgba(33,45,62,0.075)',
    headerBorder: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(33,45,62,0.12)',
    shadow: isDark ? '#000' : 'rgba(33,45,62,0.28)',
    shadowOpacity: isDark ? 0.12 : 0.1,
  }), [themeColors, isDark]);
  styles = React.useMemo(() => createStyles(T), [T]);
  const backgroundImage = isDark ? (movieTheme?.backgroundImage || DEFAULT_BACKGROUND) : null;
  const gradientColors = movieTheme?.backgroundImage
    ? ['rgba(5,5,6,0.18)', 'rgba(5,5,6,0.58)', 'rgba(5,5,6,0.9)']
    : (movieTheme?.gradient
        ? [movieTheme.gradient[0] + 'ee', movieTheme.gradient[1] + 'cc', movieTheme.gradient[2] || T.bg]
        : isDark
          ? ['rgba(5,5,6,0.10)', 'rgba(5,5,6,0.55)', 'rgba(5,5,6,0.88)']
          : ['#d7dce5', '#c8d0dc', '#b8c2d0']);

  const [messages, setMessages] = useState([]);
  const [commonMovies, setCommonMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [commonMoviesExpanded, setCommonMoviesExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [selectedMsgMenu, setSelectedMsgMenu] = useState(null); // { id, mine }
  const [chatOptionsVisible, setChatOptionsVisible] = useState(false);
  const [likedMessages, setLikedMessages] = useState({});
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [heartAnim] = useState(new Animated.Value(0));
  const [heartPos] = useState({ x: 0, y: 0 });
  const [showHeart] = useState(false);
  const doubleTapRef = useRef({});

  const flatListRef = useRef(null);
  const typingTimer = useRef(null);
  const isTyping = useRef(false);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get(`/messages/${matchId}`);
      setMessages(res.data.messages || []);
      setCommonMovies(res.data.commonMovies || []);
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Sohbet yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchMessages();

    const setupSocket = async () => {
      let socket = getSocket();
      if (!socket?.connected) socket = await connectSocket();
      if (!socket) return;

      socket.emit('join_room', { matchId });

      socket.on('new_message', (message) => {
        setMessages((prev) => {
          if (message.senderId === user.id) {
            const tempIndex = prev.findIndex(
              (item) =>
                item.temp &&
                item.text === message.text &&
                (item.movie?.id || null) === (message.movie?.id || null)
            );

            if (tempIndex !== -1) {
              const updated = [...prev];
              updated[tempIndex] = { ...message, temp: false };
              return updated;
            }
          }

          if (prev.find((item) => item.id === message.id)) return prev;
          return [...prev, message];
        });
      });

      socket.on('user_typing', ({ userId }) => {
        if (userId !== user.id) setOtherTyping(true);
      });

      socket.on('user_stop_typing', ({ userId }) => {
        if (userId !== user.id) setOtherTyping(false);
      });

      socket.on('message_error', () => {
        setSending(false);
        Alert.alert('Hata', 'Mesaj gonderilemedi');
      });
    };

    setupSocket();

    return () => {
      const socket = getSocket();
      if (socket) {
        socket.off('new_message');
        socket.off('user_typing');
        socket.off('user_stop_typing');
        socket.off('message_error');
      }
      if (typingTimer.current) clearTimeout(typingTimer.current);
      emitStopTyping(matchId);
    };
  }, [fetchMessages, matchId, user.id]);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;

    const showSub = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardOffset(Math.max(event.endCoordinates.height + ANDROID_KEYBOARD_EXTRA_OFFSET, 0));
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardOffset(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleTextChange = (val) => {
    setText(val);
    if (!isTyping.current) {
      isTyping.current = true;
      emitTyping(matchId);
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTyping.current = false;
      emitStopTyping(matchId);
    }, 1500);
  };

  const toggleMovieSelection = (movie) => {
    setSelectedMovie((current) => (current?.id === movie.id ? null : movie));
  };

  const toggleCommonMoviesExpanded = () => {
    setCommonMoviesExpanded((current) => !current);
  };

  const handleOpenMovieDetail = (movie) => {
    navigation.navigate('MovieDetail', { tmdbId: movie.tmdbId, title: movie.title });
  };

  const handleDeleteMessage = async (messageId, scope) => {
    setSelectedMsgMenu(null);
    try {
      await api.delete(`/messages/${matchId}/${messageId}`, { data: { scope } });
      if (scope === 'all') {
        setMessages((prev) =>
          prev.map((m) => m.id === messageId ? { ...m, deletedForAll: true, text: 'Bu mesaj silindi.', movie: null } : m)
        );
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
    } catch (err) {
      Alert.alert('Hata', 'Mesaj silinemedi');
    }
  };

  const handleEndMatch = async () => {
    setChatOptionsVisible(false);
    try {
      await api.post(`/matches/end/${matchId}`);
      Alert.alert('Tamam', 'Eslesme sonlandirildi ve sohbet silindi.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Hata', 'Eslesme sonlandirilamadi');
    }
  };

  const handleBlockAndDelete = async () => {
    setChatOptionsVisible(false);
    try {
      await api.post(`/matches/block/${matchId}`);
      Alert.alert('Tamam', 'Kullanici engellendi ve sohbet silindi.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Hata', 'Kullanici engellenemedi');
    }
  };

  const handleDoubleTap = (messageId) => {
    const now = Date.now();
    const last = doubleTapRef.current[messageId] || 0;
    if (now - last < 300) {
      setLikedMessages((prev) => ({
        ...prev,
        [messageId]: !prev[messageId],
      }));
    }
    doubleTapRef.current[messageId] = now;
  };

  const handleSend = async () => {
    if (!text.trim() || sending) return;

    const msgText = text.trim();
    const movie = selectedMovie;

    setSending(true);
    setText('');
    setSelectedMovie(null);

    isTyping.current = false;
    emitStopTyping(matchId);
    if (typingTimer.current) clearTimeout(typingTimer.current);

    const tempMsg = {
      id: `temp_${Date.now()}`,
      text: msgText,
      senderId: user.id,
      type: 'USER',
      movie: movie || null,
      createdAt: new Date().toISOString(),
      temp: true,
    };
    setMessages((prev) => [...prev, tempMsg]);

    const payload = {
      matchId,
      text: msgText,
      movieId: movie?.id,
    };

    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('send_message', payload);
      setSending(false);
      return;
    }

    try {
      const res = await api.post(`/messages/${matchId}`, { text: msgText, movieId: movie?.id });
      setMessages((prev) => prev.map((item) => (item.id === tempMsg.id ? { ...res.data, temp: false } : item)));
      setSending(false);
    } catch (err) {
      setSending(false);
      Alert.alert('Hata', 'Mesaj gonderilemedi');
      setMessages((prev) => prev.filter((item) => item.id !== tempMsg.id));
      setText(msgText);
      setSelectedMovie(movie || null);
    }
  };

  const formatTime = (dateStr) =>
    new Date(dateStr).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Bugun';
    if (date.toDateString() === yesterday.toDateString()) return 'Dun';
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  };

  const messagesWithDates = () => {
    const result = [];
    let lastDate = null;

    for (const msg of messages) {
      const date = new Date(msg.createdAt).toDateString();
      if (date !== lastDate) {
        result.push({ itemType: 'date', id: `date_${date}`, label: formatDate(msg.createdAt) });
        lastDate = date;
      }
      result.push({ itemType: 'msg', ...msg });
    }

    if (otherTyping) {
      result.push({ itemType: 'typing', id: 'typing_indicator' });
    }

    return result;
  };

  if (loading) {
    return (
      <ThemeShell backgroundImage={backgroundImage} gradientColors={gradientColors}>
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <ActivityIndicator color={T.red} size="large" />
        </View>
      </ThemeShell>
    );
  }

  return (
    <ThemeShell backgroundImage={backgroundImage} gradientColors={gradientColors}>
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : undefined}
      >
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={T.text} style={styles.backBtnIcon} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerUser}
            onPress={() => navigation.navigate('UserProfile', { userId: otherUser.id, matchId })}
          >
            <Avatar user={otherUser} size={36} T={T} />
            <View>
              <Text style={styles.headerName}>{otherUser.name}</Text>
              {otherTyping ? <Text style={styles.typingHeader}>yaziyor...</Text> : null}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerMenuBtn}
            onPress={() => setChatOptionsVisible(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={T.text} />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          style={styles.flatList}
          data={messagesWithDates()}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          renderItem={({ item }) => {
            if (item.itemType === 'date') {
              return (
                <View style={styles.dateSeparator}>
                  <Text style={styles.dateSeparatorText}>{item.label}</Text>
                </View>
              );
            }

            if (item.itemType === 'typing') {
              return (
                <View style={[styles.msgRow, styles.msgRowThem]}>
                  <Avatar user={otherUser} size={28} T={T} />
                  <View style={[styles.bubble, styles.bubbleThem, styles.typingBubble]}>
                    <Text style={styles.typingDots}>{'\u25CF \u25CF \u25CF'}</Text>
                  </View>
                </View>
              );
            }

            if (item.type === 'SYSTEM') {
              return (
                <View style={styles.systemRow}>
                  <View style={styles.systemBubble}>
                    <Text style={styles.systemText}>{item.text}</Text>
                  </View>
                </View>
              );
            }

            const isMe = item.senderId === user.id;

            return (
              <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowThem]}>
                {!isMe ? <Avatar user={otherUser} size={28} T={T} /> : null}
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => handleDoubleTap(item.id)}
                  onLongPress={() => !item.temp && setSelectedMsgMenu({ id: item.id, mine: isMe })}
                  delayLongPress={350}
                  style={[styles.msgStack, isMe && styles.msgStackMe, item.temp && styles.bubbleTemp]}
                >
                  {item.movie ? (
                    <View style={styles.attachmentCard}>
                      <Text style={styles.attachmentEyebrow}>Ortak film onerisi</Text>
                      <View style={styles.attachmentBody}>
                        {item.movie.poster ? (
                          <Image source={{ uri: item.movie.poster }} style={styles.attachmentPoster} />
                        ) : (
                          <View style={[styles.attachmentPoster, styles.moviePosterFallback]}>
                            <Text style={styles.moviePosterFallbackText}>{item.movie.title?.[0]?.toUpperCase()}</Text>
                          </View>
                        )}
                        <View style={styles.attachmentInfo}>
                          <View style={styles.attachmentTitleRow}>
                            <Text style={styles.attachmentTitle} numberOfLines={2}>
                              {item.movie.title}
                              {item.movie.year ? ` (${item.movie.year})` : ''}
                            </Text>
                            <TouchableOpacity
                              style={styles.attachmentDetailBtn}
                              onPress={() => handleOpenMovieDetail(item.movie)}
                            >
                              <Text style={styles.attachmentDetailBtnText}>Detay</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </View>
                  ) : null}

                  <View style={[styles.bubbleWrap, isMe && styles.bubbleWrapMe, likedMessages[item.id] && styles.bubbleWrapLiked]}>
                    <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                      <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.text}</Text>
                    </View>
                    {likedMessages[item.id] ? (
                      <View style={styles.messageHeartBadge}>
                        <Text style={styles.messageHeartBadgeText}>{'\u2665'}</Text>
                      </View>
                    ) : null}
                    {!item.temp ? (
                      <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>{formatTime(item.createdAt)}</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              </View>
            );
          }}
        />

        {commonMovies.length > 0 ? (
          <View style={styles.commonMoviesSection}>
            {!commonMoviesExpanded ? (
              <TouchableOpacity
                style={styles.commonMoviesCollapsedBar}
                activeOpacity={0.85}
                onPress={toggleCommonMoviesExpanded}
              >
                <Text style={styles.commonMoviesCollapsedTitle}>Ortak izledikleriniz</Text>
                <Text style={styles.commonMoviesCollapsedAction}>Goster</Text>
              </TouchableOpacity>
            ) : (
              <>
                <View style={styles.commonMoviesHeader}>
                  <TouchableOpacity
                    style={styles.commonMoviesHeaderLeft}
                    activeOpacity={0.85}
                    onPress={toggleCommonMoviesExpanded}
                  >
                    <Text style={styles.commonMoviesTitle}>Ortak izledikleriniz</Text>
                    <Text style={styles.commonMoviesCount}>{commonMovies.length} film</Text>
                  </TouchableOpacity>
                  <View style={styles.commonMoviesHeaderActions}>
                    <TouchableOpacity
                      style={styles.expandChip}
                      activeOpacity={0.85}
                      onPress={toggleCommonMoviesExpanded}
                    >
                      <Text style={styles.expandChipText}>Daralt</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.commonMoviesList}
                >
                  {commonMovies.map((movie) => (
                    <MoviePoster
                      key={movie.id}
                      movie={movie}
                      selected={selectedMovie?.id === movie.id}
                      onPress={() => toggleMovieSelection(movie)}
                    />
                  ))}
                </ScrollView>

                {selectedMovie ? (
                  <Text style={styles.selectedMovieHint}>
                    Secili film: {selectedMovie.title}. Gonderecegin mesaja eklenecek.
                  </Text>
                ) : null}
              </>
            )}
          </View>
        ) : null}

        <View
          style={[
            styles.inputRow,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              marginBottom: Platform.OS === 'android' ? keyboardOffset : 0,
            },
          ]}
        >
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={handleTextChange}
            placeholder={selectedMovie ? `"${selectedMovie.title}" ile mesaj yaz...` : 'Mesaj yaz...'}
            placeholderTextColor={T.textMuted}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={19} color="#fff" style={styles.sendBtnIcon} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Kalp animasyonu */}
      {showHeart && (
        <Animated.Text
          pointerEvents="none"
          style={[
            styles.heartFloat,
            {
              left: heartPos.x - 24,
              top: heartPos.y - 24,
              opacity: heartAnim,
              transform: [{ scale: heartAnim }],
            },
          ]}
        >
          ❤️
        </Animated.Text>
      )}

      {/* Long press menü */}
      <Modal
        visible={chatOptionsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setChatOptionsVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setChatOptionsVisible(false)}
        >
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle}>Sohbet Secenekleri</Text>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() =>
                Alert.alert(
                  'Eslesmeyi Bitir',
                  'Eslesme sonlandirilacak ve bu sohbet silinecek. Emin misin?',
                  [
                    { text: 'Iptal', style: 'cancel' },
                    { text: 'Bitir', style: 'destructive', onPress: handleEndMatch },
                  ]
                )
              }
            >
              <Text style={styles.menuItemText}>Eslesmeyi bitir ve sohbeti sil</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemDanger]}
              onPress={() =>
                Alert.alert(
                  'Engelle ve Sil',
                  'Bu kullanici engellenecek ve sohbet silinecek. Emin misin?',
                  [
                    { text: 'Iptal', style: 'cancel' },
                    { text: 'Engelle', style: 'destructive', onPress: handleBlockAndDelete },
                  ]
                )
              }
            >
              <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Engelle ve sil</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemDisabled]}
              activeOpacity={1}
            >
              <Text style={styles.menuItemTextDisabled}>Bildir</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemCancel]}
              onPress={() => setChatOptionsVisible(false)}
            >
              <Text style={styles.menuItemTextCancel}>Iptal</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={!!selectedMsgMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMsgMenu(null)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setSelectedMsgMenu(null)}
        >
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle}>Mesaj Seçenekleri</Text>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleDeleteMessage(selectedMsgMenu?.id, 'me')}
            >
              <Text style={styles.menuItemText}>🙈  Benden Sil</Text>
            </TouchableOpacity>
            {selectedMsgMenu?.mine && (
              <TouchableOpacity
                style={[styles.menuItem, styles.menuItemDanger]}
                onPress={() =>
                  Alert.alert(
                    'Herkesten Sil',
                    'Bu mesaj herkes için silinecek. Emin misin?',
                    [
                      { text: 'İptal', style: 'cancel' },
                      { text: 'Sil', style: 'destructive', onPress: () => handleDeleteMessage(selectedMsgMenu?.id, 'all') },
                    ]
                  )
                }
              >
                <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>🗑️  Herkesten Sil</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemCancel]}
              onPress={() => setSelectedMsgMenu(null)}
            >
              <Text style={styles.menuItemTextCancel}>İptal</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
    </ThemeShell>
  );
}

function ThemeShell({ children, backgroundImage, gradientColors }) {
  const content = (
    <LinearGradient
      colors={gradientColors}
      style={styles.themeShell}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 0.7, y: 1 }}
    >
      {children}
    </LinearGradient>
  );
  if (!backgroundImage) return <View style={styles.themeShell}>{content}</View>;
  return (
    <ImageBackground source={backgroundImage} style={styles.themeShell} resizeMode="cover">
      {content}
    </ImageBackground>
  );
}

function createStyles(T) {
  return StyleSheet.create({
  themeShell: { flex: 1 },
  container: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 10,
    paddingHorizontal: 14,
    backgroundColor: T.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: T.headerBorder,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.headerButtonBg,
    borderWidth: 1,
    borderColor: T.headerBorder,
    shadowColor: T.shadow,
    shadowOpacity: T.shadowOpacity,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  backBtnIcon: {
    marginLeft: -2,
  },
  headerUser: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  headerName: { color: T.text, fontSize: 16, fontWeight: '800' },
  typingHeader: { color: T.textMuted, fontSize: 11, marginTop: 1 },
  headerMenuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.headerButtonBg,
    borderWidth: 1,
    borderColor: T.headerBorder,
    shadowColor: T.shadow,
    shadowOpacity: T.shadowOpacity,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  commonMoviesSection: {
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: T.borderSoft,
    backgroundColor: T.surface,
  },
  commonMoviesCollapsedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 12,
    borderRadius: 16,
    backgroundColor: T.surfaceSoft,
    borderWidth: 1,
    borderColor: T.border,
  },
  commonMoviesCollapsedTitle: {
    color: T.text,
    fontSize: 14,
    fontWeight: '700',
  },
  commonMoviesCollapsedAction: {
    color: T.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  commonMoviesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 12,
    marginHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: T.surfaceSoft,
    borderWidth: 1,
    borderColor: T.border,
  },
  commonMoviesHeaderLeft: {
    flex: 1,
  },
  commonMoviesHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commonMoviesTitle: { color: T.text, fontSize: 15, fontWeight: '700' },
  commonMoviesCount: { color: T.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  expandChip: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: T.glass,
  },
  expandChipText: { color: T.textSoft, fontSize: 11, fontWeight: '700' },
  commonMoviesList: {
    paddingHorizontal: 12,
    gap: 10,
    paddingRight: 18,
  },
  movieChip: {
    width: 188,
    minHeight: 88,
    borderRadius: 18,
    padding: 8,
    backgroundColor: T.surfaceSoft,
    borderWidth: 1,
    borderColor: T.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  movieChipSelected: {
    borderColor: T.red,
    backgroundColor: T.redSoft,
    shadowColor: T.red,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  moviePoster: {
    width: 52,
    height: 72,
    borderRadius: 13,
    backgroundColor: T.bgSoft,
  },
  moviePosterFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  moviePosterFallbackText: {
    color: T.text,
    fontSize: 20,
    fontWeight: '700',
  },
  movieMeta: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 70,
  },
  movieMetaTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  movieTitle: {
    flex: 1,
    color: T.textSoft,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  movieTitleSelected: {
    color: T.text,
  },
  movieSubline: {
    color: T.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  movieSublineSelected: {
    color: T.red,
  },
  movieMiniAction: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: T.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: T.border,
  },
  movieMiniActionSelected: {
    backgroundColor: T.red,
    borderColor: T.red,
  },
  movieMiniActionText: {
    color: T.textMuted,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
  },
  movieMiniActionTextSelected: {
    color: '#fff',
  },
  selectedMovieHint: {
    marginTop: 12,
    paddingHorizontal: 12,
    color: T.textSoft,
    fontSize: 12,
  },
  msgList: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 16, gap: 4, flexGrow: 1 },
  flatList: { flex: 1 },
  dateSeparator: { alignItems: 'center', marginVertical: 12 },
  dateSeparatorText: {
    color: T.textMuted,
    fontSize: 12,
    backgroundColor: T.glass,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  systemRow: { alignItems: 'center', marginVertical: 8 },
  systemBubble: {
    maxWidth: '88%',
    backgroundColor: T.surfaceSoft,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  systemText: {
    color: T.textSoft,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginVertical: 1 },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowThem: { justifyContent: 'flex-start' },
  msgStack: {
    maxWidth: '80%',
    gap: 4,
  },
  msgStackMe: {
    alignItems: 'flex-end',
  },
  bubbleWrap: {
    alignItems: 'flex-start',
    gap: 4,
    position: 'relative',
  },
  bubbleWrapMe: {
    alignItems: 'flex-end',
  },
  bubbleWrapLiked: {
    marginBottom: 8,
  },
  bubble: {
    minWidth: 64,
    maxWidth: '100%',
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: T.glass,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  bubbleMe: {
    backgroundColor: T.red,
    borderBottomRightRadius: 8,
    borderWidth: 0,
  },
  bubbleThem: {
    backgroundColor: 'rgba(255,255,255,0.075)',
    borderBottomLeftRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  bubbleTemp: { opacity: 0.5 },
  attachmentCard: {
    width: 270,
    backgroundColor: 'rgba(255,255,255,0.075)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  attachmentEyebrow: {
    color: T.red,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  attachmentBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  attachmentPoster: {
    width: 68,
    height: 82,
    borderRadius: 16,
    backgroundColor: T.bgSoft,
  },
  attachmentInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  attachmentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  attachmentTitle: {
    flex: 1,
    color: T.text,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 21,
  },
  attachmentDetailBtn: {
    minWidth: 72,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  attachmentDetailBtnText: {
    color: T.text,
    fontSize: 10,
    fontWeight: '800',
  },
  bubbleText: { color: T.text, fontSize: 14, lineHeight: 20 },
  bubbleTextMe: { color: '#fff' },
  bubbleTime: {
    color: T.textMuted,
    fontSize: 10,
    marginHorizontal: 4,
    alignSelf: 'flex-start',
  },
  bubbleTimeMe: {
    color: 'rgba(255,255,255,0.72)',
    alignSelf: 'flex-end',
  },
  messageHeartBadge: {
    position: 'absolute',
    left: 8,
    bottom: 14,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: T.surfaceSoft,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageHeartBadgeText: {
    color: T.red,
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },
  typingBubble: { paddingVertical: 12, paddingHorizontal: 16 },
  typingDots: { color: T.textMuted, fontSize: 12, letterSpacing: 3 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(5,5,6,0.82)',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.075)',
    color: T.text,
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: T.red,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 1,
    shadowColor: T.red,
    shadowOpacity: 0.32,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendBtnIcon: {
    marginLeft: 2,
    marginTop: 1,
  },

  // Kalp
  heartFloat: {
    position: 'absolute',
    fontSize: 48,
    zIndex: 999,
    pointerEvents: 'none',
  },

  // Menü
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 16,
    gap: 8,
  },
  menuTitle: {
    color: T.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    backgroundColor: T.surfaceSoft,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderWidth: 0.5,
    borderColor: T.border,
  },
  menuItemDanger: {
    borderColor: T.redBorder,
    backgroundColor: T.redSoft,
  },
  menuItemDisabled: {
    opacity: 0.45,
  },
  menuItemCancel: {
    marginTop: 4,
    backgroundColor: T.glass,
  },
  menuItemText: { color: T.text, fontSize: 15, fontWeight: '600' },
  menuItemTextDanger: { color: T.red },
  menuItemTextDisabled: { color: T.textMuted, fontSize: 15, fontWeight: '600' },
  menuItemTextCancel: { color: T.textMuted, fontSize: 15, fontWeight: '600', textAlign: 'center' },
});
}
