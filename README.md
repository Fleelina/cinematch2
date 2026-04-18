# 🎬 CineMatch

Film zevkine göre arkadaş bulan mobil uygulama.

---

## Özellikler

- 🎬 Film zevkine göre kullanıcı eşleştirme
- 🃏 Swipe ile film önerileri (TMDB)
- 💬 Gerçek zamanlı mesajlaşma (Socket.io)
- 📋 Sonra izle listesi
- 🎭 Karakter/oyuncu avatarı (TMDB)
- 🖼 Profil fotoğrafı (AWS S3)
- ⭐ CineMatch puan sistemi

---

## Teknolojiler

| Katman | Teknoloji |
|---|---|
| Mobile | React Native + Expo |
| Backend | Node.js + Express |
| Realtime | Socket.io |
| Veritabanı | PostgreSQL + Prisma ORM |
| Depolama | AWS S3 (avatar/fotoğraf) |
| Auth | JWT |
| Film API | TMDB |

---

## Kurulum

### Gereksinimler
- Node.js 18+
- PostgreSQL veritabanı (veya Supabase)
- TMDB API Key → [themoviedb.org](https://www.themoviedb.org/settings/api)
- AWS S3 bucket (avatar yüklemek için)
- Expo Go (telefon)

---

### 1. Repoyu klonla
```bash
git clone https://github.com/Fleelina/cinematch.git
cd cinematch
```

---

### 2. Backend kurulumu

```bash
cd backend
npm install
```

`backend/` klasöründe `.env` dosyası oluştur:
```env
DATABASE_URL="postgresql://kullanici:sifre@host:5432/cinematch"
JWT_SECRET="gizli_bir_anahtar_yaz"
TMDB_API_KEY="tmdb_api_keyin"
PORT=3000

# AWS S3
AWS_ACCESS_KEY_ID="aws_access_key"
AWS_SECRET_ACCESS_KEY="aws_secret_key"
AWS_REGION="eu-central-1"
AWS_BUCKET_NAME="cinematch-avatars"
```

Veritabanını oluştur:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

Backend'i başlat:
```bash
npm run dev
```

---

### 3. Mobile kurulumu

```bash
cd mobile
npm install
```

`mobile/src/services/api.js` dosyasında API_URL'yi güncelle:
```js
const API_URL = 'http://SENIN_IP_ADRESIN:3000/api';
```

`mobile/src/services/socket.js` dosyasında SOCKET_URL'yi güncelle:
```js
const SOCKET_URL = 'http://SENIN_IP_ADRESIN:3000';
```

> ngrok kullanıyorsan her ikisini de ngrok URL'inle güncelle.

Expo'yu başlat:
```bash
npx expo start
```

Telefonda Expo Go uygulamasını aç ve QR kodu tara.

---

## Socket.io Events

| Event | Yön | Açıklama |
|---|---|---|
| `join_room` | Client → Server | Belirli match odasına katıl |
| `send_message` | Client → Server | Mesaj gönder |
| `new_message` | Server → Client | Yeni mesaj bildirimi |
| `typing` | Client → Server | Yazıyor bildirimi gönder |
| `stop_typing` | Client → Server | Yazıyor bildirimini durdur |
| `user_typing` | Server → Client | Karşı taraf yazıyor |
| `user_stop_typing` | Server → Client | Karşı taraf yazmayı durdurdu |

---

## Notlar

- Avatar fotoğrafları AWS S3'te saklanır, veritabanında sadece URL tutulur
- TMDB karakter/oyuncu fotoğrafları doğrudan URL olarak saklanır
- Mesajlaşma HTTP polling değil Socket.io ile gerçek zamanlı çalışır
