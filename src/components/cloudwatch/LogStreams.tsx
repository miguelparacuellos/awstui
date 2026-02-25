import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Spinner } from '@inkjs/ui';
import { useAppState, useAppDispatch } from '../../state/index.js';
import { Layout } from '../Layout.js';
import { listLogStreams, type LogStream } from '../../aws/cloudwatch.js';

const LAYOUT_OVERHEAD = 10;

function formatRelativeTime(timestamp: number | undefined): string {
  if (timestamp === undefined) return 'no events';
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function timeColor(timestamp: number | undefined): string {
  if (timestamp === undefined) return 'gray';
  const diff = Date.now() - timestamp;
  const hours = diff / 3_600_000;
  if (hours < 1) return 'green';
  if (hours < 24) return 'yellow';
  return 'gray';
}

export function LogStreams() {
  const { activeProfile, screenParams } = useAppState();
  const dispatch = useAppDispatch();
  const logGroupName = screenParams['logGroupName'] ?? '';

  const [streams, setStreams] = useState<LogStream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const visibleRows = Math.max(1, process.stdout.rows - LAYOUT_OVERHEAD);

  useEffect(() => {
    if (!activeProfile || !logGroupName) return;
    const profile = activeProfile;
    let cancelled = false;
    async function run() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await listLogStreams(profile, logGroupName);
        if (cancelled) return;
        setStreams(result);
        setSelectedIndex(0);
        setScrollOffset(0);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch log streams');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [activeProfile, logGroupName, refreshKey]);

  useInput((input, key) => {
    if (key.escape) {
      dispatch({ type: 'NAVIGATE', payload: { screen: 'cw-log-groups' } });
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
    if (key.downArrow) {
      const next = Math.min(selectedIndex + 1, streams.length - 1);
      setSelectedIndex(next);
      setScrollOffset((prev) => Math.max(prev, next - visibleRows + 1));
      return;
    }
    if (key.upArrow) {
      const next = Math.max(selectedIndex - 1, 0);
      setSelectedIndex(next);
      setScrollOffset((prev) => Math.min(prev, next));
      return;
    }
    if (key.return && streams.length > 0) {
      const stream = streams[selectedIndex];
      dispatch({
        type: 'NAVIGATE',
        payload: {
          screen: 'cw-log-events',
          params: { logGroupName, logStreamName: stream.name },
        },
      });
    }
  });

  const profileLabel = activeProfile
    ? `${activeProfile.name}${activeProfile.region ? ` · ${activeProfile.region}` : ''}`
    : '';
  const header = `aws-tui [${profileLabel}] › CloudWatch › ${logGroupName}${!isLoading ? ` (${streams.length} streams)` : ''}`;
  const footer = streams.length > 0
    ? `↑↓ navigate · enter select · ${selectedIndex + 1}/${streams.length} · r refresh · m menu · esc back`
    : '↑↓ navigate · enter select · r refresh · m menu · esc back';

  function renderContent() {
    if (isLoading) return <Spinner label="Loading log streams..." />;
    if (error !== null) return <Text color="red">Error: {error}</Text>;
    if (streams.length === 0) return <Text color="yellow">No log streams found</Text>;

    const visible = streams.slice(scrollOffset, scrollOffset + visibleRows);

    return (
      <Box flexDirection="column">
        {visible.map((s, i) => {
          const actualIndex = scrollOffset + i;
          return (
            <Box key={s.name}>
              <Text color={actualIndex === selectedIndex ? 'cyan' : 'white'} bold={actualIndex === selectedIndex}>
                {actualIndex === selectedIndex ? '> ' : '  '}
                {s.name}
              </Text>
              <Text color={timeColor(s.lastEventTime)}>
                {'  '}{formatRelativeTime(s.lastEventTime)}
              </Text>
            </Box>
          );
        })}
      </Box>
    );
  }

  return (
    <Layout header={header} footer={footer}>
      {renderContent()}
    </Layout>
  );
}
