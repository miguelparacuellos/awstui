import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { Spinner } from '@inkjs/ui';
import { ScrollList } from 'ink-scroll-list';
import { useAppState, useAppDispatch } from '../../state/index.js';
import { Layout } from '../Layout.js';
import { listSecrets, type Secret } from '../../aws/secrets.js';

const LAYOUT_OVERHEAD = 10;

function formatRelativeTime(date: Date | undefined): string {
  if (date === undefined) return 'unknown';
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function SecretsList() {
  const { activeProfile } = useAppState();
  const dispatch = useAppDispatch();

  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [filter, setFilter] = useState('');
  const [focusArea, setFocusArea] = useState<'input' | 'list'>('input');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const visibleRows = Math.max(1, process.stdout.rows - LAYOUT_OVERHEAD);

  const filtered = secrets.filter((s) =>
    s.name.toLowerCase().includes(filter.toLowerCase()),
  );

  useEffect(() => {
    if (!activeProfile) return;
    const profile = activeProfile;
    let cancelled = false;
    async function run() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await listSecrets(profile);
        if (cancelled) return;
        setSecrets(result);
        setSelectedIndex(0);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch secrets');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [activeProfile, refreshKey]);

  useInput((input, key) => {
    if (focusArea === 'input') {
      if (key.downArrow) {
        setFocusArea('list');
        setSelectedIndex(0);
        return;
      }
      if (key.escape) {
        dispatch({ type: 'NAVIGATE', payload: { screen: 'main-menu' } });
        return;
      }
    } else {
      if (key.escape) {
        setFocusArea('input');
        return;
      }
      if (key.upArrow) {
        if (selectedIndex === 0) {
          setFocusArea('input');
        } else {
          setSelectedIndex((prev) => prev - 1);
        }
        return;
      }
      if (key.downArrow) {
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        return;
      }
      if (key.return && filtered.length > 0) {
        const secret = filtered[selectedIndex];
        dispatch({
          type: 'NAVIGATE',
          payload: {
            screen: 'secrets-detail',
            params: { secretArn: secret.arn, secretName: secret.name },
          },
        });
        return;
      }
      if (input === 'r' && !isLoading) {
        setRefreshKey((k) => k + 1);
        return;
      }
      if (input === 'm') {
        dispatch({ type: 'NAVIGATE', payload: { screen: 'main-menu' } });
        return;
      }
    }
  });

  const profileLabel = activeProfile
    ? `${activeProfile.name}${activeProfile.region ? ` · ${activeProfile.region}` : ''}`
    : '';
  const countLabel = !isLoading ? ` (${filtered.length}/${secrets.length} secrets)` : '';
  const header = `aws-tui [${profileLabel}] › Secrets Manager${countLabel}`;
  const footer = '↑↓ navigate · enter select · type to filter · r refresh · m menu · esc back';

  function renderContent() {
    if (isLoading && secrets.length === 0) return <Spinner label="Loading secrets..." />;
    if (error !== null) return <Text color="red">Error: {error}</Text>;
    if (filtered.length === 0) {
      return <Text color="yellow">{secrets.length === 0 ? 'No secrets found' : 'No secrets match filter'}</Text>;
    }

    return (
      <ScrollList height={visibleRows} selectedIndex={selectedIndex}>
        {filtered.map((s, i) => (
          <Box key={s.arn} gap={2}>
            <Text color={i === selectedIndex && focusArea === 'list' ? 'cyan' : 'white'} bold={i === selectedIndex && focusArea === 'list'}>
              {i === selectedIndex && focusArea === 'list' ? '> ' : '  '}
              {s.name}
            </Text>
            <Text dimColor>{formatRelativeTime(s.lastChangedDate)}</Text>
          </Box>
        ))}
      </ScrollList>
    );
  }

  return (
    <Layout header={header} footer={footer}>
      <Box marginBottom={1}>
        <Text dimColor>Filter: </Text>
        <TextInput
          value={filter}
          onChange={setFilter}
          placeholder="type to filter..."
          focus={focusArea === 'input'}
        />
      </Box>
      {renderContent()}
    </Layout>
  );
}
