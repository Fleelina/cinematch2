import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, FlatList, Switch
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function EditProfileScreen({ navigation }) {
  const { user, setUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [age, setAge] = useState(user?.age ? String(user.age) : '');
  const [showAge, setShowAge] = useState(user?.showAge || false);
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [avatarType, setAvatarType] = useState(user?.avatarType || null);

  const [tab, setTab] = useState('info'); // 'info' | 'avatar'
  const [avatarTab, setAvatarTab] = useState('character'); // 'character' | 'photo'
  const [charQuery, setCharQuery] = useState('');
  const [charResults, setCharResults] = useState([]);
  const [charSearching, setCharSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const searchCharacters = async () => {
    if (!charQuery.trim()) return;
    setCharSearching(true);
    try {
      const res = await api.get(`/users/characters/search?query=${charQuery}`);
      setCharResults(res.data);
    } catch (err) {
      Alert.alert('Hata', 'Arama basarisiz');
    } finally {
      setCharSearching(false);
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin gerekli', 'Galeri erisimi icin izin ver');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setAvatar(base64);
      setAvatarType('photo');
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin gerekli', 'Kamera erisimi icin izin ver');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setAvatar(base64);
      setAvatarType('photo');
    }
  };

  const selectCharacter = (person) => {
    setAvatar(person.photo);
    setAvatarType('character');
    setCharResults([]);
    setCharQuery('');
    Alert.alert('Secildi!', `${person.name} avatarin olarak ayarlandi.`);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Hata', 'Ad bos birakilamaz');
      return;
    }
    if (age && (isNaN(parseInt(age)) || parseInt(age) < 13 || parseInt(age) > 120)) {
      Alert.alert('Hata', 'Gecerli bir yas gir (13-120)');
      return;
    }

    setSaving(true);
    try {
      const res = await api.put('/users/profile', {
        name: name.trim(),
        username: username.trim() || null,
        bio: bio.trim() || null,
        avatar,
        avatarType,
        age: age ? parseInt(age) : null,
        showAge,
      });

      // Context'i guncelle
      setUser((prev) => ({ ...prev, ...res.data }));
      Alert.alert('Kaydedildi!', 'Profilin guncellendi.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Hata', err.response?.data?.error || 'Kaydetme basarisiz');
    } finally {
      setSaving(false);
    }
  };

  const renderAvatar = () => {
    if (avatar) {
      return <Image source={{ uri: avatar }} style={styles.avatarPreview} />;
    }
    return (
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarPlaceholderText}>{name?.[0]?.toUpperCase() || '?'}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profili Duzenle</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#E50914" size="small" />
            : <Text style={styles.saveBtn}>Kaydet</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'info' && styles.tabActive]}
          onPress={() => setTab('info')}
        >
          <Text style={[styles.tabText, tab === 'info' && styles.tabTextActive]}>Bilgiler</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'avatar' && styles.tabActive]}
          onPress={() => setTab('avatar')}
        >
          <Text style={[styles.tabText, tab === 'avatar' && styles.tabTextActive]}>Avatar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {tab === 'info' ? (
          <View style={styles.section}>
            {/* Avatar preview */}
            <View style={styles.avatarCenter}>
              {renderAvatar()}
              <TouchableOpacity onPress={() => setTab('avatar')}>
                <Text style={styles.changeAvatarText}>Avatari Degistir</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Ad Soyad</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Adiniz"
              placeholderTextColor="#555"
            />

            <Text style={styles.label}>Kullanici Adi</Text>
            <View style={styles.usernameRow}>
              <Text style={styles.at}>@</Text>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={username}
                onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                placeholder="kullanici_adi"
                placeholderTextColor="#555"
                autoCapitalize="none"
              />
            </View>
            <Text style={styles.hint}>Sadece harf, rakam, nokta ve alt cizgi</Text>

            <Text style={styles.label}>Hakkimda</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Kendinden bahset..."
              placeholderTextColor="#555"
              multiline
            />

            <Text style={styles.label}>Yas</Text>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              placeholder="Yasinizi girin"
              placeholderTextColor="#555"
              keyboardType="numeric"
              maxLength={3}
            />

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Yasi profilimde goster</Text>
                <Text style={styles.switchSubLabel}>Kapali ise yasiniz kimseye gozukmez</Text>
              </View>
              <Switch
                value={showAge}
                onValueChange={setShowAge}
                trackColor={{ false: '#333', true: '#E50914' }}
                thumbColor="#fff"
              />
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            {/* Avatar preview */}
            <View style={styles.avatarCenter}>
              {renderAvatar()}
            </View>

            {/* Avatar tab seçimi */}
            <View style={styles.avatarTabs}>
              <TouchableOpacity
                style={[styles.avatarTab, avatarTab === 'character' && styles.avatarTabActive]}
                onPress={() => setAvatarTab('character')}
              >
                <Text style={[styles.avatarTabText, avatarTab === 'character' && styles.avatarTabTextActive]}>
                  🎭 Karakter
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.avatarTab, avatarTab === 'photo' && styles.avatarTabActive]}
                onPress={() => setAvatarTab('photo')}
              >
                <Text style={[styles.avatarTabText, avatarTab === 'photo' && styles.avatarTabTextActive]}>
                  📷 Fotograf
                </Text>
              </TouchableOpacity>
            </View>

            {avatarTab === 'character' ? (
              <View>
                <Text style={styles.avatarInfo}>
                  Film ve dizi karakterlerini veya oyuncularini ara, avatar olarak sec!
                </Text>
                <View style={styles.searchRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    value={charQuery}
                    onChangeText={setCharQuery}
                    placeholder="Jon Snow, Tony Stark..."
                    placeholderTextColor="#555"
                    onSubmitEditing={searchCharacters}
                    returnKeyType="search"
                  />
                  <TouchableOpacity style={styles.searchBtn} onPress={searchCharacters}>
                    <Text style={styles.searchBtnText}>Ara</Text>
                  </TouchableOpacity>
                </View>

                {charSearching && <ActivityIndicator color="#E50914" style={{ marginTop: 12 }} />}

                {charResults.length > 0 && (
                  <FlatList
                    data={charResults}
                    keyExtractor={(item) => item.id.toString()}
                    numColumns={3}
                    scrollEnabled={false}
                    style={{ marginTop: 12 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity style={styles.charCard} onPress={() => selectCharacter(item)}>
                        <Image source={{ uri: item.photo }} style={styles.charPhoto} />
                        <Text style={styles.charName} numberOfLines={2}>{item.name}</Text>
                        {item.knownFor ? (
                          <Text style={styles.charKnownFor} numberOfLines={1}>{item.knownFor}</Text>
                        ) : null}
                      </TouchableOpacity>
                    )}
                  />
                )}
              </View>
            ) : (
              <View style={styles.photoOptions}>
                <TouchableOpacity style={styles.photoBtn} onPress={pickFromGallery}>
                  <Text style={styles.photoBtnIcon}>🖼</Text>
                  <Text style={styles.photoBtnText}>Galeriden Sec</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                  <Text style={styles.photoBtnIcon}>📷</Text>
                  <Text style={styles.photoBtnText}>Fotograf Cek</Text>
                </TouchableOpacity>
              </View>
            )}

            {avatar && (
              <TouchableOpacity
                style={styles.removeAvatarBtn}
                onPress={() => { setAvatar(null); setAvatarType(null); }}
              >
                <Text style={styles.removeAvatarText}>Avatari Kaldir</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', paddingTop: 52 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, marginBottom: 12,
  },
  backBtn: { color: '#E50914', fontSize: 15, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  saveBtn: { color: '#E50914', fontSize: 15, fontWeight: 'bold' },

  tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, backgroundColor: '#1c1c1c', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#E50914' },
  tabText: { color: '#888', fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  section: { paddingHorizontal: 16 },

  avatarCenter: { alignItems: 'center', marginBottom: 24 },
  avatarPreview: { width: 100, height: 100, borderRadius: 50, marginBottom: 8 },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#E50914', justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  avatarPlaceholderText: { color: '#fff', fontSize: 44, fontWeight: 'bold' },
  changeAvatarText: { color: '#E50914', fontSize: 14, fontWeight: '600' },

  label: { color: '#aaa', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: '#1c1c1c', color: '#fff', borderRadius: 12,
    padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#333', marginBottom: 4,
  },
  bioInput: { height: 90, textAlignVertical: 'top' },
  hint: { color: '#555', fontSize: 11, marginBottom: 4 },

  usernameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  at: { color: '#888', fontSize: 18, fontWeight: 'bold' },

  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 20,
    backgroundColor: '#1c1c1c', borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: '#333',
  },
  switchLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
  switchSubLabel: { color: '#555', fontSize: 12, marginTop: 2 },

  avatarTabs: {
    flexDirection: 'row', backgroundColor: '#1c1c1c',
    borderRadius: 12, padding: 4, marginBottom: 16,
  },
  avatarTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  avatarTabActive: { backgroundColor: '#2a2a2a' },
  avatarTabText: { color: '#888', fontWeight: '600' },
  avatarTabTextActive: { color: '#fff' },

  avatarInfo: { color: '#888', fontSize: 13, textAlign: 'center', marginBottom: 12 },

  searchRow: { flexDirection: 'row', gap: 8 },
  searchBtn: { backgroundColor: '#E50914', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontWeight: 'bold' },

  charCard: { flex: 1, margin: 4, alignItems: 'center' },
  charPhoto: { width: '100%', aspectRatio: 1, borderRadius: 12, marginBottom: 4 },
  charName: { color: '#fff', fontSize: 11, textAlign: 'center', fontWeight: '600' },
  charKnownFor: { color: '#888', fontSize: 10, textAlign: 'center' },

  photoOptions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  photoBtn: {
    flex: 1, backgroundColor: '#1c1c1c', borderRadius: 16,
    padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#333',
  },
  photoBtnIcon: { fontSize: 36, marginBottom: 8 },
  photoBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  removeAvatarBtn: {
    marginTop: 16, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#333', borderRadius: 12,
  },
  removeAvatarText: { color: '#888', fontSize: 14 },
});
