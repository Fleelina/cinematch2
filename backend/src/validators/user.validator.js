const { z } = require('zod');

const updateProfile = z.object({
  body: z.object({
    name: z.string().optional(),
    username: z.string().min(3, 'Kullanıcı adı en az 3 karakter olmalı').optional(),
    bio: z.string().optional(),
    avatar: z.string().optional(),
    avatarType: z.string().optional(),
    age: z.union([z.number(), z.string()]).optional(),
    showAge: z.boolean().optional(),
  }),
});

const checkUsername = z.object({
  query: z.object({
    username: z.string().min(3, 'En az 3 karakter olmalı'),
  }),
});

const savePushToken = z.object({
  body: z.object({
    token: z.string({ required_error: 'Token gerekli' }),
  }),
});

const getUserProfile = z.object({
  params: z.object({
    userId: z.string({ required_error: 'userId gerekli' }),
  }),
});

module.exports = { updateProfile, checkUsername, savePushToken, getUserProfile };
