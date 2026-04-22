// Uygulama seviyesinde kontrollu hata firlatmak icin kullanilan custom error.
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Express hata middleware'i; bilinen hata tiplerini tutarli response'a cevirir.
const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ success: false, error: err.message });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, error: 'Gecersiz token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, error: 'Token suresi doldu' });
  }

  return res.status(500).json({ success: false, error: 'Sunucu hatasi' });
};

// Async route handler'larda try/catch tekrarini kaldirir.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { ApiError, errorHandler, asyncHandler };
