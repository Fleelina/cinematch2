const { z } = require('zod');

// Register request body icin giris kontratini tanimlar.
const register = z.object({
  body: z.object({
    name: z.string({ required_error: 'Ad zorunludur' }).min(1, 'Ad zorunludur'),
    email: z.string({ required_error: 'Email zorunludur' }).email('Gecerli bir email girin'),
    password: z.string({ required_error: 'Sifre zorunludur' }).min(6, 'Sifre en az 6 karakter olmali'),
    username: z.string().optional(),
    bio: z.string().optional().nullable(),
    avatar: z.string().optional().nullable(),
    avatarType: z.string().optional().nullable(),
    age: z.coerce.number().int().min(18).max(100).optional().nullable(),
    showAge: z.boolean().optional().default(false),
    gender: z.string().optional().nullable(),
    movies: z.array(z.any()).optional(),
  }),
});

// Login akisi sadece email + password kabul eder.
const login = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email zorunludur' }).email('Gecerli bir email girin'),
    password: z.string({ required_error: 'Sifre zorunludur' }).min(1, 'Sifre zorunludur'),
  }),
});

module.exports = { register, login };
