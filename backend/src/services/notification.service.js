const axios = require('axios');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Expo Push Notification gönder
 * @param {string|string[]} tokens - Expo push token(lar)
 * @param {string} title - Bildirim başlığı
 * @param {string} body - Bildirim içeriği
 * @param {object} data - Ek veri (navigation için)
 */
const sendPushNotification = async (tokens, title, body, data = {}) => {
  const tokenList = Array.isArray(tokens) ? tokens : [tokens];

  // Geçersiz token'ları filtrele
  const validTokens = tokenList.filter(
    (t) => t && (t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken['))
  );

  if (validTokens.length === 0) return;

  const messages = validTokens.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high',
    channelId: 'default',
  }));

  try {
    await axios.post(EXPO_PUSH_URL, messages, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
    });
  } catch (err) {
    console.error('Push notification hatası:', err.message);
  }
};

module.exports = { sendPushNotification };
