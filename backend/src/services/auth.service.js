const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = '7d';

const findUserByEmail = (email) =>
  prisma.user.findUnique({ where: { email } });

const findUserByUsername = (username) =>
  prisma.user.findFirst({ where: { username } });

const hashPassword = (password) =>
  bcrypt.hash(password, SALT_ROUNDS);

const comparePassword = (plain, hashed) =>
  bcrypt.compare(plain, hashed);

const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

const createUserWithMovies = async ({ name, email, password, username, bio, avatar, avatarType, age, showAge, movies }) => {
  const hashedPassword = await hashPassword(password);

  // Filmleri DB'de upsert et
  const movieData = [];
  if (Array.isArray(movies) && movies.length > 0) {
    for (const movie of movies) {
      try {
        const dbMovie = await prisma.movie.upsert({
          where: { tmdbId: movie.tmdbId },
          update: {},
          create: {
            tmdbId: movie.tmdbId,
            title: movie.title,
            poster: movie.poster || null,
            year: movie.year ? parseInt(movie.year) : null,
          },
        });
        movieData.push({ movieId: dbMovie.id });
      } catch (err) {
        console.error(`Film upsert hatası (tmdbId: ${movie.tmdbId}):`, err.message);
      }
    }
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

module.exports = {
  findUserByEmail,
  findUserByUsername,
  hashPassword,
  comparePassword,
  generateToken,
  createUserWithMovies,
  formatUserResponse,
};
