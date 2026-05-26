const rateLimit = require('express-rate-limit');

const createLimiter = ({ windowMs, limit, message }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: message },
  });

const globalApiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  message: 'Cok fazla istek gonderildi, lutfen daha sonra tekrar deneyin',
});

const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: 'Cok fazla giris denemesi yapildi, lutfen daha sonra tekrar deneyin',
});

const registerLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: 'Cok fazla kayit denemesi yapildi, lutfen daha sonra tekrar deneyin',
});

const publicAvatarUploadLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  message: 'Cok fazla fotograf yukleme denemesi yapildi, lutfen daha sonra tekrar deneyin',
});

const publicMovieSearchLimiter = createLimiter({
  windowMs: 60 * 1000,
  limit: 30,
  message: 'Cok fazla film arama istegi gonderildi, lutfen biraz sonra tekrar deneyin',
});

module.exports = {
  globalApiLimiter,
  loginLimiter,
  registerLimiter,
  publicAvatarUploadLimiter,
  publicMovieSearchLimiter,
};
