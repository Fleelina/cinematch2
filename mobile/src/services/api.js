import axios from 'axios';
import { getToken, clearToken, forceLogout } from './tokenStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://10.0.2.2:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
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
      forceLogout(); // AuthContext'teki setUser(null)'u tetikler
    }

    return Promise.reject(error);
  }
);

export default api;
