import React, { useState } from 'react';
import {
  View, Text, Image, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Switch, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Feather } from '@expo/vector-icons';
import api from '../services/api';
import { normalizeImageUri } from '../services/imageUri';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext'; // Tema eklendi
import { Radii } from '../theme';

const ageToDate = (age) => {
  if (!age) return new Date();
  const d = new Date(); d.setFullYear(d.getFullYear() - parseInt(age)); return d;
};
const dateToAge = (date) => {
  const today = new Date(); let age = today.getFullYear() - date.getFullYear();
  const m = today.getMonth() - date.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age--; return age;
};

export default function EditProfileScreen({ navigation }) {
  const { user, setUser } = useAuth();
  const { theme, isDark } = useTheme(); // Temayı dinliyoruz

  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [age, setAge] = useState(user?.age ? String(user.age) : '');
  const [showAge, setShowAge] = useState(user?.showAge || false);
  const [birthDate, setBirthDate] = useState(ageToDate(user?.age));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [avatarType, setAvatarType] = useState(user?.avatarType || null);
  const [avatarPreviewUri, setAvatarPreviewUri] = useState(normalizeImageUri(user?.avatar));
  const [profilePhotos, setProfilePhotos] = useState(() => {
    const photos = Array.isArray(user?.profilePhotos) ? user.profilePhotos.filter(Boolean) : [];
    const merged = avatar ? [avatar, ...photos.filter((photo) => photo !== avatar)] : photos;
    return merged.slice(0, 3);
  });
  const [selectedPhotoSlot, setSelectedPhotoSlot] = useState(0);
  const [swapPhotoSlot, setSwapPhotoSlot] = useState(null);

  const [tab, setTab] = useState('info');
  const avatarTab = 'photo';
  const setAvatarTab = () => {};
  const [saving, setSaving] = useState(false);

  const styles = createStyles(theme, isDark);

  const handleBack = () => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs');

  const imagePickerOptions = {
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
    base64: false,
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('İzin gerekli', 'Galeri izni ver'); return; }
    const result = await ImagePicker.launchImageLibraryAsync(imagePickerOptions);
    if (!result.canceled && result.assets[0]) await uploadAvatar(result.assets[0]);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('İzin gerekli', 'Kamera izni ver'); return; }
    const result = await ImagePicker.launchCameraAsync(imagePickerOptions);
    if (!result.canceled && result.assets[0]) await uploadAvatar(result.assets[0]);
  };

  const uploadAvatar = async (asset) => {
    if (!asset?.uri) { Alert.alert('Hata', 'Görsel yüklenemedi'); return; }
    setSaving(true);
    try {
      const normalized = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 900 } }],
        {
          compress: 0.82,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );
      if (!normalized.base64) { Alert.alert('Hata', 'Görsel yüklenemedi'); return; }
      const mimeType = 'image/jpeg';
      const res = await api.post('/upload/avatar', { base64: `data:${mimeType};base64,${normalized.base64}`, mimeType });
      const uploadedUrl = normalizeImageUri(res.data.url);
      const nextPhotos = [...profilePhotos];
      nextPhotos[selectedPhotoSlot] = uploadedUrl;
      const compactPhotos = nextPhotos.filter(Boolean).slice(0, 3);
      const nextAvatar = compactPhotos[0] || uploadedUrl;
      setProfilePhotos(compactPhotos);
      setAvatar(nextAvatar); setAvatarPreviewUri(selectedPhotoSlot === 0 ? normalized.uri : normalizeImageUri(nextAvatar)); setAvatarType('upload');
      const profileRes = await api.put('/users/profile', { avatar: nextAvatar, avatarType: 'upload', profilePhotos: compactPhotos });
      setUser((prev) => ({ ...prev, ...profileRes.data }));
    } catch (err) {
      const msg = err.response?.data?.error || 'Yükleme başarısız.';
      Alert.alert('Hata', msg);
    }
    finally { setSaving(false); }
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Hata', 'Ad boş bırakılamaz'); return; }
    const computedAge = age ? parseInt(age) : null;
    if (computedAge !== null && (computedAge < 18 || computedAge > 120)) { Alert.alert('Hata', 'Geçersiz yaş'); return; }
    setSaving(true);
    try {
      const compactPhotos = profilePhotos.filter(Boolean).slice(0, 3);
      const res = await api.put('/users/profile', { name: name.trim(), username: username.trim() || null, bio: bio.trim() || null, avatar, avatarType, profilePhotos: compactPhotos, age: age ? parseInt(age) : null, showAge });
      const profileRes = await api.get('/users/profile');
      setUser((prev) => ({ ...prev, ...res.data, ...profileRes.data })); handleBack();
    } catch (err) { Alert.alert('Hata', err.response?.data?.error || 'Hata oluştu'); }
    finally { setSaving(false); }
  };

  const renderAvatar = () => (
    <View style={styles.avatarPreviewWrap}>
      {avatarPreviewUri ? <Image source={{ uri: avatarPreviewUri }} style={styles.avatarPreview} /> : <View style={styles.avatarPlaceholder}><Text style={styles.avatarPlaceholderText}>{name?.[0]?.toUpperCase() || '?'}</Text></View>}
    </View>
  );

  const applyPhotoOrder = (nextPhotos, nextSelectedSlot = selectedPhotoSlot) => {
    const compactPhotos = nextPhotos.filter(Boolean).slice(0, 3);
    const nextAvatar = compactPhotos[0] || null;
    setProfilePhotos(compactPhotos);
    setSelectedPhotoSlot(Math.max(0, Math.min(nextSelectedSlot, 2)));
    setAvatar(nextAvatar);
    setAvatarType(nextAvatar ? 'upload' : null);
    setAvatarPreviewUri(normalizeImageUri(nextAvatar));
  };

  const handlePhotoSlotPress = (slot) => {
    if (swapPhotoSlot === null) {
      setSelectedPhotoSlot(slot);
      return;
    }

    if (swapPhotoSlot === slot) {
      setSwapPhotoSlot(null);
      setSelectedPhotoSlot(slot);
      return;
    }

    const nextPhotos = [...profilePhotos];
    const sourcePhoto = nextPhotos[swapPhotoSlot];
    nextPhotos[swapPhotoSlot] = nextPhotos[slot];
    nextPhotos[slot] = sourcePhoto;
    applyPhotoOrder(nextPhotos, slot);
    setSwapPhotoSlot(null);
  };

  const removePhotoSlot = (index) => {
    const nextPhotos = profilePhotos.filter((_, photoIndex) => photoIndex !== index).slice(0, 3);
    const nextAvatar = nextPhotos[0] || null;
    setProfilePhotos(nextPhotos);
    setSelectedPhotoSlot(Math.max(0, Math.min(index, 2)));
    setSwapPhotoSlot(null);
    setAvatar(nextAvatar);
    setAvatarType(nextAvatar ? 'upload' : null);
    setAvatarPreviewUri(normalizeImageUri(nextAvatar));
  };

  return (
    <View style={styles.container}>
      {isDark && <><View style={styles.glowRed} /><View style={styles.glowPurple} /></>}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={handleBack}><Feather name="chevron-left" size={24} color={theme.textPrimary} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Profili Düzenle</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtnWrap}>
          {saving ? <ActivityIndicator color={theme.purple} size="small" /> : <Text style={styles.saveBtn}>Kaydet</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.tabsWrap}>
        <View style={styles.tabs}>
          {['info', 'avatar'].map((t) => (
            <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'info' ? 'Kişisel Bilgiler' : 'Profil Fotoğrafı'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {tab === 'info' ? (
          <View style={styles.section}>
            <View style={styles.avatarCenter}>
              {renderAvatar()}
              <TouchableOpacity style={styles.changeAvatarBadge} onPress={() => setTab('avatar')}>
                <Feather name="camera" size={14} color="#fff" /><Text style={styles.changeAvatarText}>Düzenle</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Ad Soyad</Text>
              <View style={styles.inputWrap}>
                <Feather name="user" size={18} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Adınız" placeholderTextColor={theme.textMuted} />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Kullanıcı Adı</Text>
              <View style={styles.inputWrap}>
                <Feather name="at-sign" size={18} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput style={styles.input} value={username} onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_.]/g, ''))} placeholder="kullanici_adi" placeholderTextColor={theme.textMuted} autoCapitalize="none" />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Hakkımda</Text>
              <View style={[styles.inputWrap, styles.bioInputWrap]}>
                <TextInput style={[styles.input, styles.bioInput]} value={bio} onChangeText={setBio} placeholder="Kendinden bahset..." placeholderTextColor={theme.textMuted} multiline />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Doğum Tarihi</Text>
              <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
                <Feather name="calendar" size={18} color={theme.textSecondary} style={styles.inputIcon} />
                <Text style={[styles.datePickerText, !age && { color: theme.textMuted }]}>{age ? `${birthDate.toLocaleDateString('tr-TR')}  ·  ${age} yaş` : 'Doğum tarihi seç'}</Text>
                <Feather name="chevron-right" size={20} color={theme.textMuted} />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker value={birthDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 18))} minimumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 120))}
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === 'android') setShowDatePicker(false);
                    if (selectedDate) { setBirthDate(selectedDate); setAge(String(dateToAge(selectedDate))); }
                  }}
                />
              )}
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}><Text style={styles.switchLabel}>Yaşı profilimde göster</Text><Text style={styles.switchSubLabel}>Kimseye görünmez</Text></View>
              <Switch value={showAge} onValueChange={setShowAge} trackColor={{ false: theme.glassStrong, true: theme.purple }} thumbColor="#fff" />
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.avatarCenter}>{renderAvatar()}</View>
            <View style={styles.avatarTabs}>
              {['photo'].map((t) => (
                <TouchableOpacity key={t} style={[styles.avatarTab, avatarTab === t && styles.avatarTabActive]} onPress={() => setAvatarTab(t)}>
                  <Feather name={t === 'character' ? 'users' : 'camera'} size={16} color={avatarTab === t ? '#fff' : theme.textMuted} />
                  <Text style={[styles.avatarTabText, avatarTab === t && styles.avatarTabTextActive]}>{t === 'character' ? 'Karakter' : 'Fotoğraf'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {avatarTab === 'character' ? (
              <View>
                <View style={styles.searchRow}>
                  <View style={[styles.inputWrap, { flex: 1, marginBottom: 0 }]}><Feather name="search" size={18} color={theme.textSecondary} style={styles.inputIcon} /><TextInput style={styles.input} value={charQuery} onChangeText={setCharQuery} placeholder="Jon Snow..." placeholderTextColor={theme.textMuted} onSubmitEditing={searchCharacters} /></View>
                  <TouchableOpacity style={styles.searchBtn} onPress={searchCharacters}><Text style={styles.searchBtnText}>Ara</Text></TouchableOpacity>
                </View>
                {charSearching && <ActivityIndicator color={theme.purple} style={{ marginTop: 24 }} />}
                <FlatList data={charResults} keyExtractor={(item) => item.id.toString()} numColumns={3} scrollEnabled={false} style={{ marginTop: 20 }} columnWrapperStyle={{ gap: 10 }} renderItem={({ item }) => (
                  <TouchableOpacity style={styles.charCard} onPress={() => selectCharacter(item)}><Image source={{ uri: item.photo }} style={styles.charPhoto} /><Text style={styles.charName} numberOfLines={1}>{item.name}</Text></TouchableOpacity>
                )} />
              </View>
            ) : (
              <View>
                <View style={styles.photoSlots}>
                  {[0, 1, 2].map((slot) => {
                    const photoUri = normalizeImageUri(profilePhotos[slot]);
                    const isSelected = selectedPhotoSlot === slot;
                    const isSwapSource = swapPhotoSlot === slot;
                    return (
                      <TouchableOpacity
                        key={slot}
                        style={[styles.photoSlot, isSelected && styles.photoSlotActive, isSwapSource && styles.photoSlotSwapSource]}
                        onPress={() => handlePhotoSlotPress(slot)}
                        onLongPress={() => {
                          if (photoUri) {
                            setSwapPhotoSlot(slot);
                            setSelectedPhotoSlot(slot);
                          }
                        }}
                        delayLongPress={260}
                        activeOpacity={0.86}
                      >
                        {photoUri ? (
                          <>
                            <Image source={{ uri: photoUri }} style={styles.photoSlotImage} />
                            <View style={styles.photoSlotIndex}><Text style={styles.photoSlotIndexText}>{slot + 1}</Text></View>
                            {isSwapSource && (
                              <View style={styles.photoSlotMoveBadge}>
                                <Feather name="move" size={14} color="#fff" />
                              </View>
                            )}
                            <TouchableOpacity style={styles.photoSlotRemove} onPress={() => removePhotoSlot(slot)}>
                              <Feather name="x" size={14} color="#fff" />
                            </TouchableOpacity>
                          </>
                        ) : (
                          <View style={styles.photoSlotEmpty}>
                            <Feather name="plus" size={22} color={theme.textMuted} />
                            <Text style={styles.photoSlotEmptyText}>{slot + 1}. Foto</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={styles.photoOptions}>
                  <TouchableOpacity style={styles.photoBtn} onPress={pickFromGallery}><View style={styles.photoBtnIconWrap}><Feather name="image" size={28} color={theme.textSecondary} /></View><Text style={styles.photoBtnText}>Galeriden Seç</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}><View style={styles.photoBtnIconWrap}><Feather name="camera" size={28} color={theme.textSecondary} /></View><Text style={styles.photoBtnText}>Fotoğraf Çek</Text></TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  glowRed: { position: 'absolute', top: -100, right: -50, width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(255,59,85,0.08)' },
  glowPurple: { position: 'absolute', top: 200, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(155,92,255,0.06)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16 },
  iconBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: '800' },
  saveBtnWrap: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  saveBtn: { color: theme.purple, fontSize: 16, fontWeight: '700' },
  tabsWrap: { paddingHorizontal: 20, marginBottom: 20 },
  tabs: { flexDirection: 'row', backgroundColor: theme.glass, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: theme.borderSoft },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: theme.glassStrong },
  tabText: { color: theme.textMuted, fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: theme.textPrimary },
  section: { paddingHorizontal: 20 },
  avatarCenter: { alignItems: 'center', marginBottom: 30, position: 'relative' },
  avatarPreviewWrap: { width: 110, height: 110, borderRadius: 55, backgroundColor: theme.glass, borderWidth: 2, borderColor: theme.purpleBorder, justifyContent: 'center', alignItems: 'center' },
  avatarPreview: { width: '100%', height: '100%', borderRadius: 55 },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  avatarPlaceholderText: { color: '#fff', fontSize: 40, fontWeight: '900' },
  changeAvatarBadge: { position: 'absolute', bottom: -10, backgroundColor: theme.purple, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 2, borderColor: theme.bg },
  changeAvatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  formGroup: { marginBottom: 18 },
  label: { color: theme.textSecondary, fontSize: 13, fontWeight: '700', marginBottom: 8, marginLeft: 4 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.border, borderRadius: 14, paddingHorizontal: 14 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: theme.textPrimary, fontSize: 15, paddingVertical: 14 },
  bioInputWrap: { alignItems: 'flex-start', paddingVertical: 14 },
  bioInput: { paddingVertical: 0, height: 80, textAlignVertical: 'top' },
  datePickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14 },
  datePickerText: { flex: 1, color: theme.textPrimary, fontSize: 15 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, backgroundColor: theme.glass, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.border },
  switchLabel: { color: theme.textPrimary, fontSize: 15, fontWeight: '600' },
  switchSubLabel: { color: theme.textMuted, fontSize: 12, marginTop: 4 },
  avatarTabs: { display: 'none' },
  avatarTab: { flex: 1, flexDirection: 'row', gap: 8, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  avatarTabActive: { backgroundColor: theme.glassStrong },
  avatarTabText: { color: theme.textMuted, fontWeight: '600', fontSize: 14 },
  avatarTabTextActive: { color: theme.textPrimary },
  searchRow: { flexDirection: 'row', gap: 10 },
  searchBtn: { backgroundColor: theme.purple, borderRadius: 14, paddingHorizontal: 20, justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontWeight: '700' },
  charCard: { flex: 1, alignItems: 'center', marginBottom: 16 },
  charPhoto: { width: '100%', aspectRatio: 1, borderRadius: 14, marginBottom: 8, backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.border },
  charName: { color: theme.textPrimary, fontSize: 12, fontWeight: '600' },
  photoSlots: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  photoSlot: { flex: 1, aspectRatio: 0.78, borderRadius: 14, overflow: 'hidden', backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.border },
  photoSlotActive: { borderColor: theme.purple, borderWidth: 2 },
  photoSlotSwapSource: { borderColor: theme.gold || '#f8c84a', borderWidth: 2 },
  photoSlotImage: { width: '100%', height: '100%' },
  photoSlotEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  photoSlotEmptyText: { color: theme.textMuted, fontSize: 12, fontWeight: '700' },
  photoSlotIndex: { position: 'absolute', left: 8, top: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  photoSlotIndexText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  photoSlotMoveBadge: { position: 'absolute', left: 8, bottom: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'center', alignItems: 'center' },
  photoSlotRemove: { position: 'absolute', right: 8, top: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'center', alignItems: 'center' },
  photoOptions: { flexDirection: 'row', gap: 16, marginTop: 10 },
  photoBtn: { flex: 1, backgroundColor: theme.glass, borderRadius: 16, paddingVertical: 24, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  photoBtnIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.glassStrong, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  photoBtnText: { color: theme.textPrimary, fontWeight: '600', fontSize: 14 },
});
