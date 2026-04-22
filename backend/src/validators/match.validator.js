const { z } = require('zod');

// Match etkileşim endpoint'lerinde hedef kullanici id'si path'ten gelir.
const targetUserIdParam = z.object({
  params: z.object({
    targetUserId: z.string({ required_error: 'targetUserId gerekli' }),
  }),
});

// Match uzerinden calisan aksiyonlar icin `matchId` path param'i.
const matchIdParam = z.object({
  params: z.object({
    matchId: z.string({ required_error: 'matchId gerekli' }),
  }),
});

module.exports = { targetUserIdParam, matchIdParam };
