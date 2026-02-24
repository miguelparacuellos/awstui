import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Select, Spinner } from '@inkjs/ui';
import { listProfiles, type Profile } from '../aws/profiles.js';
import { useAppDispatch } from '../state/index.js';
import { Layout } from './Layout.js';

export function ProfileSelect() {
  const dispatch = useAppDispatch();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setProfiles(listProfiles());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read AWS profiles');
    } finally {
      setIsLoading(false);
    }
  }, []);

  function handleChange(value: string) {
    const profile = profiles.find((p) => p.name === value);
    if (!profile) return;
    dispatch({ type: 'SET_PROFILE', payload: profile });
    dispatch({ type: 'NAVIGATE', payload: { screen: 'main-menu' } });
  }

  const options = profiles.map((p) => ({
    label: p.region ? `${p.name}  (${p.region})` : p.name,
    value: p.name,
  }));

  function renderContent() {
    if (isLoading) return <Spinner label="Loading AWS profiles..." />;
    if (error !== null) return <Text color="red">Error: {error}</Text>;
    if (profiles.length === 0) return (
      <Box flexDirection="column" gap={1}>
        <Text color="yellow">No AWS profiles found.</Text>
        <Text dimColor>Add profiles to ~/.aws/credentials or ~/.aws/config to get started.</Text>
      </Box>
    );
    return <Select options={options} onChange={handleChange} />;
  }

  return (
    <Layout header="aws-tui › Profile Select" footer="↑↓ navigate · enter select">
      {renderContent()}
    </Layout>
  );
}
