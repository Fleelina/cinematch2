import axios from 'axios';
import { getToken, clearToken, forceLogout } from './tokenStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const BASE = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3000';
const API_URL = `${BASE}/api`;

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.data?.success === true) response.data = response.data.data;
    return response;
  },
  async (error) => {
    const code = error.response?.data?.code;
    const status = error.response?.status;

    if (
      (status === 401 && code === 'TOKEN_EXPIRED') ||
      (status === 403 && code === 'TOKEN_INVALID')
    ) {
      clearToken();
      await AsyncStorage.multiRemove(['token', 'user']);
      forceLogout();
    }

    return Promise.reject(error);
  }
);

export default api;
