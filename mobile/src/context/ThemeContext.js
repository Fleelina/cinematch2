// src/context/ThemeContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../theme';
import { movieThemes } from '../themes/movieThemes';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemScheme === 'dark');
  const [activeMovieThemeId, setActiveMovieThemeId] = useState(null); // null = default

  useEffect(() => {
    const loadSaved = async () => {
      const [savedMode, savedMovieTheme] = await Promise.all([
        AsyncStorage.getItem('userTheme'),
        AsyncStorage.getItem('movieTheme'),
      ]);
      if (savedMode) setIsDark(savedMode === 'dark');
      if (savedMovieTheme) setActiveMovieThemeId(savedMovieTheme);
    };
    loadSaved();
  }, []);

  const toggleTheme = async () => {
    const newMode = !isDark;
    setIsDark(newMode);
    await AsyncStorage.setItem('userTheme', newMode ? 'dark' : 'light');
  };

  // Film teması seç (null geçilirse default'a döner)
  const setMovieTheme = async (themeId) => {
    setActiveMovieThemeId(themeId);
    if (themeId) {
      await AsyncStorage.setItem('movieTheme', themeId);
    } else {
      await AsyncStorage.removeItem('movieTheme');
    }
  };

  // Aktif film teması varsa onun renklerini kullan, yoksa dark/light
  const baseTheme = isDark ? darkTheme : lightTheme;
  const movieTheme = activeMovieThemeId ? movieThemes[activeMovieThemeId] : null;
  const theme = movieTheme ? { ...baseTheme, ...movieTheme.colors } : baseTheme;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        toggleTheme,
        movieTheme,          // aktif film teması objesi (null = default)
        setMovieTheme,       // (themeId: string | null) => void
        activeMovieThemeId,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
