const express = require('express');
const router = express.Router();
const personController = require('../controllers/person.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const personValidator = require('../validators/person.validator');

// Kisi arama ve detay endpoint'leri auth korumasi altindadir.
router.get('/search', authMiddleware, validate(personValidator.searchCharacters), personController.searchCharacters);
router.get('/:personId', authMiddleware, validate(personValidator.getPersonDetail), personController.getPersonDetail);

module.exports = router;
