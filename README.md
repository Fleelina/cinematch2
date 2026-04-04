# CineMatch

Film zevkine göre arkadaş bulan mobil uygulama.

## Kurulum

### Backend
```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma generate
npm run dev
```

### Mobile
```bash
cd mobile
npm install
npx expo start
```

## Gereksinimler
- Node.js 18+
- Expo Go (telefon)
- TMDB API Key (.env dosyasına ekle)

## .env (backend)
```
DATABASE_URL="file:./prisma/cinematch.db"
JWT_SECRET="your_secret"
TMDB_API_KEY="your_tmdb_key"
PORT=3000
```
