const prisma = require('../prisma');
const { ApiError } = require('../middleware/errorHandler');
const { sendPushNotification } = require('./notification.service');
const { getCommonMovies } = require('./match.service');

// Mesajlasma sorgularinda tekrar eden select alanlarini merkezilesir.
// Boylece her yerde ayni veri sekli doner ve bakim kolaylasir.
const USER_SELECT = { id: true, name: true, avatar: true, avatarType: true, pushToken: true };
const MOVIE_SELECT = { id: true, title: true, poster: true, tmdbId: true, year: true };
const DELETED_MESSAGE_TEXT = 'Bu mesaj silindi.';

// Veritabani kaydini istemcinin tuketecegi mesaja donusturur.
// `mine` alani istemcinin kendi mesajini ayirt etmesi icin eklenir.
// SYSTEM tipindeki mesajlar hicbir zaman kullanicinin kendi mesaji sayilmaz.
const formatMessage = (message, userId) => ({
  id: message.id,
  text: message.deletedForAll ? DELETED_MESSAGE_TEXT : message.text,
  senderId: message.senderId,
  type: message.type,
  movie: (message.deletedForAll) ? null : (message.movie || null),
  createdAt: message.createdAt,
  readAt: message.readAt,
  mine: message.type === 'USER' && message.senderId === userId,
  deletedForAll: message.deletedForAll || false,
});

