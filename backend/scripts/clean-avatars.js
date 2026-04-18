const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanBase64Avatars() {
  const result = await prisma.user.updateMany({
    where: {
      avatar: {
        startsWith: 'data:image',
      },
    },
    data: {
      avatar: null,
      avatarType: null,
    },
  });
  console.log(`${result.count} kullanıcının base64 avatarı temizlendi.`);
  await prisma.$disconnect();
}

cleanBase64Avatars().catch(console.error);
