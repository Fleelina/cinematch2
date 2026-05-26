import 'dotenv/config';

const isProd = process.env.APP_ENV === 'production';
const apiUrl = process.env.API_URL;

if (isProd && !apiUrl) {
  throw new Error(
    '[app.config.js] Prod build\'te API_URL zorunludur. .env dosyasını veya EAS secret\'i kontrol et.'
  );
}

export default {
  expo: {
    name: "CineMatch",
    slug: "cinematch",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#0f0f0f"
    },
    ios: {
      supportsTablet: true,
      jsEngine: "hermes"
    },
    android: {
      jsEngine: "hermes",
      adaptiveIcon: {
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundColor: "#0f0f0f"
      }
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "@react-native-community/datetimepicker",
      ["@sentry/react-native/expo", { organization: "cinematch", project: "react-native" }]
    ],
    extra: {
      apiUrl: apiUrl ?? 'http://localhost:3000',
    }
  }
};
