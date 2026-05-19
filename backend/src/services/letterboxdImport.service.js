const unzipper = require('unzipper');
const { parse } = require('csv-parse/sync');
const prisma = require('../prisma');
const tmdbService = require('./tmdb.service');
const cache = require('../utils/cache');
const { ApiError } = require('../middleware/errorHandler');

const REQUIRED_FILES = ['watched.csv', 'ratings.csv', 'watchlist.csv'];
const MAX_ROWS = 10000;
const MAX_CONCURRENT_TMDB_MATCHES = 4;
const MAX_CONCURRENT_DB_IMPORTS = 4;
const MATCH_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;

const normalizeTitle = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^(the|a|an)\s+/, '');

const parseYear = (value) => {
  const year = parseInt(value, 10);
  return Number.isInteger(year) && year > 1800 ? year : null;
};

const parseLetterboxdRating = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const rating = Number.parseFloat(String(value).replace(',', '.'));
  if (!Number.isFinite(rating) || rating <= 0) return null;
  return Math.max(1, Math.min(10, Math.round(rating * 2)));
};

const readCsv = (buffer) =>
  parse(buffer, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });

const findCsvEntry = (entries, fileName) =>
  entries.find(
    (entry) =>
      (!entry.type || entry.type === 'File') &&
      entry.path.toLowerCase().split(/[\\/]/).pop() === fileName
  ) || null;

const mapLimit = async (items, limit, worker) => {
  const results = new Array(items.length);
  let nextIndex = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(runners);
  return results;
};

const mergeRows = (records, rows, source) => {
  for (const row of rows) {
    const title = row.Name?.trim();
    const year = parseYear(row.Year);
    if (!title) continue;

    const key = `${normalizeTitle(title)}:${year || 'unknown'}`;
    const current = records.get(key) || {
      title,
      year,
      watched: false,
      watchlist: false,
      rating: null,
    };

    if (source === 'watched') current.watched = true;
    if (source === 'watchlist') current.watchlist = true;
    if (source === 'ratings') {
      current.watched = true;
      current.rating = parseLetterboxdRating(row.Rating);
    }

    records.set(key, current);
  }
};

const matchMovie = async (record) => {
  const cacheKey = `letterboxd_match:${normalizeTitle(record.title)}:${record.year || 'unknown'}`;
  const cached = cache.get(cacheKey);
  if (cached && Object.prototype.hasOwnProperty.call(cached, 'match')) return cached.match;

  const match = await tmdbService.findBestMovieMatch(record.title, record.year);
  cache.set(cacheKey, { match }, MATCH_CACHE_TTL_SECONDS);
  return match;
};

const ensureMovie = (match) =>
  prisma.movie.upsert({
    where: { tmdbId: match.tmdbId },
    update: {
      title: match.title,
      poster: match.poster,
      year: match.year ? parseInt(match.year, 10) : null,
    },
    create: {
      tmdbId: match.tmdbId,
      title: match.title,
      poster: match.poster,
      year: match.year ? parseInt(match.year, 10) : null,
    },
  });

const importRecord = async (userId, record, match) => {
  const movie = await ensureMovie(match);
  let profileImported = false;
  let ratingImported = false;
  let watchlistImported = false;

  if (record.watched || record.rating) {
    await prisma.userMovie.upsert({
      where: { userId_movieId: { userId, movieId: movie.id } },
      update: {},
      create: { userId, movieId: movie.id },
    });
    profileImported = true;
  }

  if (record.rating) {
    await prisma.movieRating.upsert({
      where: { userId_movieId: { userId, movieId: movie.id } },
      update: { rating: record.rating },
      create: { userId, movieId: movie.id, rating: record.rating },
    });
    ratingImported = true;
  }

  if (record.watchlist) {
    await prisma.watchlist.upsert({
      where: { userId_tmdbId: { userId, tmdbId: match.tmdbId } },
      update: {},
      create: {
        userId,
        tmdbId: match.tmdbId,
        title: match.title,
        poster: match.poster,
        year: match.year ? parseInt(match.year, 10) : null,
      },
    });
    watchlistImported = true;
  }

  return { profileImported, ratingImported, watchlistImported };
};

const importFromZip = async (userId, zipBuffer) => {
  let directory;
  try {
    directory = await unzipper.Open.buffer(zipBuffer);
  } catch {
    throw new ApiError(400, 'ZIP dosyasi okunamadi');
  }

  const fileEntries = {
    watched: findCsvEntry(directory.files, 'watched.csv'),
    ratings: findCsvEntry(directory.files, 'ratings.csv'),
    watchlist: findCsvEntry(directory.files, 'watchlist.csv'),
  };

  const hasAnyExpectedFile = REQUIRED_FILES.some((fileName) =>
    Object.values(fileEntries).some((entry) => entry?.path.toLowerCase().endsWith(fileName))
  );

  if (!hasAnyExpectedFile) {
    throw new ApiError(400, 'Letterboxd CSV dosyalari ZIP icinde bulunamadi');
  }

  const [watchedRows, ratingRows, watchlistRows] = await Promise.all([
    fileEntries.watched ? fileEntries.watched.buffer().then(readCsv) : [],
    fileEntries.ratings ? fileEntries.ratings.buffer().then(readCsv) : [],
    fileEntries.watchlist ? fileEntries.watchlist.buffer().then(readCsv) : [],
  ]);

  const totalRows = watchedRows.length + ratingRows.length + watchlistRows.length;
  if (totalRows > MAX_ROWS) {
    throw new ApiError(400, `Letterboxd import en fazla ${MAX_ROWS} satir destekler`);
  }

  const records = new Map();
  mergeRows(records, watchedRows, 'watched');
  mergeRows(records, ratingRows, 'ratings');
  mergeRows(records, watchlistRows, 'watchlist');

  const uniqueRecords = [...records.values()];
  const matches = await mapLimit(uniqueRecords, MAX_CONCURRENT_TMDB_MATCHES, async (record) => {
    try {
      return await matchMovie(record);
    } catch (err) {
      console.warn('[letterboxd-import] TMDB match failed:', record.title, record.year, err.message);
      return null;
    }
  });

  const summary = {
    filmsFound: uniqueRecords.length,
    importedSuccessfully: 0,
    unmatchedFilms: 0,
    ratingsImported: 0,
    watchlistEntriesImported: 0,
    unmatched: [],
  };

  const importResults = await mapLimit(uniqueRecords, MAX_CONCURRENT_DB_IMPORTS, async (record, index) => {
    const match = matches[index];

    if (!match) {
      return {
        unmatched: { title: record.title, year: record.year, reason: 'No confident TMDB match' },
      };
    }

    const result = await importRecord(userId, record, match);
    return { result };
  });

  for (const item of importResults) {
    if (item.unmatched) {
      summary.unmatchedFilms += 1;
      if (summary.unmatched.length < 50) summary.unmatched.push(item.unmatched);
      continue;
    }

    const { result } = item;
    if (result.profileImported) summary.importedSuccessfully += 1;
    if (result.ratingImported) summary.ratingsImported += 1;
    if (result.watchlistImported) summary.watchlistEntriesImported += 1;
  }

  return summary;
};

module.exports = { importFromZip };
