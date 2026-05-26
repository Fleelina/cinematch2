const prisma = require('../prisma');
const tmdbService = require('./tmdb.service');
const { ApiError } = require('../middleware/errorHandler');
const { randomUUID } = require('crypto');

const CATEGORIES = {
  tension: { label: 'Gerilim', mood: 'thrilling' },
  emotion: { label: 'Duygu', mood: 'emotional' },
  mindBending: { label: 'Zihin büken', mood: 'mind_bending' },
  pace: { label: 'Tempo', mood: 'feel_good' },
  atmosphere: { label: 'Atmosfer', mood: 'dark' },
};

const DAILY_QUESTIONS = [
  {
    id: 'tonight_energy',
    question: 'Bu gece filmden en çok ne almak istersin?',
    options: [
      { key: 'edge', label: 'Koltuğun ucunda kalmak', scores: { tension: 2, pace: 1 } },
      { key: 'heart', label: 'İçime dokunsun', scores: { emotion: 2, atmosphere: 1 } },
      { key: 'maze', label: 'Kafamı kurcalasın', scores: { mindBending: 2, atmosphere: 1 } },
    ],
  },
  {
    id: 'story_shape',
    question: 'Hikaye nasıl aksın?',
    options: [
      { key: 'fast', label: 'Hızlı ve enerjik', scores: { pace: 2, tension: 1 } },
      { key: 'slow', label: 'Yavaş yavaş içine çeksin', scores: { atmosphere: 2, emotion: 1 } },
      { key: 'puzzle', label: 'Parça parça birleşsin', scores: { mindBending: 2, tension: 1 } },
    ],
  },
  {
    id: 'main_hook',
    question: 'Seni bir filme en çok ne bağlar?',
    options: [
      { key: 'characters', label: 'Karakterler', scores: { emotion: 2, atmosphere: 1 } },
      { key: 'mystery', label: 'Gizem', scores: { mindBending: 2, tension: 1 } },
      { key: 'setpieces', label: 'Sahnelerin enerjisi', scores: { pace: 2, tension: 1 } },
    ],
  },
  {
    id: 'rewatch_reason',
    question: 'Bir filmi tekrar izleten şey nedir?',
    options: [
      { key: 'feeling', label: 'Bıraktığı his', scores: { emotion: 2, atmosphere: 1 } },
      { key: 'details', label: 'Kaçırılan detaylar', scores: { mindBending: 2, atmosphere: 1 } },
      { key: 'rush', label: 'Adrenalin', scores: { tension: 2, pace: 1 } },
    ],
  },
  {
    id: 'ending',
    question: 'Finalde ne olsun?',
    options: [
      { key: 'catharsis', label: 'Duygusal boşalma', scores: { emotion: 2 } },
      { key: 'twist', label: 'Ters köşe', scores: { mindBending: 2, tension: 1 } },
      { key: 'impact', label: 'Güçlü ve karanlık etki', scores: { atmosphere: 2, tension: 1 } },
    ],
  },
];

function normalizeGuess(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^(the|a|an)\s+/, '');
}

