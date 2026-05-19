const letterboxdImportService = require('../services/letterboxdImport.service');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { ok } = require('../utils/response');

const importLetterboxd = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'Letterboxd ZIP dosyasi gerekli');
  }

  const summary = await letterboxdImportService.importFromZip(req.user.userId, req.file.buffer);
  ok(res, summary, 201);
});

module.exports = { importLetterboxd };
