// Zod schema'sini request'in body/query/params alanlarina uygular.
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (!result.success) {
    const firstError = result.error?.errors?.[0];
    const isDev = process.env.NODE_ENV !== 'production';
    return res.status(400).json({
      success: false,
      error: firstError?.message ?? 'Gecersiz istek',
      ...(isDev && { details: result.error?.errors ?? [] }),
    });
  }

  // Controller isterse parse edilmis degerlere `req.validated` uzerinden erisir.
  req.validated = result.data;
  next();
};

module.exports = validate;
