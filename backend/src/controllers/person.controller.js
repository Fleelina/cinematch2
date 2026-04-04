const axios = require('axios');

const TMDB_BASE = 'https://api.themoviedb.org/3';

const getPersonDetail = async (req, res) => {
  const { personId } = req.params;

  try {
    const [trDetailRes, enDetailRes, creditsRes] = await Promise.all([
      axios.get(`${TMDB_BASE}/person/${personId}`, {
        params: { api_key: process.env.TMDB_API_KEY, language: 'tr-TR' },
      }),
      axios.get(`${TMDB_BASE}/person/${personId}`, {
        params: { api_key: process.env.TMDB_API_KEY, language: 'en-US' },
      }),
      axios.get(`${TMDB_BASE}/person/${personId}/combined_credits`, {
        params: { api_key: process.env.TMDB_API_KEY, language: 'tr-TR' },
      }),
    ]);

    const p = trDetailRes.data;
    const pEn = enDetailRes.data;
    const credits = creditsRes.data;

    // Türkçe biyografi yeterliyse kullan, yoksa İngilizce göster
    const trBio = p.biography?.trim() || '';
    const enBio = pEn.biography?.trim() || '';
    const biography = trBio.length > 100 ? trBio : enBio;

    const actedIn = credits.cast
      ? credits.cast
          .filter((c) => c.media_type === 'movie' && c.poster_path)
          .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
          .slice(0, 20)
          .map((c) => ({
            tmdbId: c.id,
            title: c.title,
            character: c.character,
            poster: `https://image.tmdb.org/t/p/w185${c.poster_path}`,
            year: c.release_date?.slice(0, 4) || null,
            rating: c.vote_average ? c.vote_average.toFixed(1) : null,
          }))
      : [];

    const directed = credits.crew
      ? credits.crew
          .filter((c) => c.media_type === 'movie' && c.job === 'Director' && c.poster_path)
          .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
          .slice(0, 20)
          .map((c) => ({
            tmdbId: c.id,
            title: c.title,
            poster: `https://image.tmdb.org/t/p/w185${c.poster_path}`,
            year: c.release_date?.slice(0, 4) || null,
            rating: c.vote_average ? c.vote_average.toFixed(1) : null,
          }))
      : [];

    res.json({
      personId: p.id,
      name: p.name,
      photo: p.profile_path ? `https://image.tmdb.org/t/p/w342${p.profile_path}` : null,
      biography,
      birthday: p.birthday || null,
      placeOfBirth: p.place_of_birth || null,
      knownForDepartment: p.known_for_department || null,
      actedIn,
      directed,
    });
  } catch (err) {
    console.error('Person detail error:', err.message);
    res.status(500).json({ error: 'Kişi bilgisi alınamadı', detail: err.message });
  }
};

module.exports = { getPersonDetail };
