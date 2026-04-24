const { z } = require('zod');

// Profil guncelleme body’si parcali update mantigiyla calisir.
const updateProfile = z.object({
  body: z.object({
    name: z.string().optional(),
    username: z.string().min(3, 'Kullanici adi en az 3 karakter olmali').optional().nullable(),
    bio: z.string().optional().nullable(),
    avatar: z.string().optional().nullable(),
    avatarType: z.string().optional().nullable(),
    age: z.union([z.number(), z.string(), z.null()]).optional(),
    showAge: z.preprocess((v) => {
      if (v === true || v === 'true' || v === 1) return true;
      if (v === false || v === 'false' || v === 0) return false;
      return v;
    }, z.boolean()).optional(),
    gender: z.enum(['male', 'female']).nullable().optional(),
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
