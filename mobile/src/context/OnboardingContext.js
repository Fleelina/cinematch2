import React, { createContext, useContext, useState } from 'react';

const OnboardingContext = createContext();

export const OnboardingProvider = ({ children }) => {
  const [data, setData] = useState({
    username: '',
    email: '',
    password: '',
    gender: null,       // 'male' | 'female' | 'other' | 'prefer_not_to_say'
    birthDate: null,    // Date object
    avatar: null,       // S3 URL or null
    movies: [],         // [{ tmdbId, title, poster, year }]
    genres: [],         // fallback genre seçimi
  });

  const update = (fields) => setData((prev) => ({ ...prev, ...fields }));

  return (
    <OnboardingContext.Provider value={{ data, update }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => useContext(OnboardingContext);
