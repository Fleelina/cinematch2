const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

const register = async (req, res) => {
  const { name, email, password, username, bio, avatar, avatarType, age, showAge, movies } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Tüm alanlar zorunludur' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Bu email zaten kayıtlı' });
    }

    // Username check 
    if (username) {
      const existingUsername = await prisma.user.findFirst({ where: { username } });
      if (existingUsername) {
        return res.status(409).json({ error: 'Bu kullanıcı adı zaten alınmış' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Filmleri create/update et ve MovieMovie ilişkisini kur
    const movieData = [];
    if (movies && Array.isArray(movies) && movies.length > 0) {
      for (const movie of movies) {
        try {
          // Movie'yi veritabanında oluştur veya var olanı bul
          const dbMovie = await prisma.movie.upsert({
            where: { tmdbId: movie.tmdbId },
            update: {}, // Var olanı update etme, olduğu gibi tut
            create: {
              tmdbId: movie.tmdbId,
              title: movie.title,
              poster: movie.poster,
              year: movie.year ? parseInt(movie.year) : null,
            },
          });
          movieData.push({ movieId: dbMovie.id });
        } catch (err) {
          console.error(`Film eklenirken hata (tmdbId: ${movie.tmdbId}):`, err);
          // Bir film başarısız olsa da devam et
        }
      }
    }

    const user = await prisma.user.create({
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
        // Filmleri ilişkilendir
        ...(movieData.length > 0 && {
          movies: {
            create: movieData,
          },
        }),
      },
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        avatarType: user.avatarType,
        age: user.age,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email ve şifre zorunludur' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Şifre hatalı' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

module.exports = { register, login };
