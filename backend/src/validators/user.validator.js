const { z } = require('zod');

// Profil guncelleme body’si parcali update mantigiyla calisir.
const updateProfile = z.object({
  body: z.object({
    name: z.string().optional(),
    username: z.string().min(3, 'Kullanici adi en az 3 karakter olmali').optional(),
    bio: z.string().optional(),
    avatar: z.string().optional(),
    avatarType: z.string().optional(),
    age: z.union([z.number(), z.string()]).optional(),
    showAge: z.boolean().optional(),
  }),
});

// Username kontrol endpoint'i query param uzerinden calisir.
const checkUsername = z.object({
  query: z.object({
    username: z.string().min(3, 'En az 3 karakter olmali'),
  }),
});

// Push bildirim token'i tek alanli body ile alinir.
const savePushToken = z.object({
  body: z.object({
    token: z.string({ required_error: 'Token gerekli' }),
  }),
});

// Public profil sorgusunda `userId` path param'i zorunludur.
const getUserProfile = z.object({
  params: z.object({
    userId: z.string({ required_error: 'userId gerekli' }),
  }),
});

module.exports = { updateProfile, checkUsername, savePushToken, getUserProfile };
