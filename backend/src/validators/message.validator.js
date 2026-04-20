const { z } = require('zod');

const matchIdParam = z.object({
  params: z.object({
    matchId: z.string({ required_error: 'matchId gerekli' }),
  }),
});

const sendMessageBody = z.object({
  params: z.object({
    matchId: z.string({ required_error: 'matchId gerekli' }),
  }),
  body: z.object({
    text: z.string({ required_error: 'Mesaj gerekli' }).trim().min(1, 'Mesaj boş olamaz'),
  }),
});

module.exports = { matchIdParam, sendMessageBody };
