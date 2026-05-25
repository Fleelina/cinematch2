import React, { createContext, useContext } from 'react';

let openDrawerHandler = () => {};

export function openAppDrawer() {
  openDrawerHandler();
}

export function registerDrawerOpenHandler(handler) {
  openDrawerHandler = handler;
  return () => {
    if (openDrawerHandler === handler) {
      openDrawerHandler = () => {};
    }
  };
}

const DrawerContext = createContext({
  openDrawer: openAppDrawer,
});

const drawerContextValue = {
  openDrawer: openAppDrawer,
};

export function DrawerProvider({ children }) {
  return (
    <DrawerContext.Provider value={drawerContextValue}>
      {children}
    </DrawerContext.Provider>
  );
}

export function useAppDrawer() {
  return useContext(DrawerContext);
}
