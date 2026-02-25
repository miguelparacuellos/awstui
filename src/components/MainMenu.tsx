import React from 'react';
import { useInput } from 'ink';
import { Select } from '@inkjs/ui';
import { useAppState, useAppDispatch } from '../state/index.js';
import { Layout } from './Layout.js';

const MENU_OPTIONS = [
  { label: 'CloudWatch Logs', value: 'cloudwatch' },
  { label: 'ECS', value: 'ecs' },
  { label: 'Secrets Manager', value: 'secrets' },
];

export function MainMenu() {
  const { activeProfile } = useAppState();
  const dispatch = useAppDispatch();

  useInput((input, key) => {
    if (key.escape) { /* no-op: root screen */ }
    if (input === 'p') {
      dispatch({ type: 'NAVIGATE', payload: { screen: 'profile-select', clearProfile: true } });
    }
  });

  function handleChange(value: string) {
    if (value === 'cloudwatch') dispatch({ type: 'NAVIGATE', payload: { screen: 'cw-log-groups' } });
    else if (value === 'ecs') dispatch({ type: 'NAVIGATE', payload: { screen: 'ecs-clusters' } });
    else if (value === 'secrets') dispatch({ type: 'NAVIGATE', payload: { screen: 'secrets-list' } });
  }

  const profileLabel = activeProfile !== null
    ? `${activeProfile.name}${activeProfile.region !== undefined ? ` · ${activeProfile.region}` : ''}`
    : '';
  const header = `aws-tui [${profileLabel}] › Main Menu`;

  return (
    <Layout header={header} footer="↑↓ navigate · enter select · p change profile">
      <Select options={MENU_OPTIONS} onChange={handleChange} />
    </Layout>
  );
}
