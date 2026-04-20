class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ success: false, error: err.message });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, error: 'Geçersiz token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, error: 'Token süresi doldu' });
  }

  res.status(500).json({ success: false, error: 'Sunucu hatası' });
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { ApiError, errorHandler, asyncHandler };
