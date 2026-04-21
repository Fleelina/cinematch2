const axios = require('axios');
const prisma = require('../prisma');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const sendPushNotification = async (tokens, title, body, data = {}) => {
  const tokenList = Array.isArray(tokens) ? tokens : [tokens];

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
    const res = await axios.post(EXPO_PUSH_URL, messages, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
    });

    const tickets = res.data?.data ?? [];

    const invalidTokens = tickets
      .map((ticket, i) => ({ ticket, token: validTokens[i] }))
      .filter(({ ticket }) => ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered')
      .map(({ token }) => token);

    if (invalidTokens.length > 0) {
      await prisma.user.updateMany({
        where: { pushToken: { in: invalidTokens } },
        data: { pushToken: null },
      });
    }
  } catch (err) {
    console.error('Push notification hatas\u0131:', err.message, err.response?.data);
  }
};

module.exports = { sendPushNotification };
