// src/context/ThemeContext.js
import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { InteractionManager, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../theme';
import { movieThemes } from '../themes/movieThemes';

const ThemeContext = createContext();

function persistThemeTask(task) {
  InteractionManager.runAfterInteractions(() => {
    task().catch(() => {});
  });
}

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

  const toggleTheme = useCallback(() => {
    if (activeMovieThemeId) return false;
    const newMode = !isDark;
    setIsDark(newMode);
    persistThemeTask(() => AsyncStorage.setItem('userTheme', newMode ? 'dark' : 'light'));
    return true;
  }, [activeMovieThemeId, isDark]);

  const setThemeMode = useCallback((mode) => {
    if (activeMovieThemeId) return false;
    const nextIsDark = mode !== 'light';
    setIsDark(nextIsDark);
    persistThemeTask(() => AsyncStorage.setItem('userTheme', nextIsDark ? 'dark' : 'light'));
    return true;
  }, [activeMovieThemeId]);

  // Film teması seç (null geçilirse default'a döner)
  const setMovieTheme = useCallback((themeId) => {
    setActiveMovieThemeId(themeId);
    if (themeId) {
      setIsDark(true);
      persistThemeTask(() => AsyncStorage.multiSet([
        ['userTheme', 'dark'],
        ['movieTheme', themeId],
      ]));
    } else {
      persistThemeTask(() => AsyncStorage.removeItem('movieTheme'));
    }
  }, []);

  // Aktif film teması varsa onun renklerini kullan, yoksa dark/light
  const baseTheme = isDark ? darkTheme : lightTheme;
  const movieTheme = useMemo(
    () => (activeMovieThemeId ? movieThemes[activeMovieThemeId] : null),
    [activeMovieThemeId]
  );
  const theme = useMemo(
    () => (movieTheme ? { ...baseTheme, ...movieTheme.colors } : baseTheme),
    [baseTheme, movieTheme]
  );
  const value = useMemo(() => ({
    theme,
    isDark,
    toggleTheme,
    setThemeMode,
    movieTheme,
    setMovieTheme,
    activeMovieThemeId,
  }), [theme, isDark, toggleTheme, setThemeMode, movieTheme, setMovieTheme, activeMovieThemeId]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
