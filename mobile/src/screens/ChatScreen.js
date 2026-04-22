import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  Image, StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, ScrollView, Modal, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';
import { getSocket, connectSocket, emitTyping, emitStopTyping } from '../services/socket';
import { useAuth } from '../context/AuthContext';

function Avatar({ user, size = 36 }) {
  if (user?.avatar) {
    return <Image source={{ uri: user.avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }

  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#E50914', justifyContent: 'center', alignItems: 'center' }}>
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
  const insets = useSafeAreaInsets();

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
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color="#E50914" size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>{'\u2190'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerUser}
            onPress={() => navigation.navigate('UserProfile', { userId: otherUser.id, matchId })}
          >
            <Avatar user={otherUser} size={36} />
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
            <Text style={styles.headerMenuBtnText}>{'\u22EF'}</Text>
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
                  <Avatar user={otherUser} size={28} />
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
                {!isMe ? <Avatar user={otherUser} size={28} /> : null}
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

        <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={handleTextChange}
            placeholder={selectedMovie ? `"${selectedMovie.title}" ile mesaj yaz...` : 'Mesaj yaz...'}
            placeholderTextColor="#555"
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            <Text style={styles.sendBtnText}>{'\u2191'}</Text>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  flex: { flex: 1 },
  center: { flex: 1, backgroundColor: '#0f0f0f', justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#0f0f0f',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backBtn: { padding: 6, marginRight: 2 },
  backBtnText: { color: '#fff', fontSize: 24, fontWeight: '600' },
  headerUser: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  headerName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  typingHeader: { color: '#888', fontSize: 11, marginTop: 1 },
  headerMenuBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#262626',
  },
  headerMenuBtnText: {
    color: '#fff',
    fontSize: 22,
    lineHeight: 22,
    marginTop: -3,
  },
  commonMoviesSection: {
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#161616',
    backgroundColor: '#111',
  },
  commonMoviesCollapsedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#232323',
  },
  commonMoviesCollapsedTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  commonMoviesCollapsedAction: {
    color: '#8d8d8d',
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
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#252525',
  },
  commonMoviesHeaderLeft: {
    flex: 1,
  },
  commonMoviesHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commonMoviesTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  commonMoviesCount: { color: '#7d7d7d', fontSize: 11, fontWeight: '600', marginTop: 2 },
  expandChip: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#1a1a1a',
  },
  expandChipText: { color: '#9e9e9e', fontSize: 11, fontWeight: '700' },
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
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#262626',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  movieChipSelected: {
    borderColor: '#E50914',
    backgroundColor: '#261215',
    shadowColor: '#E50914',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  moviePoster: {
    width: 52,
    height: 72,
    borderRadius: 13,
    backgroundColor: '#1c1c1c',
  },
  moviePosterFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  moviePosterFallbackText: {
    color: '#fff',
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
    color: '#d1d1d1',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  movieTitleSelected: {
    color: '#fff',
  },
  movieSubline: {
    color: '#7f7f7f',
    fontSize: 11,
    fontWeight: '600',
  },
  movieSublineSelected: {
    color: '#f0b9bf',
  },
  movieMiniAction: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#303030',
  },
  movieMiniActionSelected: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  movieMiniActionText: {
    color: '#aaa',
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
    color: '#bcbcbc',
    fontSize: 12,
  },
  msgList: { paddingHorizontal: 12, paddingVertical: 16, gap: 4, flexGrow: 1 },
  flatList: { flex: 1 },
  dateSeparator: { alignItems: 'center', marginVertical: 12 },
  dateSeparatorText: {
    color: '#444',
    fontSize: 12,
    backgroundColor: '#181818',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  systemRow: { alignItems: 'center', marginVertical: 8 },
  systemBubble: {
    maxWidth: '88%',
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  systemText: {
    color: '#cfcfcf',
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
    minWidth: 88,
    maxWidth: '100%',
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 9,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  bubbleMe: { backgroundColor: '#C84A52', borderBottomRightRadius: 7 },
  bubbleThem: { backgroundColor: '#202124', borderBottomLeftRadius: 7 },
  bubbleTemp: { opacity: 0.5 },
  attachmentCard: {
    width: 238,
    backgroundColor: '#151515',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2b2b2b',
    padding: 9,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  attachmentEyebrow: {
    color: '#ff7d86',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  attachmentBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  attachmentPoster: {
    width: 64,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#1d1d1d',
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
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 17,
  },
  attachmentDetailBtn: {
    minWidth: 68,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3d3d3d',
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#191919',
  },
  attachmentDetailBtnText: {
    color: '#f5f5f5',
    fontSize: 10,
    fontWeight: '800',
  },
  bubbleText: { color: '#ececec', fontSize: 14, lineHeight: 20 },
  bubbleTextMe: { color: '#fff' },
  bubbleTime: {
    color: 'rgba(200,200,200,0.48)',
    fontSize: 10,
    marginHorizontal: 4,
    alignSelf: 'flex-start',
  },
  bubbleTimeMe: {
    color: 'rgba(255,255,255,0.62)',
    alignSelf: 'flex-end',
  },
  messageHeartBadge: {
    position: 'absolute',
    left: 8,
    bottom: 14,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageHeartBadgeText: {
    color: '#E50914',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },
  typingBubble: { paddingVertical: 12, paddingHorizontal: 16 },
  typingDots: { color: '#888', fontSize: 12, letterSpacing: 3 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    backgroundColor: '#0f0f0f',
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    color: '#fff',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E50914',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendBtnDisabled: { backgroundColor: '#3a0a0a' },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },

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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: '#161616',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 16,
    gap: 8,
  },
  menuTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    backgroundColor: '#1f1f1f',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
  },
  menuItemDanger: {
    borderColor: 'rgba(229,9,20,0.25)',
    backgroundColor: '#1a0a0b',
  },
  menuItemDisabled: {
    opacity: 0.45,
  },
  menuItemCancel: {
    marginTop: 4,
    backgroundColor: '#111',
  },
  menuItemText: { color: '#e5e5e5', fontSize: 15, fontWeight: '600' },
  menuItemTextDanger: { color: '#ff4d4d' },
  menuItemTextDisabled: { color: '#888', fontSize: 15, fontWeight: '600' },
  menuItemTextCancel: { color: '#888', fontSize: 15, fontWeight: '600', textAlign: 'center' },
});
