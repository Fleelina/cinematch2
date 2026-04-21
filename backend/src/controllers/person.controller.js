const tmdbService = require('../services/tmdb.service');
const { asyncHandler } = require('../middleware/errorHandler');
const { ok } = require('../utils/response');

const getPersonDetail = asyncHandler(async (req, res) => {
  const { personId } = req.validated.params;
  const data = await tmdbService.getPersonDetail(personId);
  ok(res, data);
});

const searchCharacters = asyncHandler(async (req, res) => {
  const { query } = req.validated.query;
  const people = await tmdbService.searchPeople(query);
  ok(res, people);
});

module.exports = { getPersonDetail, searchCharacters };
