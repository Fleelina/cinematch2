const { z } = require('zod');

const searchCharacters = z.object({
  query: z.object({
    query: z.string({ required_error: 'Arama terimi gerekli' }).min(1, 'Arama terimi gerekli'),
  }),
});

const getPersonDetail = z.object({
  params: z.object({
    personId: z.string({ required_error: 'personId gerekli' }),
  }),
});

module.exports = { searchCharacters, getPersonDetail };
