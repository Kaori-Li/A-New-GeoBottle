import React, { createContext, useContext } from 'react';
import useLocation from '../hooks/useLocation';

const LocationContext = createContext(null);

export const LocationProvider = ({ children }) => {
  const locationState = useLocation();

  return (
    <LocationContext.Provider value={locationState}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocationContext = () => {
  const context = useContext(LocationContext);

  if (!context) {
    throw new Error('useLocationContext 必须在 LocationProvider 内使用');
  }

  return context;
};
