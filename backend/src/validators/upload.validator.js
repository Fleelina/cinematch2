const { z } = require('zod');

const avatarBody = z.object({
  body: z.object({
    base64: z.string({ required_error: 'Görsel gerekli' }).min(1, 'Görsel gerekli'),
    mimeType: z.string().optional().default('image/jpeg'),
  }),
});

module.exports = { avatarBody };
