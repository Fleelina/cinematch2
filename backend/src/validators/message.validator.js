const { z } = require('zod');

// Mesaj endpoint'lerinde kullanilan ortak `matchId` parametresi.
const matchIdParam = z.object({
  params: z.object({
    matchId: z.string({ required_error: 'matchId gerekli' }),
  }),
});

// Mesaj gonderme akisinda text zorunlu, movieId opsiyoneldir.
const sendMessageBody = z.object({
  params: z.object({
    matchId: z.string({ required_error: 'matchId gerekli' }),
  }),
  body: z.object({
    text: z.string({ required_error: 'Mesaj gerekli' }).trim().min(1, 'Mesaj bos olamaz'),
    movieId: z.string().trim().min(1).optional(),
  }),
});

module.exports = { matchIdParam, sendMessageBody };
