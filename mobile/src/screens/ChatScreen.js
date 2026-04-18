import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  Image, StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert,
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

export default function ChatScreen({ route, navigation }) {
  const { matchId, otherUser } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);

  const flatListRef = useRef(null);
  const typingTimer = useRef(null);
  const isTyping = useRef(false);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get(`/messages/${matchId}`);
      setMessages(res.data.messages);
    } catch (err) {
      console.error(err);
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
          // Gönderen bensem: temp mesajı metne göre bul ve gerçekle değiştir
          if (message.senderId === user.id) {
            const tempIndex = prev.findIndex((m) => m.temp && m.text === message.text);
            if (tempIndex !== -1) {
              const updated = [...prev];
              updated[tempIndex] = { ...message, temp: false };
              return updated;
            }
          }
          // Karşı taraftan veya temp bulunamadıysa — duplicate kontrolü yapıp ekle
          if (prev.find((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      });

      socket.on('user_typing', ({ userId }) => {
        if (userId !== user.id) setOtherTyping(true);
      });

      socket.on('user_stop_typing', ({ userId }) => {
        if (userId !== user.id) setOtherTyping(false);
      });
    };

    setupSocket();

    return () => {
      const socket = getSocket();
      if (socket) {
        socket.off('new_message');
        socket.off('user_typing');
        socket.off('user_stop_typing');
      }
      if (typingTimer.current) clearTimeout(typingTimer.current);
      emitStopTyping(matchId);
    };
  }, [matchId]);

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

  const handleSend = () => {
    if (!text.trim() || sending) return;
    const msgText = text.trim();
    setText('');

    isTyping.current = false;
    emitStopTyping(matchId);
    if (typingTimer.current) clearTimeout(typingTimer.current);

    // Optimistik mesaj — soluk görünür, socket cevabı gelince yerini alır
    const tempMsg = {
      id: `temp_${Date.now()}`,
      text: msgText,
      senderId: user.id,
      createdAt: new Date().toISOString(),
      temp: true,
    };
    setMessages((prev) => [...prev, tempMsg]);

    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('send_message', { matchId, text: msgText });
    } else {
      // Fallback: HTTP
      api.post(`/messages/${matchId}`, { text: msgText })
        .then((res) => {
          setMessages((prev) => prev.map((m) => m.id === tempMsg.id ? { ...res.data, temp: false } : m));
        })
        .catch(() => {
          Alert.alert('Hata', 'Mesaj gonderilemedi');
          setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
          setText(msgText);
        });
    }
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Bugun';
    if (d.toDateString() === yesterday.toDateString()) return 'Dun';
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  };

  const messagesWithDates = () => {
    const result = [];
    let lastDate = null;
    for (const msg of messages) {
      const date = new Date(msg.createdAt).toDateString();
      if (date !== lastDate) {
        result.push({ type: 'date', id: `date_${date}`, label: formatDate(msg.createdAt) });
        lastDate = date;
      }
      result.push({ type: 'msg', ...msg });
    }
    if (otherTyping) {
      result.push({ type: 'typing', id: 'typing_indicator' });
    }
    return result;
  };

  if (loading) return (
    <View style={[styles.center, { paddingTop: insets.top }]}>
      <ActivityIndicator color="#E50914" size="large" />
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerUser}
            onPress={() => navigation.navigate('UserProfile', { userId: otherUser.id, matchId })}
          >
            <Avatar user={otherUser} size={36} />
            <View>
              <Text style={styles.headerName}>{otherUser.name}</Text>
              {otherTyping && <Text style={styles.typingHeader}>yazıyor...</Text>}
            </View>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messagesWithDates()}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          renderItem={({ item }) => {
            if (item.type === 'date') {
              return (
                <View style={styles.dateSeparator}>
                  <Text style={styles.dateSeparatorText}>{item.label}</Text>
                </View>
              );
            }
            if (item.type === 'typing') {
              return (
                <View style={[styles.msgRow, styles.msgRowThem]}>
                  <Avatar user={otherUser} size={28} />
                  <View style={[styles.bubble, styles.bubbleThem, styles.typingBubble]}>
                    <Text style={styles.typingDots}>● ● ●</Text>
                  </View>
                </View>
              );
            }
            const isMe = item.senderId === user.id;
            return (
              <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowThem]}>
                {!isMe && <Avatar user={otherUser} size={28} />}
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem, item.temp && styles.bubbleTemp]}>
                  <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.text}</Text>
                  {!item.temp && (
                    <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>{formatTime(item.createdAt)}</Text>
                  )}
                </View>
              </View>
            );
          }}
        />

        <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={handleTextChange}
            placeholder="Mesaj yaz..."
            placeholderTextColor="#555"
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim()}
          >
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  flex: { flex: 1 },
  center: { flex: 1, backgroundColor: '#0f0f0f', justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 16,
    backgroundColor: '#0f0f0f', borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  backBtn: { padding: 6, marginRight: 2 },
  backBtnText: { color: '#fff', fontSize: 24, fontWeight: '600' },
  headerUser: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  headerName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  typingHeader: { color: '#888', fontSize: 11, marginTop: 1 },
  msgList: { paddingHorizontal: 12, paddingVertical: 16, gap: 4, flexGrow: 1 },
  dateSeparator: { alignItems: 'center', marginVertical: 12 },
  dateSeparatorText: {
    color: '#444', fontSize: 12, backgroundColor: '#181818',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10,
  },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginVertical: 2 },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowThem: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '75%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, gap: 2 },
  bubbleMe: { backgroundColor: '#E50914', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#1e1e1e', borderBottomLeftRadius: 4 },
  bubbleTemp: { opacity: 0.5 },
  bubbleText: { color: '#ddd', fontSize: 15, lineHeight: 21 },
  bubbleTextMe: { color: '#fff' },
  bubbleTime: { color: 'rgba(200,200,200,0.5)', fontSize: 10, alignSelf: 'flex-end' },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.6)' },
  typingBubble: { paddingVertical: 12, paddingHorizontal: 16 },
  typingDots: { color: '#888', fontSize: 12, letterSpacing: 3 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#1a1a1a', backgroundColor: '#0f0f0f',
  },
  input: {
    flex: 1, backgroundColor: '#1a1a1a', color: '#fff',
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, maxHeight: 120, borderWidth: 1, borderColor: '#2a2a2a',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#E50914', justifyContent: 'center', alignItems: 'center', marginBottom: 2,
  },
  sendBtnDisabled: { backgroundColor: '#3a0a0a' },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
