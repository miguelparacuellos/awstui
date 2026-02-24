import React from 'react';
import { render, useInput, Text } from 'ink';
import { AppProvider, useAppState, useAppDispatch } from './state/index.js';
import { ProfileSelect } from './components/ProfileSelect.js';
import { MainMenu } from './components/MainMenu.js';
import { Layout } from './components/Layout.js';

function Placeholder() {
  const { currentScreen } = useAppState();
  const dispatch = useAppDispatch();

  useInput((_input, key) => {
    if (key.escape) dispatch({ type: 'GO_BACK' });
  });

  return (
    <Layout header={`aws-tui › ${currentScreen}`} footer="esc back">
      <Text dimColor>Coming soon</Text>
    </Layout>
  );
}

function Router() {
  const { currentScreen } = useAppState();
  switch (currentScreen) {
    case 'profile-select': return <ProfileSelect />;
    case 'main-menu': return <MainMenu />;
    case 'cw-log-groups':
    case 'cw-log-streams':
    case 'cw-log-events':
    case 'ecs-clusters':
    case 'ecs-services':
    case 'ecs-service-detail':
      return <Placeholder />;
    default: {
      const _exhaustive: never = currentScreen;
      return _exhaustive;
    }
  }
}

render(
  <AppProvider>
    <Router />
  </AppProvider>
);