function levenshtein(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

function isCloseGuess(guess, title) {
  const normalizedGuess = normalizeGuess(guess);
  const normalizedTitle = normalizeGuess(title);
  if (!normalizedGuess || !normalizedTitle) return false;
  if (normalizedGuess === normalizedTitle) return true;
  if (normalizedTitle.includes(normalizedGuess) && normalizedGuess.length >= 5) return true;
  const distance = levenshtein(normalizedGuess, normalizedTitle);
  return distance <= Math.max(1, Math.floor(normalizedTitle.length * 0.18));
}

function seededShuffle(items, seed) {
  return [...items]
    .map((item, index) => ({
      item,
      sort: hashString(`${seed}:${index}:${item}`),
    }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
}

function cleanOverview(overview) {
  const text = String(overview || '').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  const sentence = text.split(/(?<=[.!?])\s+/)[0] || text;
  return sentence.length > 130 ? `${sentence.slice(0, 130).trim()}...` : sentence;
}

function getLeadActor(movie) {
  if (Array.isArray(movie.cast) && movie.cast.length > 0) return movie.cast[0]?.name || movie.cast[0];
  if (typeof movie.cast === 'string') {
    try {
      const parsed = JSON.parse(movie.cast);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0]?.name || parsed[0];
    } catch {
      return null;
    }
  }
  return null;
}

function buildMovieGuessRound(movie, seed, userRating = null) {
  const overviewHint = cleanOverview(movie.overview);
  const leadActor = getLeadActor(movie);
  const hints = seededShuffle([
    leadActor ? `Başrolde ${leadActor} var.` : null,
    overviewHint ? `Konu izi: ${overviewHint}` : null,
    movie.year ? `Çıkış yılı ${movie.year}.` : null,
    movie.rating ? `IMDb puanı yaklaşık ${movie.rating}.` : null,
    userRating ? `Sen bu filme ${userRating}/10 vermişsin.` : 'Sen bu filme henüz puan vermemişsin.',
  ].filter(Boolean), `${seed}:movie-guess-hints`);

  return {
    roundId: `${movie.tmdbId}:${seed}`,
    maxHints: hints.length,
    visibleHints: 1,
    hints: hints.slice(0, 1),
    allHints: hints,
    posterHintAvailableAt: hints.length,
    movie: {
      tmdbId: movie.tmdbId,
    },
  };
}

function buildPosterGuessRound(movie, seed, stageIndex = 0, source = 'user_movies') {
  const safeStageIndex = Math.max(0, Math.min(POSTER_GUESS_STAGES.length - 1, parseInt(stageIndex, 10) || 0));
  const focusSeed = hashString(`${movie.tmdbId}:${seed}:poster-focus`);
  const focusPresets = [
    { x: 0.28, y: 0.22 },
    { x: 0.72, y: 0.26 },
    { x: 0.50, y: 0.44 },
    { x: 0.34, y: 0.68 },
    { x: 0.68, y: 0.72 },
  ];
  const focus = focusPresets[focusSeed % focusPresets.length];

  return {
    roundId: `${movie.tmdbId}:${seed}`,
    source,
    stageIndex: safeStageIndex,
    maxStages: POSTER_GUESS_STAGES.length,
    stage: POSTER_GUESS_STAGES[safeStageIndex],
    crop: {
      focusX: focus.x,
      focusY: focus.y,
    },
    poster: movie.poster,
    movie: {
      tmdbId: movie.tmdbId,
    },
  };
}

const GAME_MODES = [
  {
    key: 'daily_taste',
    title: 'Günün Zevk Testi',
    description: '5 kısa soruyla bugünkü film ruh halini bul ve 3 öneri al.',
    status: 'ready',
    estimatedSeconds: 60,
  },
  {
    key: 'movie_guess',
    title: 'Filmi Tahmin Et',
    description: 'İpuçlarından filmi bulmaya çalış.',
    status: 'soon',
    estimatedSeconds: 45,
  },
  {
    key: 'poster_guess',
    title: 'Posterden Tahmin Et',
    description: 'Aşırı zoomlu poster parçasından filmi bul.',
    status: 'ready',
    estimatedSeconds: 30,
  },
  {
    key: 'watch_party_quiz',
    title: 'Film Gecesi Quizi',
    description: 'Arkadaşlarla hızlı film soruları için hazırlanıyor.',
    status: 'soon',
    estimatedSeconds: 60,
  },
];

const POSTER_GUESS_STAGES = [
  {
    visiblePercent: 5,
    blurRadius: 12,
    grainOpacity: 0.42,
    label: 'Mikro detay',
    hint: 'Sadece posterin küçük bir dokusu görünüyor.',
  },
  {
    visiblePercent: 14,
    blurRadius: 8,
    grainOpacity: 0.32,
    label: 'Renk izi',
    hint: 'Renk paleti biraz daha okunur hale geldi.',
  },
  {
    visiblePercent: 30,
    blurRadius: 5,
    grainOpacity: 0.22,
    label: 'Kompozisyon',
    hint: 'Karakter, obje veya yazıdan daha fazla parça açıldı.',
  },
  {
    visiblePercent: 60,
    blurRadius: 2,
    grainOpacity: 0.12,
    label: 'Neredeyse açık',
    hint: 'Poster artık kendini ele vermeye başladı.',
  },
  {
    visiblePercent: 100,
    blurRadius: 0,
    grainOpacity: 0,
    label: 'Reveal',
    hint: 'Poster tamamen açıldı.',
  },
];

function getTodayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function hashString(value) {
  let hash = 0;
  const text = String(value || '');
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function buildQuestionPayload() {
  return DAILY_QUESTIONS.map((question) => ({
    id: question.id,
    question: question.question,
    options: question.options.map(({ key, label }) => ({ key, label })),
  }));
}

function parseStoredResult(result) {
  if (!result) return null;
  return {
    id: result.id,
    date: result.date,
    mood: result.mood,
    moodLabel: CATEGORIES[result.mood]?.label || result.mood,
    scores: JSON.parse(result.scores),
    answers: JSON.parse(result.answers),
    recommendations: JSON.parse(result.recommendations),
    createdAt: result.createdAt,
  };
}

async function findDailyTasteResult(userId, date) {
  const rows = await prisma.$queryRaw`
    SELECT id, "userId", date, mood, scores, answers, recommendations, "createdAt"
    FROM "DailyTasteResult"
    WHERE "userId" = ${userId} AND date = ${date}
    LIMIT 1
  `;
  return rows[0] || null;
}

async function saveDailyTasteResult({ userId, date, mood, scores, answers, recommendations }) {
  const scoresJson = JSON.stringify(scores);
  const answersJson = JSON.stringify(answers);
  const recommendationsJson = JSON.stringify(recommendations);

  await prisma.$executeRaw`
    INSERT INTO "DailyTasteResult" ("id", "userId", date, mood, scores, answers, recommendations)
    VALUES (
      ${randomUUID()},
      ${userId},
      ${date},
      ${mood},
      ${scoresJson},
      ${answersJson},
      ${recommendationsJson}
    )
    ON CONFLICT ("userId", date)
    DO UPDATE SET
      mood = EXCLUDED.mood,
      scores = EXCLUDED.scores,
      answers = EXCLUDED.answers,
      recommendations = EXCLUDED.recommendations
  `;

  return findDailyTasteResult(userId, date);
}

function calculateScores(answers) {
  const scores = Object.keys(CATEGORIES).reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
  const normalizedAnswers = [];

  for (const question of DAILY_QUESTIONS) {
    const choiceKey = answers[question.id];
    const option = question.options.find((item) => item.key === choiceKey);
    if (!option) throw new ApiError(400, `Gecersiz cevap: ${question.id}`);

    normalizedAnswers.push({
      questionId: question.id,
      choiceKey: option.key,
      label: option.label,
    });

    for (const [category, value] of Object.entries(option.scores)) {
      scores[category] += value;
    }
  }

  return { scores, normalizedAnswers };
}

function pickMood(scores) {
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}

async function getRecommendations(userId, mood) {
  const moodKey = CATEGORIES[mood]?.mood || 'thrilling';
  const [userMovies, watchlist, moodMovies] = await Promise.all([
    prisma.userMovie.findMany({ where: { userId }, include: { movie: true } }),
    prisma.watchlist.findMany({ where: { userId }, select: { tmdbId: true } }),
    tmdbService.getMoodMovies(moodKey, 1),
  ]);

  const excluded = new Set([
    ...userMovies.map((item) => item.movie.tmdbId),
    ...watchlist.map((item) => item.tmdbId),
  ]);

  return moodMovies
    .filter((movie) => !excluded.has(movie.tmdbId))
    .slice(0, 3);
}

const getGameModes = async () => ({
  modes: GAME_MODES,
});

const startMovieGuess = async (userId) => {
  const userMovies = await prisma.userMovie.findMany({
    where: { userId },
    include: { movie: true },
  });

  let movies = userMovies
    .map((item) => item.movie)
    .filter((movie) => movie?.tmdbId);
  let source = 'user_movies';

  if (movies.length === 0) {
    const page = (hashString(`${userId}:${getTodayKey()}:guess`) % 5) + 1;
    movies = await tmdbService.getTrendingPaged(page);
    source = 'trending';
  }

  if (!movies.length) throw new ApiError(503, 'Film havuzu hazir degil');

  const index = hashString(`${userId}:${Date.now()}`) % movies.length;
  const movie = movies[index];
  const [detail, ratingRecord] = await Promise.all([
    tmdbService.getMovieDetail(movie.tmdbId).catch(() => movie),
    prisma.movieRating.findFirst({
      where: {
        userId,
        movie: { tmdbId: movie.tmdbId },
      },
      select: { rating: true },
    }).catch(() => null),
  ]);
  const round = buildMovieGuessRound({ ...movie, ...detail }, Date.now(), ratingRecord?.rating || null);
  const { allHints, ...payload } = round;

  return {
    ...payload,
    source,
  };
};

async function pickPosterGuessMovie(userId, requestedSource = 'user_movies') {
  const userMovies = await prisma.userMovie.findMany({
    where: { userId },
    include: { movie: true },
  });

  let movies = requestedSource === 'trending'
    ? []
    : userMovies
    .map((item) => item.movie)
    .filter((movie) => movie?.tmdbId && movie?.poster);
  let source = requestedSource === 'trending' ? 'trending' : 'user_movies';

  if (movies.length === 0) {
    const page = (hashString(`${userId}:${getTodayKey()}:poster`) % 5) + 1;
    movies = await tmdbService.getTrendingPaged(page);
    source = 'trending';
  }

  if (!movies.length) throw new ApiError(503, 'Poster havuzu hazir degil');

  const index = hashString(`${userId}:${Date.now()}:poster`) % movies.length;
  const movie = movies[index];
  const detail = await tmdbService.getMovieDetail(movie.tmdbId).catch(() => movie);

  if (!detail.poster && !movie.poster) throw new ApiError(503, 'Poster hazir degil');
  return {
    movie: { ...movie, ...detail, poster: detail.poster || movie.poster },
    source,
  };
}

const startPosterGuess = async (userId, requestedSource = 'user_movies') => {
  const { movie, source } = await pickPosterGuessMovie(userId, requestedSource);
  return buildPosterGuessRound(movie, Date.now(), 0, source);
};

const submitPosterGuess = async ({ roundId, guess, stageIndex = 0, wrongGuesses = 0, source = 'user_movies' }) => {
  const [tmdbId, seed = 'manual'] = String(roundId || '').split(':');
  if (!tmdbId) throw new ApiError(400, 'Round bilgisi gecersiz');
  if (!guess?.trim()) throw new ApiError(400, 'Tahmin zorunlu');

  const movie = await tmdbService.getMovieDetail(tmdbId);
  const correct = isCloseGuess(guess, movie.title) || isCloseGuess(guess, movie.originalTitle);
  const currentStage = Math.max(0, Math.min(POSTER_GUESS_STAGES.length - 1, parseInt(stageIndex, 10) || 0));
  const nextStage = correct ? currentStage : Math.min(POSTER_GUESS_STAGES.length - 1, currentStage + 1);
  const revealed = correct || nextStage >= POSTER_GUESS_STAGES.length - 1;
  const stagePenalty = currentStage * 18;
  const wrongPenalty = Math.max(0, parseInt(wrongGuesses, 10) || 0) * 6;
  const score = correct ? Math.max(20, 100 - stagePenalty - wrongPenalty) : 0;

  return {
    correct,
    revealed,
    score,
    message: correct
      ? 'Doğru tahmin!'
      : revealed
        ? 'Poster tamamen açıldı.'
        : 'Not quite. Poster biraz daha açıldı.',
    round: buildPosterGuessRound(movie, seed, nextStage, source),
    answer: revealed ? {
      tmdbId: movie.tmdbId,
      title: movie.title,
      poster: movie.poster,
      year: movie.year,
      rating: movie.rating,
      overview: movie.overview,
    } : null,
  };
};

const revealMovieGuessHint = async (roundId, visibleHints = 1, userId = null) => {
  const [tmdbId] = String(roundId || '').split(':');
  if (!tmdbId) throw new ApiError(400, 'Round bilgisi gecersiz');

  const [movie, ratingRecord] = await Promise.all([
    tmdbService.getMovieDetail(tmdbId),
    userId
      ? prisma.movieRating.findFirst({
          where: {
            userId,
            movie: { tmdbId: parseInt(tmdbId, 10) },
          },
          select: { rating: true },
        }).catch(() => null)
      : Promise.resolve(null),
  ]);
  const round = buildMovieGuessRound(movie, String(roundId).split(':')[1] || 'manual', ratingRecord?.rating || null);
  const nextVisibleHints = Math.max(1, Math.min(round.maxHints, parseInt(visibleHints, 10) + 1));
  const { allHints, ...payload } = round;

  return {
    ...payload,
    visibleHints: nextVisibleHints,
    hints: allHints.slice(0, nextVisibleHints),
    poster: nextVisibleHints >= round.maxHints ? movie.poster : null,
  };
};

const revealPosterGuessStage = async ({ roundId, stageIndex = 0, source = 'user_movies' }) => {
  const [tmdbId, seed = 'manual'] = String(roundId || '').split(':');
  if (!tmdbId) throw new ApiError(400, 'Round bilgisi gecersiz');

  const movie = await tmdbService.getMovieDetail(tmdbId);
  const currentStage = Math.max(0, Math.min(POSTER_GUESS_STAGES.length - 1, parseInt(stageIndex, 10) || 0));
  const nextStage = Math.min(POSTER_GUESS_STAGES.length - 1, currentStage + 1);
  const revealed = nextStage >= POSTER_GUESS_STAGES.length - 1;

  return {
    correct: false,
    revealed,
    score: 0,
    message: revealed ? 'Poster tamamen açıldı.' : 'Poster biraz daha netleşti.',
    round: buildPosterGuessRound(movie, seed, nextStage, source),
    answer: revealed ? {
      tmdbId: movie.tmdbId,
      title: movie.title,
      poster: movie.poster,
      year: movie.year,
      rating: movie.rating,
      overview: movie.overview,
    } : null,
  };
};

const submitMovieGuess = async ({ roundId, guess, visibleHints = 1, wrongGuesses = 0 }) => {
  const [tmdbId] = String(roundId || '').split(':');
  if (!tmdbId) throw new ApiError(400, 'Round bilgisi gecersiz');
  if (!guess?.trim()) throw new ApiError(400, 'Tahmin zorunlu');

  const movie = await tmdbService.getMovieDetail(tmdbId);
  const correct = isCloseGuess(guess, movie.title) || isCloseGuess(guess, movie.originalTitle);
  const hintPenalty = Math.max(0, parseInt(visibleHints, 10) - 1) * 15;
  const wrongPenalty = Math.max(0, parseInt(wrongGuesses, 10)) * 5;
  const score = correct ? Math.max(20, 100 - hintPenalty - wrongPenalty) : 0;

  return {
    correct,
    score,
    message: correct ? 'Doğru tahmin!' : 'Henüz değil, bir ipucu daha iyi gelebilir.',
    answer: correct ? {
      tmdbId: movie.tmdbId,
      title: movie.title,
      poster: movie.poster,
      year: movie.year,
      rating: movie.rating,
      overview: movie.overview,
    } : null,
  };
};

const getDailyTaste = async (userId) => {
  const date = getTodayKey();
  const existing = await findDailyTasteResult(userId, date);

  return {
    date,
    gameKey: 'daily_taste',
    questions: buildQuestionPayload(),
    result: parseStoredResult(existing),
  };
};

const answerDailyTaste = async (userId, payload) => {
  const answers = payload?.answers;
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    throw new ApiError(400, 'Cevaplar zorunlu');
  }

  const date = getTodayKey();
  const { scores, normalizedAnswers } = calculateScores(answers);
  const mood = pickMood(scores);
  const recommendations = await getRecommendations(userId, mood);

  const stored = await saveDailyTasteResult({
    userId,
    date,
    mood,
    scores,
    answers: normalizedAnswers,
    recommendations,
  });

  const parsed = parseStoredResult(stored);
  return {
    ...parsed,
    title: `Bugünkü film ruh halin: ${parsed.moodLabel}`,
    insight: buildInsight(parsed.mood),
  };
};

function buildInsight(mood) {
  const insights = {
    tension: 'Bugün yüksek tansiyon, risk ve güçlü tempo sana daha yakın.',
    emotion: 'Bugün karakter bağı ve duygusal etki öne çıkıyor.',
    mindBending: 'Bugün gizem, teori ve akılda kalan kırılma anları arıyorsun.',
    pace: 'Bugün enerjisi yüksek, hızlı akan filmler daha iyi gider.',
    atmosphere: 'Bugün atmosferi güçlü, karanlık veya içine çeken filmler öne çıkıyor.',
  };
  return insights[mood] || insights.tension;
}

module.exports = {
  getGameModes,
  startMovieGuess,
  revealMovieGuessHint,
  submitMovieGuess,
  startPosterGuess,
  submitPosterGuess,
  revealPosterGuessStage,
  getDailyTaste,
  answerDailyTaste,
};
