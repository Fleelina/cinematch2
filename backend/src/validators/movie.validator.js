const { z } = require('zod');

// Film aramasi query string uzerinden tek `query` alani bekler.
const searchMovies = z.object({
  query: z.object({
    query: z.string({ required_error: 'Arama terimi gerekli' }).min(1, 'Arama terimi gerekli'),
  }),
});

// TMDB tabanli endpoint'lerde kullanilan ortak path param'i.
const tmdbIdParam = z.object({
  params: z.object({
    tmdbId: z.string({ required_error: 'tmdbId gerekli' }),
  }),
});

// Local movie id kullanan endpoint'ler icin path param'i.
const movieIdParam = z.object({
  params: z.object({
    movieId: z.string({ required_error: 'movieId gerekli' }),
  }),
});

// Profile film ekleme body’si minimum film metadata’sini zorunlu tutar.
const addMovie = z.object({
  body: z.object({
    tmdbId: z.number({ required_error: 'tmdbId gerekli' }),
    title: z.string({ required_error: 'title gerekli' }).min(1),
    poster: z.string().optional(),
    year: z.union([z.number(), z.string()]).optional(),
  }),
});

// Puanlama akisinda rating 1-10 araliginda tam sayi olmalidir.
const rateMovie = z.object({
  params: z.object({
    tmdbId: z.string({ required_error: 'tmdbId gerekli' }),
  }),
  body: z.object({
    rating: z
      .number({ required_error: 'Puan gerekli', invalid_type_error: 'Puan sayi olmali' })
      .int('Puan tam sayi olmali')
      .min(1, 'Puan en az 1 olmali')
      .max(10, 'Puan en fazla 10 olabilir'),
  }),
});

// Watchlist ekleme body’si profile ekleme ile ayni cekirdek alanlari kullanir.
const addWatchlist = z.object({
  body: z.object({
    tmdbId: z.number({ required_error: 'tmdbId gerekli' }),
    title: z.string({ required_error: 'title gerekli' }).min(1),
    poster: z.string().optional(),
    year: z.union([z.number(), z.string()]).optional(),
  }),
});

// Ceviri endpoint'i bos metin kabul etmez.
const translateText = z.object({
  body: z.object({
    text: z.string({ required_error: 'Metin gerekli' }).min(1, 'Metin gerekli'),
  }),
});

module.exports = {
  searchMovies,
  tmdbIdParam,
  movieIdParam,
  addMovie,
  rateMovie,
  addWatchlist,
  translateText,
};
