import 'dotenv/config';

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
    plugins: ["@react-native-community/datetimepicker"],
    extra: {
      apiUrl: process.env.API_URL ?? 'http://localhost:3000',
    }
  }
};