// Kullanicinin tum konusmalarini doner ve her eslesmeye son mesaji ekler.
// Mesajlar `createdAt desc` ile siralanir, `take: 1` sayesinde sadece en guncel
// kayit cekilir; boylece gereksiz veri tasimasi azalir.
const getConversations = async (userId) => {
  const matches = await prisma.match.findMany({
    where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
    include: {
      user1: { select: USER_SELECT },
      user2: { select: USER_SELECT },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          text: true,
          senderId: true,
          type: true,
          movie: { select: MOVIE_SELECT },
          createdAt: true,
          readAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const result = matches.map((match) => {
    const other = match.user1Id === userId ? match.user2 : match.user1;
    const lastMessage = match.messages[0] || null;

    return {
      matchId: match.id,
      matchedAt: match.createdAt,
      user: other,
      lastMessage: lastMessage ? formatMessage(lastMessage, userId) : null,
    };
  });

  // Ilk siralama eslesmenin olusma zamanina gore gelir.
  // Mesajlasma baslamamis eslesmelerde `lastMessage` olmadigi icin `matchedAt`
  // fallback olarak kullanilir ve liste kullanici beklentisine uygun kalir.
  return result.sort((a, b) => {
    const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(a.matchedAt);
    const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(b.matchedAt);
    return bTime - aTime;
  });
};

// `matchId` ve `userId` ile eslesmeyi dogrular.
// Kullanici bu konusmanin parcasi degilse `null` doner.
// Yetki kontrolu burada yapilir cunku mesaj akisindaki tum islemler bu eslesmeye ihtiyac duyar.
const findMatchForUser = (matchId, userId) =>
  prisma.match.findFirst({
    where: { id: matchId, OR: [{ user1Id: userId }, { user2Id: userId }] },
    include: {
      user1: { select: USER_SELECT },
      user2: { select: USER_SELECT },
    },
  });

// Konusmanin tum mesajlarini kronolojik sirayla doner.
// `userId` opsiyoneldir; socket tarafinda bazi akislar ham kayitlara ihtiyac duyar.
const getMessages = async (matchId, userId) => {
  const messages = await prisma.message.findMany({
    where: {
      matchId,
      ...(userId ? { NOT: { deletedFor: { has: userId } } } : {}),
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      text: true,
      senderId: true,
      type: true,
      movie: { select: MOVIE_SELECT },
      createdAt: true,
      readAt: true,
      deletedFor: true,
      deletedForAll: true,
    },
  });

  return userId ? messages.map((message) => formatMessage(message, userId)) : messages;
};

// Dusuk seviye mesaj olusturma yardimcisidir.
// Is kurali uygulamaz, dogrudan veritabanina yazar.
// `sendMessage` ve socket handler ortak secim alanlarini buradan kullanir.
const createMessage = (matchId, senderId, text, type = 'USER', movieId = null) =>
  prisma.message.create({
    data: {
      matchId,
      senderId,
      movieId,
      text,
      type,
    },
    select: {
      id: true,
      text: true,
      senderId: true,
      type: true,
      movie: { select: MOVIE_SELECT },
      createdAt: true,
      readAt: true,
    },
  });

// Chat ekrani acilirken mesajlar ve ortak filmler birlikte yuklenir.
// Sorgular paralel calistirilir; boylece bekleme suresi gereksiz yere uzamaz.
const fetchMessages = async (matchId, userId) => {
  const match = await findMatchForUser(matchId, userId);
  if (!match) throw new ApiError(404, 'Konusma bulunamadi');

  const [messages, commonMovies] = await Promise.all([
    getMessages(matchId, userId),
    getCommonMovies(match.user1Id, match.user2Id, 4),
  ]);
  const other = match.user1Id === userId ? match.user2 : match.user1;
  return { messages, other, commonMovies };
};

const sendMessage = async (matchId, userId, text, movieId = null) => {
  const match = await findMatchForUser(matchId, userId);
  if (!match) throw new ApiError(404, 'Konusma bulunamadi');

  // Film onerisi eklendiyse, secilen filmin iki kullanicinin ortak listesinde
  // yer aldigi dogrulanir. Bu kontrol istemci tarafinin tek basina yeterli
  // olmadigi durumlarda veri tutarliligini ve erisim sinirlarini korur.
  if (movieId) {
    const commonMovies = await getCommonMovies(match.user1Id, match.user2Id);
    if (!commonMovies.some((movie) => movie.id === movieId)) {
      throw new ApiError(400, 'Secilen film ortak filmler arasinda degil');
    }
  }

  const message = await createMessage(matchId, userId, text, 'USER', movieId);

  const sender = match.user1Id === userId ? match.user1 : match.user2;
  const other = match.user1Id === userId ? match.user2 : match.user1;
  // Film eklendiyse bildirim onizlemesinde baslik metnin onune eklenir.
  const pushText = message.movie ? `${message.movie.title}: ${text}` : text;

  // Push bildirimi ana mesaj akisina gecikme eklememelidir.
  // `setImmediate`, bildirimi sonraki event loop turuna birakir.
  // Alicinin `pushToken` bilgisi yoksa bildirim sessizce atlanir.
  setImmediate(() => {
    if (other?.pushToken) {
      sendPushNotification(other.pushToken, sender.name, pushText, { screen: 'Chat', matchId });
    }
  });

  return formatMessage(message, userId);
};

const deleteMessage = async (messageId, userId, scope) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, senderId: true, matchId: true, deletedFor: true },
  });

  if (!message) throw new ApiError(404, 'Mesaj bulunamadi');

  // Yetkisiz erisimi engelle: kullanici bu matchin parcasi olmali
  const match = await prisma.match.findFirst({
    where: { id: message.matchId, OR: [{ user1Id: userId }, { user2Id: userId }] },
  });
  if (!match) throw new ApiError(403, 'Bu mesaja erisim izniniz yok');

  if (scope === 'all') {
    // Sadece kendi mesajini herkesten silebilir
    if (message.senderId !== userId) throw new ApiError(403, 'Sadece kendi mesajinizi herkesten silebilirsiniz');
    await prisma.message.update({
      where: { id: messageId },
      data: { deletedForAll: true, text: '' },
    });
  } else {
    // Benden sil: userId'yi deletedFor listesine ekle
    const already = message.deletedFor.includes(userId);
    if (!already) {
      await prisma.message.update({
        where: { id: messageId },
        data: { deletedFor: { push: userId } },
      });
    }
  }

  return { success: true };
};

module.exports = {
  getConversations,
  fetchMessages,
  sendMessage,
  findMatchForUser,
  getMessages,
  createMessage,
  formatMessage,
  deleteMessage,
};
