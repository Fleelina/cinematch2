# 🎬 CineMatch

Film zevkine göre arkadaş bulan mobil uygulama.

---

## Özellikler

- 🎬 Film zevkine göre kullanıcı eşleştirme
- 🃏 Swipe ile film önerileri (TMDB)
- 💬 Gerçek zamanlı mesajlaşma (Socket.io)
- 📋 Sonra izle listesi
- 🎭 Karakter/oyuncu avatarı (TMDB)
- 🖼 Profil fotoğrafı (Cloudflare R2)
- ⭐ CineMatch puan sistemi

---

## Teknolojiler

| Katman | Teknoloji |
|---|---|
| Mobile | React Native + Expo |
| Backend | Node.js + Express |
| Realtime | Socket.io |
| Veritabanı | PostgreSQL + Prisma ORM |
| Depolama | Cloudflare R2 (avatar/fotoğraf) |
| Auth | JWT (bcrypt ile hash) |
| Film API | TMDB |

---

## Kurulum

### Gereksinimler
- Node.js 18+
- PostgreSQL veritabanı (Supabase önerilir)
- TMDB API Key → [themoviedb.org](https://www.themoviedb.org/settings/api)
- Cloudflare R2 bucket (avatar yüklemek için)
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
DIRECT_URL="postgresql://kullanici:sifre@host:5432/cinematch"
JWT_SECRET="buraya_guclu_bir_secret_yaz"
TMDB_API_KEY="tmdb_api_keyin"
PORT=3000
NODE_ENV=development

# Cloudflare R2
R2_ACCOUNT_ID="r2_account_id"
R2_ACCESS_KEY_ID="r2_access_key"
R2_SECRET_ACCESS_KEY="r2_secret_key"
R2_BUCKET_NAME="bucket_adi"
R2_PUBLIC_URL="https://pub-xxx.r2.dev"
```

> JWT_SECRET için güçlü bir değer üretmek için şunu çalıştır:
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```

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

`mobile/src/services/api.js` ve `mobile/src/services/socket.js` dosyalarındaki URL'leri kendi backend adresinle güncelle.

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

## Güvenlik Notları

- `.env` dosyası asla git'e eklenmez
- JWT secret en az 48 byte kriptografik rastgele değer olmalı
- Avatar fotoğrafları Cloudflare R2'de saklanır, veritabanında sadece URL tutulur
- Şifreler native bcrypt ile hash'lenir (salt rounds: 12)
