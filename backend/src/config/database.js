const { PrismaClient } = require('@prisma/client');

let prisma;

// Prisma client'i lazy-init ile tek instance olarak uretir.
function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient({
      errorFormat: process.env.NODE_ENV === 'production' ? 'minimal' : 'pretty',
    });
  }
  return prisma;
}

// Uygulama kapanisinda acik DB baglantisini temizlemek icin kullanilir.
async function disconnectPrisma() {
  if (prisma) {
    await prisma.$disconnect();
  }
}

module.exports = { getPrisma, disconnectPrisma };
