const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: result.error.errors[0].message,
    });
  }

  req.validated = result.data;
  next();
};

module.exports = validate;
