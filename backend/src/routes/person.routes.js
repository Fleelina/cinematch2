const express = require('express');
const router = express.Router();
const personController = require('../controllers/person.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/:personId', authMiddleware, personController.getPersonDetail);

module.exports = router;
