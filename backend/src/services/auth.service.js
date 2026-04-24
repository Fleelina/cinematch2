const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');
const { ApiError } = require('../middleware/errorHandler');
const { finalizeAvatar } = require('./upload.service');

const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = '7d';

const findUserByEmail = (email) =>
  prisma.user.findUnique({ where: { email } });

const findUserByUsername = (username) =>
  prisma.user.findUnique({ where: { username } });

const hashPassword = (password) =>
  bcrypt.hash(password, SALT_ROUNDS);

const comparePassword = (plain, hashed) =>
  bcrypt.compare(plain, hashed);

const generateToken = (userId) => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET not set');
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
};

const createUserWithMovies = async ({ name, email, password, username, bio, avatar, avatarType, age, showAge, gender, movies }) => {
  const hashedPassword = await hashPassword(password);

  // Onboarding'den gelen filmler önce tekilleştirilir; var olan kayıtlar tekrar oluşturulmaz.
  const movieData = [];
  if (Array.isArray(movies) && movies.length > 0) {
    const results = await Promise.allSettled(
      movies.map((movie) =>
        prisma.movie.upsert({
          where: { tmdbId: Number(movie.tmdbId) },
          update: {},
          create: {
            tmdbId: Number(movie.tmdbId),
            title: movie.title,
            poster: movie.poster || null,
            year: movie.year ? parseInt(movie.year) : null,
          },
        })
      )
    );

    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        movieData.push({ movieId: result.value.id });
      } else {
        console.error(`Film upsert hatası (tmdbId: ${movies[i].tmdbId}):`, result.reason.message);
      }
    });
  }

  return prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      username: username || null,
      bio: bio || null,
      avatar: avatar || null,
      avatarType: avatarType || null,
      age: age ? parseInt(age) : null,
      showAge: showAge ?? false,
      gender: gender || null,
      ...(movieData.length > 0 && {
        movies: { create: movieData },
      }),
    },
  });
};

const formatUserResponse = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  username: user.username,
  avatar: user.avatar,
  avatarType: user.avatarType,
  age: user.age,
  showAge: user.showAge,
  bio: user.bio,
});

const register = async ({ name, email, password, username, bio, avatar, avatarType, age, showAge, gender, movies }) => {
  // Önce benzersiz alanlar kontrol edilir; başarısız senaryoda gereksiz hash ve create maliyeti oluşmaz.
  const existingEmail = await findUserByEmail(email);
  if (existingEmail) throw new ApiError(409, 'Bu email zaten kayıtlı');

  if (username) {
    const existingUsername = await findUserByUsername(username);
    if (existingUsername) throw new ApiError(409, 'Bu kullanıcı adı zaten alınmış');
  }

  const user = await createUserWithMovies({ name, email, password, username, bio, avatar, avatarType, age, showAge, gender, movies });
  const token = generateToken(user.id);

  // Kayıt tamamlandıktan sonra geçici avatar kalıcı kullanıcı anahtarına taşınır.
  if (avatar && avatarType === 'upload') {
    try {
      const finalUrl = await finalizeAvatar(avatar, user.id);
      if (finalUrl !== avatar) {
        await prisma.user.update({ where: { id: user.id }, data: { avatar: finalUrl } });
        user.avatar = finalUrl;
      }
    } catch (err) {
      console.error('Avatar finalize hatası (kritik değil):', err.message);
    }
  }

  return { token, user: formatUserResponse(user) };
};

const login = async ({ email, password }) => {
  const user = await findUserByEmail(email);
  if (!user) throw new ApiError(401, 'Email veya şifre hatalı');

  // Hata mesajı sabit tutulur; email'in var olup olmadığı dışarı sızdırılmaz.
  const isValid = await comparePassword(password, user.password);
  if (!isValid) throw new ApiError(401, 'Email veya şifre hatalı');

  const token = generateToken(user.id);
  return { token, user: formatUserResponse(user) };
};

module.exports = {
  register,
  login,
  findUserByEmail,
  findUserByUsername,
  hashPassword,
  comparePassword,
  generateToken,
  createUserWithMovies,
  formatUserResponse,
};
