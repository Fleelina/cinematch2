const express = require('express');
const multer = require('multer');
const importController = require('../controllers/import.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { ApiError } = require('../middleware/errorHandler');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isZip =
      file.mimetype === 'application/zip' ||
      file.mimetype === 'application/x-zip-compressed' ||
      file.originalname.toLowerCase().endsWith('.zip');

    if (!isZip) {
      return cb(new ApiError(400, 'Sadece Letterboxd ZIP dosyasi yuklenebilir'));
    }

    cb(null, true);
  },
});

router.post('/letterboxd', authMiddleware, upload.single('file'), importController.importLetterboxd);

module.exports = router;
