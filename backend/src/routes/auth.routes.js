const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const authValidator = require('../validators/auth.validator');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiters');

// Public auth endpoint'leri.
router.post('/register', registerLimiter, validate(authValidator.register), authController.register);
router.post('/login', loginLimiter, validate(authValidator.login), authController.login);

module.exports = router;
