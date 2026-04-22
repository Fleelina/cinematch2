const { z } = require('zod');

// Avatar upload body’si base64 veri ve opsiyonel mime type bekler.
const avatarBody = z.object({
  body: z.object({
    base64: z.string({ required_error: 'Gorsel gerekli' }).min(1, 'Gorsel gerekli'),
    mimeType: z.string().optional().default('image/jpeg'),
  }),
});

module.exports = { avatarBody };
