const movieService = require('../services/movie.service');
const { asyncHandler } = require('../middleware/errorHandler');
const { ok } = require('../utils/response');

const getPersonDetail = asyncHandler(async (req, res) => {
  const { personId } = req.validated.params;
  const data = await movieService.getPersonDetail(personId);
  ok(res, data);
});

const searchCharacters = asyncHandler(async (req, res) => {
  const { query } = req.validated.query;
  const people = await movieService.searchPeople(query);
  ok(res, people);
});

module.exports = { getPersonDetail, searchCharacters };
