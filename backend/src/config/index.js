require('dotenv').config();

// Environment degiskenlerini uygulama ici tek config nesnesine toplar.
const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET,

  // Harici servis konfigurasyonlari.
  tmdbApiKey: process.env.TMDB_API_KEY,
  r2: {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME,
    publicUrl: process.env.R2_PUBLIC_URL,
  },

  // Uygulama sabitleri tek yerde tutulur.
  constants: {
    MIN_PASSWORD_LENGTH: 6,
    MAX_BIO_LENGTH: 500,
    MAX_USERNAME_LENGTH: 24,
    JWT_EXPIRES_IN: '7d',
    BCRYPT_ROUNDS: 12,
  },
};

// Kritik env alanlari boot aninda dogrulanir.
if (!config.jwtSecret) throw new Error('JWT_SECRET gerekli');
if (!config.tmdbApiKey) throw new Error('TMDB_API_KEY gerekli');

module.exports = config;
