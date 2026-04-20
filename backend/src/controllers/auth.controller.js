const authService = require('../services/auth.service');
const { asyncHandler } = require('../middleware/errorHandler');
const { ok } = require('../utils/response');

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.validated.body);
  ok(res, result, 201);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.validated.body);
  ok(res, result);
});

module.exports = { register, login };
