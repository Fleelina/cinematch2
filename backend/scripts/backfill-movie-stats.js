// Mevcut Movie kayitlarinda runtime/genres/director/cast alanlari bos olanlari
// TMDB'den cekip gunceller. Tek seferlik calistirilir.
// Kullanim: node scripts/backfill-movie-stats.js

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

const tmdbClient = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  headers: { Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}` },
  params: { language: 'en-US' },
  timeout: 10000,
});

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function getMovieDetail(tmdbId) {
  const [detailRes, creditsRes] = await Promise.all([
    tmdbClient.get(`/movie/${tmdbId}`),
    tmdbClient.get(`/movie/${tmdbId}/credits`),
  ]);

  const movie = detailRes.data;
  const credits = creditsRes.data;
  const director = credits.crew?.find((p) => p.job === 'Director');
  const cast = credits.cast?.slice(0, 10).map((p) => p.name) ?? [];

  return {
    runtime: movie.runtime || null,
    genres: movie.genres?.map((g) => g.name) ?? [],
    director: director?.name ?? null,
    cast,
  };
}

async function main() {
  // runtime null olan filmleri bul (henuz doldurulmamis)
  const movies = await prisma.movie.findMany({
    where: { runtime: null },
    select: { id: true, tmdbId: true, title: true },
  });

  console.log(`Toplam ${movies.length} film doldurulacak.`);

  let success = 0;
  let failed = 0;

  for (const movie of movies) {
    try {
      const detail = await getMovieDetail(movie.tmdbId);

      await prisma.movie.update({
        where: { id: movie.id },
        data: {
          runtime: detail.runtime,
          genres: detail.genres.length ? JSON.stringify(detail.genres) : null,
          director: detail.director,
          cast: detail.cast.length ? JSON.stringify(detail.cast) : null,
        },
      });

      success++;
      console.log(`[OK] ${movie.title} (${movie.tmdbId})`);
    } catch (err) {
      failed++;
      console.error(`[FAIL] ${movie.title} (${movie.tmdbId}):`, err.message);
    }

    // TMDB rate limit: 40 istek/saniye, guvenli olmasi icin 100ms bekle
    await sleep(100);
  }

  console.log(`\nTamamlandi. Basarili: ${success}, Basarisiz: ${failed}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
