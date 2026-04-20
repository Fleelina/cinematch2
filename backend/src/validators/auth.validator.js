const { z } = require('zod');

const register = z.object({
  body: z.object({
    name: z.string({ required_error: 'Ad zorunludur' }).min(1, 'Ad zorunludur'),
    email: z.string({ required_error: 'Email zorunludur' }).email('Geçerli bir email girin'),
    password: z.string({ required_error: 'Şifre zorunludur' }).min(6, 'Şifre en az 6 karakter olmalıdır'),
    username: z.string().optional(),
    bio: z.string().optional(),
    avatar: z.string().optional(),
    avatarType: z.string().optional(),
    age: z.number().optional(),
    showAge: z.boolean().optional(),
    movies: z.array(z.any()).optional(),
  }),
});

const login = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email zorunludur' }).email('Geçerli bir email girin'),
    password: z.string({ required_error: 'Şifre zorunludur' }).min(1, 'Şifre zorunludur'),
  }),
});

module.exports = { register, login };
