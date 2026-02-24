import React from 'react';
import { useInput } from 'ink';
import { Select } from '@inkjs/ui';
import { useAppState, useAppDispatch } from '../state/index.js';
import { Layout } from './Layout.js';

const MENU_OPTIONS = [
  { label: 'CloudWatch Logs', value: 'cloudwatch' },
  { label: 'ECS', value: 'ecs' },
];

export function MainMenu() {
  const { activeProfile } = useAppState();
  const dispatch = useAppDispatch();

  useInput((_input, key) => {
    if (key.escape) { /* no-op: root screen */ }
  });

  function handleChange(value: string) {
    if (value === 'cloudwatch') dispatch({ type: 'NAVIGATE', payload: { screen: 'cw-log-groups' } });
    else if (value === 'ecs') dispatch({ type: 'NAVIGATE', payload: { screen: 'ecs-clusters' } });
  }

  const profileLabel = activeProfile !== null
    ? `${activeProfile.name}${activeProfile.region !== undefined ? ` · ${activeProfile.region}` : ''}`
    : '';
  const header = `aws-tui [${profileLabel}] › Main Menu`;

  return (
    <Layout header={header} footer="↑↓ navigate · enter select">
      <Select options={MENU_OPTIONS} onChange={handleChange} />
    </Layout>
  );
}
