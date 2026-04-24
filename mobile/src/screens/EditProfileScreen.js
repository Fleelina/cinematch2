import React, { useState } from 'react';
import {
  View, Text, Image, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, FlatList, Switch, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// Yastan dogum tarihine ve tersine ceviri yardimcilari
const ageToDate = (age) => {
  if (!age) return new Date();
  const d = new Date();
  d.setFullYear(d.getFullYear() - parseInt(age));
  return d;
};

const dateToAge = (date) => {
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const m = today.getMonth() - date.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age--;
  return age;
};

export default function EditProfileScreen({ navigation }) {
  const { user, setUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [age, setAge] = useState(user?.age ? String(user.age) : '');
  const [showAge, setShowAge] = useState(user?.showAge || false);
  const [birthDate, setBirthDate] = useState(ageToDate(user?.age));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [avatarType, setAvatarType] = useState(user?.avatarType || null);

  const [tab, setTab] = useState('info');
  const [avatarTab, setAvatarTab] = useState('character');
  const [charQuery, setCharQuery] = useState('');
  const [charResults, setCharResults] = useState([]);
  const [charSearching, setCharSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('MainTabs');
    }
  };

  const searchCharacters = async () => {
    if (!charQuery.trim()) return;
    setCharSearching(true);
    try {
      const res = await api.get(`/users/characters/search?query=${charQuery}`);
      setCharResults(res.data);
    } catch {
      Alert.alert('Hata', 'Arama basarisiz');
    } finally {
      setCharSearching(false);
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('İzin gerekli', 'Galeri erişimi için izin ver'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: true,
    });
    if (!result.canceled && result.assets[0]) await uploadAvatar(result.assets[0]);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('İzin gerekli', 'Kamera erişimi için izin ver'); return; }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: true,
    });
    if (!result.canceled && result.assets[0]) await uploadAvatar(result.assets[0]);
  };

  const uploadAvatar = async (asset) => {
    if (!asset.base64) { Alert.alert('Hata', 'Görsel yüklenemedi'); return; }
    setSaving(true);
    try {
      const mimeType = asset.mimeType || 'image/jpeg';
      const res = await api.post('/upload/avatar', {
        base64: `data:${mimeType};base64,${asset.base64}`,
        mimeType,
      });
      setAvatar(res.data.url);
      setAvatarType('photo');
    } catch {
      Alert.alert('Hata', 'Görsel yüklenemedi. Tekrar dene.');
    } finally {
      setSaving(false);
    }
  };

  const selectCharacter = (person) => {
    setAvatar(person.photo);
    setAvatarType('character');
    setCharResults([]);
    setCharQuery('');
    Alert.alert('Seçildi!', `${person.name} avatarın olarak ayarlandı.`);
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Hata', 'Ad boş bırakılamaz'); return; }
    const computedAge = age ? parseInt(age) : null;
    if (computedAge !== null && (computedAge < 18 || computedAge > 120)) {
      Alert.alert('Hata', 'Geçerli bir doğum tarihi gir (18-120 yaş arası)'); return;
    }
    setSaving(true);
    try {
      const res = await api.put('/users/profile', {
        name: name.trim(),
        username: username.trim() || null,
        bio: bio.trim() || null,
        avatar, avatarType,
        age: age ? parseInt(age) : null,
        showAge,
      });
      setUser((prev) => ({ ...prev, ...res.data }));
      Alert.alert('Kaydedildi!', 'Profil güncellendi.');
      handleBack();
    } catch (err) {
      Alert.alert('Hata', err.response?.data?.error || 'Kaydetme başarısız');
    } finally {
      setSaving(false);
    }
  };

  const renderAvatar = () => {
    if (avatar) return <Image source={{ uri: avatar }} style={styles.avatarPreview} />;
    return (
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarPlaceholderText}>{name?.[0]?.toUpperCase() || '?'}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Text style={styles.backBtn}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profili Düzenle</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#E50914" size="small" />
            : <Text style={styles.saveBtn}>Kaydet</Text>
          }
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {['info', 'avatar'].map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'info' ? 'Bilgiler' : 'Avatar'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {tab === 'info' ? (
          <View style={styles.section}>
            <View style={styles.avatarCenter}>
              {renderAvatar()}
              <TouchableOpacity onPress={() => setTab('avatar')}>
                <Text style={styles.changeAvatarText}>Avatarı Değiştir</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Ad Soyad</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Adınız" placeholderTextColor="#555" />

            <Text style={styles.label}>Kullanıcı Adı</Text>
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
            <Text style={styles.hint}>Sadece harf, rakam, nokta ve alt çizgi</Text>

            <Text style={styles.label}>Hakkımda</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio} onChangeText={setBio}
              placeholder="Kendinden bahset..." placeholderTextColor="#555" multiline
            />

            <Text style={styles.label}>Doğum Tarihi</Text>
            <TouchableOpacity
              style={styles.datePickerBtn}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.datePickerIcon}>📅</Text>
              <Text style={styles.datePickerText}>
                {age ? `${birthDate.toLocaleDateString('tr-TR')}  ·  ${age} yaş` : 'Doğum tarihi seç'}
              </Text>
              <Text style={styles.datePickerChevron}>›</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={birthDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 18))}
                minimumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 120))}
                onChange={(event, selectedDate) => {
                  if (Platform.OS === 'android') setShowDatePicker(false);
                  if (event.type === 'dismissed') { setShowDatePicker(false); return; }
                  if (selectedDate) {
                    setBirthDate(selectedDate);
                    setAge(String(dateToAge(selectedDate)));
                  }
                }}
              />
            )}
            {Platform.OS === 'ios' && showDatePicker && (
              <TouchableOpacity
                style={styles.datePickerDone}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerDoneText}>Tamam</Text>
              </TouchableOpacity>
            )}

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Yaşı profilimde göster</Text>
                <Text style={styles.switchSubLabel}>Kapalı ise yaşınız kimseye görünmez</Text>
              </View>
              <Switch value={showAge} onValueChange={setShowAge} trackColor={{ false: '#333', true: '#E50914' }} thumbColor="#fff" />
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.avatarCenter}>{renderAvatar()}</View>

            <View style={styles.avatarTabs}>
              {['character', 'photo'].map((t) => (
                <TouchableOpacity key={t} style={[styles.avatarTab, avatarTab === t && styles.avatarTabActive]} onPress={() => setAvatarTab(t)}>
                  <Text style={[styles.avatarTabText, avatarTab === t && styles.avatarTabTextActive]}>
                    {t === 'character' ? '🎭 Karakter' : '📷 Fotoğraf'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {avatarTab === 'character' ? (
              <View>
                <Text style={styles.avatarInfo}>Film ve dizi karakterlerini ara, avatar olarak seç!</Text>
                <View style={styles.searchRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    value={charQuery} onChangeText={setCharQuery}
                    placeholder="Jon Snow, Tony Stark..." placeholderTextColor="#555"
                    onSubmitEditing={searchCharacters} returnKeyType="search"
                  />
                  <TouchableOpacity style={styles.searchBtn} onPress={searchCharacters}>
                    <Text style={styles.searchBtnText}>Ara</Text>
                  </TouchableOpacity>
                </View>
                {charSearching && <ActivityIndicator color="#E50914" style={{ marginTop: 12 }} />}
                {charResults.length > 0 && (
                  <FlatList
                    data={charResults} keyExtractor={(item) => item.id.toString()}
                    numColumns={3} scrollEnabled={false} style={{ marginTop: 12 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity style={styles.charCard} onPress={() => selectCharacter(item)}>
                        <Image source={{ uri: item.photo }} style={styles.charPhoto} />
                        <Text style={styles.charName} numberOfLines={2}>{item.name}</Text>
                        {item.knownFor && <Text style={styles.charKnownFor} numberOfLines={1}>{item.knownFor}</Text>}
                      </TouchableOpacity>
                    )}
                  />
                )}
              </View>
            ) : (
              <View style={styles.photoOptions}>
                <TouchableOpacity style={styles.photoBtn} onPress={pickFromGallery}>
                  <Text style={styles.photoBtnIcon}>🖼</Text>
                  <Text style={styles.photoBtnText}>Galeriden Seç</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                  <Text style={styles.photoBtnIcon}>📷</Text>
                  <Text style={styles.photoBtnText}>Fotoğraf Çek</Text>
                </TouchableOpacity>
              </View>
            )}

            {avatar && (
              <TouchableOpacity style={styles.removeAvatarBtn} onPress={() => { setAvatar(null); setAvatarType(null); }}>
                <Text style={styles.removeAvatarText}>Avatarı Kaldır</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
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
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#E50914', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  avatarPlaceholderText: { color: '#fff', fontSize: 44, fontWeight: 'bold' },
  changeAvatarText: { color: '#E50914', fontSize: 14, fontWeight: '600' },
  label: { color: '#aaa', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: '#1c1c1c', color: '#fff', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#333', marginBottom: 4 },
  bioInput: { height: 90, textAlignVertical: 'top' },
  hint: { color: '#555', fontSize: 11, marginBottom: 4 },
  usernameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  at: { color: '#888', fontSize: 18, fontWeight: 'bold' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, backgroundColor: '#1c1c1c', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#333' },
  switchLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
  switchSubLabel: { color: '#555', fontSize: 12, marginTop: 2 },

  datePickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1c1c1c', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#333', marginBottom: 4,
  },
  datePickerIcon: { fontSize: 18 },
  datePickerText: { flex: 1, color: '#fff', fontSize: 15 },
  datePickerChevron: { color: '#555', fontSize: 20 },
  datePickerDone: {
    marginTop: 8, alignItems: 'center',
    backgroundColor: '#E50914', borderRadius: 12, paddingVertical: 12,
  },
  datePickerDoneText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  avatarTabs: { flexDirection: 'row', backgroundColor: '#1c1c1c', borderRadius: 12, padding: 4, marginBottom: 16 },
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
  photoBtn: { flex: 1, backgroundColor: '#1c1c1c', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  photoBtnIcon: { fontSize: 36, marginBottom: 8 },
  photoBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  removeAvatarBtn: { marginTop: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333', borderRadius: 12 },
  removeAvatarText: { color: '#888', fontSize: 14 },
});
