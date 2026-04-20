const { z } = require('zod');

const searchMovies = z.object({
  query: z.object({
    query: z.string({ required_error: 'Arama terimi gerekli' }).min(1, 'Arama terimi gerekli'),
  }),
});

const tmdbIdParam = z.object({
  params: z.object({
    tmdbId: z.string({ required_error: 'tmdbId gerekli' }),
  }),
});

const movieIdParam = z.object({
  params: z.object({
    movieId: z.string({ required_error: 'movieId gerekli' }),
  }),
});

const addMovie = z.object({
  body: z.object({
    tmdbId: z.number({ required_error: 'tmdbId gerekli' }),
    title: z.string({ required_error: 'title gerekli' }).min(1),
    poster: z.string().optional(),
    year: z.union([z.number(), z.string()]).optional(),
  }),
});

const rateMovie = z.object({
  params: z.object({
    tmdbId: z.string({ required_error: 'tmdbId gerekli' }),
  }),
  body: z.object({
    rating: z.number({ required_error: 'Puan gerekli' }).min(1, 'Puan en az 1 olmalı').max(10, 'Puan en fazla 10 olabilir'),
  }),
});

const addWatchlist = z.object({
  body: z.object({
    tmdbId: z.number({ required_error: 'tmdbId gerekli' }),
    title: z.string({ required_error: 'title gerekli' }).min(1),
    poster: z.string().optional(),
    year: z.union([z.number(), z.string()]).optional(),
  }),
});

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
