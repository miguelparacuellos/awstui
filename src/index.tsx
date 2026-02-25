import React from 'react';
import { render } from 'ink';
import { AppProvider, useAppState } from './state/index.js';
import { ProfileSelect } from './components/ProfileSelect.js';
import { MainMenu } from './components/MainMenu.js';
import { LogGroups } from './components/cloudwatch/LogGroups.js';
import { LogStreams } from './components/cloudwatch/LogStreams.js';
import { LogEvents } from './components/cloudwatch/LogEvents.js';
import { Clusters } from './components/ecs/Clusters.js';
import { Services } from './components/ecs/Services.js';
import { ServiceDetail } from './components/ecs/ServiceDetail.js';
import { SecretsList } from './components/secrets/SecretsList.js';
import { SecretDetail } from './components/secrets/SecretDetail.js';

function Router() {
  const { currentScreen } = useAppState();
  switch (currentScreen) {
    case 'profile-select': return <ProfileSelect />;
    case 'main-menu': return <MainMenu />;
    case 'cw-log-groups': return <LogGroups />;
    case 'cw-log-streams': return <LogStreams />;
    case 'cw-log-events': return <LogEvents />;
    case 'ecs-clusters': return <Clusters />;
    case 'ecs-services': return <Services />;
    case 'ecs-service-detail': return <ServiceDetail />;
    case 'secrets-list': return <SecretsList />;
    case 'secrets-detail': return <SecretDetail />;
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
