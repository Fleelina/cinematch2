const { z } = require('zod');

// Kisi aramasi query string uzerinden tek `query` alani kabul eder.
const searchCharacters = z.object({
  query: z.object({
    query: z.string({ required_error: 'Arama terimi gerekli' }).min(1, 'Arama terimi gerekli'),
  }),
});

// Kisi detay endpoint'i icin `personId` path param'i zorunludur.
const getPersonDetail = z.object({
  params: z.object({
    personId: z.string({ required_error: 'personId gerekli' }),
  }),
});

module.exports = { searchCharacters, getPersonDetail };
