import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { Spinner } from '@inkjs/ui';
import { ScrollList } from 'ink-scroll-list';
import { useAppState, useAppDispatch } from '../../state/index.js';
import { Layout } from '../Layout.js';
import { listLogStreams, type LogStream } from '../../aws/cloudwatch.js';

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

  const fetchStreams = useCallback(async () => {
    if (!activeProfile || !logGroupName) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await listLogStreams(activeProfile, logGroupName);
      setStreams(result);
      setSelectedIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch log streams');
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile, logGroupName]);

  useEffect(() => {
    fetchStreams();
  }, [fetchStreams]);

  useInput((input, key) => {
    if (key.escape) {
      dispatch({ type: 'NAVIGATE', payload: { screen: 'cw-log-groups' } });
      return;
    }
    if (input === 'r') {
      fetchStreams();
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(prev + 1, streams.length - 1));
      return;
    }
    if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
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
  const footer = '↑↓ navigate · enter select · r refresh · esc back';

  function renderContent() {
    if (isLoading) return <Spinner label="Loading log streams..." />;
    if (error !== null) return <Text color="red">Error: {error}</Text>;
    if (streams.length === 0) return <Text color="yellow">No log streams found</Text>;

    return (
      <ScrollList height={15} selectedIndex={selectedIndex}>
        {streams.map((s, i) => (
          <Box key={s.name}>
            <Text color={i === selectedIndex ? 'cyan' : 'white'} bold={i === selectedIndex}>
              {i === selectedIndex ? '> ' : '  '}
              {s.name}
            </Text>
            <Text color={timeColor(s.lastEventTime)}>
              {'  '}{formatRelativeTime(s.lastEventTime)}
            </Text>
          </Box>
        ))}
      </ScrollList>
    );
  }

  return (
    <Layout header={header} footer={footer}>
      {renderContent()}
    </Layout>
  );
}
