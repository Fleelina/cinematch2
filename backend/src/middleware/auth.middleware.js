const jwt = require('jsonwebtoken');

// Authorization header'daki Bearer token'i dogrular ve `req.user` uzerine yazar.
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token bulunamadi' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token suresi doldu', code: 'TOKEN_EXPIRED' });
    }
    return res.status(403).json({ error: 'Gecersiz token', code: 'TOKEN_INVALID' });
  }
};

module.exports = authMiddleware;
