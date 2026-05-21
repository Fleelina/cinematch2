# 🎬 CineMatch

**Film zevkine göre insanları buluşturan mobil uygulama.**  
TMDB entegrasyonu, gerçek zamanlı mesajlaşma ve akıllı eşleştirme algoritmasıyla.

---

## Özellikler

- 🃏 **Swipe eşleştirme** — Tinder benzeri kart sistemiyle kullanıcı keşfi
- 🎬 **Film bazlı uyum skoru** — Ortak film zevkine göre % uyum hesaplama
- 🔍 **Keşfet** — TMDB'den trend, klasik ve kişiselleştirilmiş film önerileri
- 📖 **Film Listem** — İzlediğin filmleri kaydet, tüm kategorileri gez
- 💬 **Gerçek zamanlı mesajlaşma** — Socket.io ile anlık chat, yazıyor bildirimi
- ❤️ **CineMatch Puanı** — Topluluk oylarıyla oluşan özgün film sıralama sistemi
- 📊 **İstatistikler** — Film zevkine dair kişisel istatistik ekranı
- 🎭 **Oyuncu Profilleri** — TMDB'den oyuncu detayları ve filmografisi
- 🖼️ **Fotoğraf yükleme** — Cloudflare R2 destekli profil fotoğrafı
- 📋 **İzleme Listesi** — Sonra izlemek istediğin filmleri kaydet
- 🚫 **Kullanıcı engelleme** — Engellenen kullanıcılar keşiften çıkar

---

## Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Mobile | React Native + Expo |
| Backend | Node.js + Express |
| Realtime | Socket.io |
| Veritabanı | SQLite / PostgreSQL + Prisma ORM |
| Depolama | Cloudflare R2 |
| Auth | JWT + bcrypt |
| Film Verisi | TMDB API |
| Validation | Zod |

---

## Başlarken

### Gereksinimler

- Node.js 18+
- PostgreSQL (ya da Supabase) — geliştirme için SQLite de çalışır
- [TMDB API anahtarı](https://www.themoviedb.org/settings/api)
- Cloudflare R2 bucket (fotoğraf yükleme için)
- Expo Go uygulaması (iOS / Android)

---

### 1. Repoyu klonla

```bash
git clone https://github.com/Fleelina/cinematch.git
cd cinematch
```

---

### 2. Backend

```bash
cd backend
npm install
```

`backend/.env` dosyası oluştur:

```env
DATABASE_URL="postgresql://kullanici:sifre@host:5432/cinematch"
DIRECT_URL="postgresql://kullanici:sifre@host:5432/cinematch"
JWT_SECRET="buraya_guclu_bir_secret_yaz"
TMDB_API_KEY="tmdb_api_keyin"
TMDB_READ_ACCESS_TOKEN="tmdb_read_access_tokenin"
PORT=3000
NODE_ENV=development

# Cloudflare R2
R2_ACCOUNT_ID="r2_account_id"
R2_ACCESS_KEY_ID="r2_access_key"
R2_SECRET_ACCESS_KEY="r2_secret_key"
R2_BUCKET_NAME="bucket_adi"
R2_PUBLIC_URL="https://pub-xxx.r2.dev"
```

> Güçlü JWT secret üretmek için:
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```

Veritabanını hazırla:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

Backend'i başlat:

```bash
npm run dev
```

---

### 3. Mobile

```bash
cd mobile
npm install
```

`mobile/.env` dosyasını oluştur:

```env
API_URL=http://192.168.x.x:3000/api
```

> Emülatör kullanıyorsan `http://10.0.2.2:3000/api`, fiziksel cihaz için kendi yerel IP adresini yaz.

Expo'yu başlat:

```bash
npx expo start
```

Telefonda **Expo Go**'yu aç ve QR kodu tara.

---

## Proje Yapısı

```
cinematch/
├── backend/
│   ├── src/
│   │   ├── controllers/     # İş mantığı
│   │   ├── routes/          # API endpoint tanımları
│   │   ├── services/        # TMDB, kullanıcı, film servisleri
│   │   ├── middleware/      # Auth, validation, hata yönetimi
│   │   ├── validators/      # Zod şemaları
│   │   ├── socket/          # Socket.io event handler'ları
│   │   └── utils/           # Cache ve yardımcılar
│   └── prisma/              # Veritabanı şeması ve migration'lar
└── mobile/
    └── src/
        ├── screens/         # Tüm ekranlar
        ├── navigation/      # Stack + Tab navigator
        ├── services/        # API client, socket, token
        ├── context/         # Global state (Auth, Theme)
        └── components/      # Paylaşılan bileşenler
```

---

## API Endpoint'leri

### Auth
| Method | Endpoint | Açıklama |
|---|---|---|
| POST | `/api/auth/register` | Kayıt |
| POST | `/api/auth/login` | Giriş |

### Kullanıcı
| Method | Endpoint | Açıklama |
|---|---|---|
| GET | `/api/users/profile` | Kendi profilini getir |
| PUT | `/api/users/profile` | Profil güncelle |
| GET | `/api/users/discover` | Eşleştirme için kullanıcı keşfi |
| GET | `/api/users/:id/profile` | Başka kullanıcının profili |

### Filmler
| Method | Endpoint | Açıklama |
|---|---|---|
| GET | `/api/movies/my` | Kendi film listesi |
| POST | `/api/movies/add` | Film ekle |
| GET | `/api/movies/trending` | Trend filmler |
| GET | `/api/movies/suggestions` | Kişiselleştirilmiş öneriler |
| GET | `/api/movies/top-rated-cinematch` | CineMatch sıralaması |
| GET | `/api/movies/classics` | Klasikler |
| GET | `/api/movies/search?q=...` | Film ara |

### Eşleştirme
| Method | Endpoint | Açıklama |
|---|---|---|
| POST | `/api/matches/like/:id` | Beğen |
| POST | `/api/matches/dislike/:id` | Atla |
| DELETE | `/api/matches/undo/:id` | Geri al |
| GET | `/api/matches` | Eşleşme listesi |

### Mesajlaşma
| Method | Endpoint | Açıklama |
|---|---|---|
| GET | `/api/messages/:matchId` | Mesajları getir |
| POST | `/api/messages/:matchId` | Mesaj gönder |

### Diğer
| Method | Endpoint | Açıklama |
|---|---|---|
| GET | `/api/person/:id` | Oyuncu detayı (TMDB) |
| POST | `/api/upload` | Profil fotoğrafı yükle |

---

## Socket.io Events

| Event | Yön | Açıklama |
|---|---|---|
| `join_room` | Client → Server | Match odasına katıl |
| `send_message` | Client → Server | Mesaj gönder |
| `new_message` | Server → Client | Yeni mesaj |
| `typing` | Client → Server | Yazıyor bildirimi |
| `stop_typing` | Client → Server | Yazmayı durdur |
| `user_typing` | Server → Client | Karşı taraf yazıyor |
| `user_stop_typing` | Server → Client | Karşı taraf durdu |

---

## Güvenlik

- `.env` dosyaları asla commit edilmez
- JWT secret minimum 48 byte kriptografik rastgele değer olmalı
- Şifreler bcrypt ile hash'lenir (salt rounds: 12)
- Fotoğraflar Cloudflare R2'de saklanır, veritabanında yalnızca URL tutulur
- Tüm input'lar Zod şemalarıyla validate edilir

---

## Lisans

MIT
