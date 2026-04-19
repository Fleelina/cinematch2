const authService = require('../services/auth.service');

const register = async (req, res) => {
  const { name, email, password, username, bio, avatar, avatarType, age, showAge, movies } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Ad, email ve şifre zorunludur' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır' });
  }

  try {
    const existingEmail = await authService.findUserByEmail(email);
    if (existingEmail) return res.status(409).json({ error: 'Bu email zaten kayıtlı' });

    if (username) {
      const existingUsername = await authService.findUserByUsername(username);
      if (existingUsername) return res.status(409).json({ error: 'Bu kullanıcı adı zaten alınmış' });
    }

    const user = await authService.createUserWithMovies({ name, email, password, username, bio, avatar, avatarType, age, showAge, movies });
    const token = authService.generateToken(user.id);

    res.status(201).json({ token, user: authService.formatUserResponse(user) });
  } catch (err) {
    console.error('[register]', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email ve şifre zorunludur' });
  }

  try {
    const user = await authService.findUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Kullanıcı bulunamadı' });

    const isValid = await authService.comparePassword(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Şifre hatalı' });

    const token = authService.generateToken(user.id);
    res.json({ token, user: authService.formatUserResponse(user) });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

module.exports = { register, login };
