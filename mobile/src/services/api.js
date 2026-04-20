import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://10.0.2.2:3000/api';


const api = axios.create({
  baseURL: API_URL,
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
});

// Her istekte token otomatik ekle
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Envelope unwrap: { success: true, data: ... } → data
api.interceptors.response.use((response) => {
  if (response.data?.success === true) {
    response.data = response.data.data;
  }
  return response;
});

export default api;
