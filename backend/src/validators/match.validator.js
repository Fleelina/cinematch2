const { z } = require('zod');

const targetUserIdParam = z.object({
  params: z.object({
    targetUserId: z.string({ required_error: 'targetUserId gerekli' }),
  }),
});

module.exports = { targetUserIdParam };
