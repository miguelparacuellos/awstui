import React, { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { Profile } from '../aws/profiles.js';

export type ScreenName =
  | 'profile-select' | 'main-menu'
  | 'cw-log-groups' | 'cw-log-streams' | 'cw-log-events'
  | 'ecs-clusters' | 'ecs-services' | 'ecs-service-detail';

export type AppState = {
  activeProfile: Profile | null;
  currentScreen: ScreenName;
  screenParams: Record<string, string>;
};

type AppAction =
  | { type: 'SET_PROFILE'; payload: Profile }
  | { type: 'NAVIGATE'; payload: { screen: ScreenName; params?: Record<string, string>; clearProfile?: boolean } }
  | { type: 'GO_BACK' };

const initialState: AppState = {
  activeProfile: null,
  currentScreen: 'profile-select',
  screenParams: {},
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_PROFILE': return { ...state, activeProfile: action.payload };
    case 'NAVIGATE': return {
      ...state,
      currentScreen: action.payload.screen,
      screenParams: action.payload.params ?? {},
      ...(action.payload.clearProfile === true ? { activeProfile: null } : {}),
    };
    case 'GO_BACK': return { ...state, currentScreen: 'main-menu', screenParams: {} };
    default: return state;
  }
}

const AppStateContext = createContext<AppState | null>(null);
const AppDispatchContext = createContext<React.Dispatch<AppAction> | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>{children}</AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (ctx === null) throw new Error('useAppState must be used within AppProvider');
  return ctx;
}

export function useAppDispatch(): React.Dispatch<AppAction> {
  const ctx = useContext(AppDispatchContext);
  if (ctx === null) throw new Error('useAppDispatch must be used within AppProvider');
  return ctx;
}
