const jwt = require('jsonwebtoken');
const config = require('../config');

function setupSocketAuth(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Token bulunamadı'));
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Geçersiz token'));
    }
  });
}

module.exports = { setupSocketAuth };
