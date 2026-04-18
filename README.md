# 🎬 CineMatch

Film zevkine göre arkadaş bulan mobil uygulama.

---

## Kurulum

### Gereksinimler
- Node.js 18+
- PostgreSQL veritabanı (Supabase ücretsiz kullanılabilir)
- TMDB API Key ([themoviedb.org](https://www.themoviedb.org/settings/api))
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
```
DATABASE_URL="postgresql://kullanici:sifre@host:5432/cinematch"
DIRECT_URL="postgresql://kullanici:sifre@host:5432/cinematch"
JWT_SECRET="gizli_bir_anahtar_yaz"
TMDB_API_KEY="tmdb_api_keyin"
PORT=3000
```

> Supabase kullanıyorsan DATABASE_URL için "Transaction" modunu, DIRECT_URL için "Session" modunu kullan.

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

`mobile/src/services/api.js` dosyasında API_URL'yi kendi backend adresinle güncelle:
```js
const API_URL = 'http://SENIN_IP_ADRESIN:3000/api';
// ya da ngrok kullanıyorsan:
const API_URL = 'https://xxxx.ngrok-free.app/api';
```

Expo'yu başlat:
```bash
npx expo start
```

Telefonda Expo Go uygulamasını aç ve QR kodu tara.

---

## Teknolojiler

| Katman | Teknoloji |
|---|---|
| Mobile | React Native + Expo |
| Backend | Node.js + Express |
| Veritabanı | PostgreSQL + Prisma ORM |
| Auth | JWT |
| Film API | TMDB |
