import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Spinner } from '@inkjs/ui';
import { useAppState, useAppDispatch } from '../../state/index.js';
import { Layout } from '../Layout.js';
import { getLogEvents, type LogEvent } from '../../aws/cloudwatch.js';

const LAYOUT_OVERHEAD = 10;

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function colorizeMessage(message: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /\b(ERROR|WARN)\b/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(message)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<Text key={lastIndex}>{message.slice(lastIndex, match.index)}</Text>);
    }
    const color = match[1] === 'ERROR' ? 'red' : 'yellow';
    parts.push(
      <Text key={match.index} color={color} bold>
        {match[1]}
      </Text>,
    );
    lastIndex = match.index + match[1].length;
  }

  if (lastIndex < message.length) {
    parts.push(<Text key={lastIndex}>{message.slice(lastIndex)}</Text>);
  }

  return parts.length > 0 ? parts : <Text>{message}</Text>;
}

export function LogEvents() {
  const { activeProfile, screenParams } = useAppState();
  const dispatch = useAppDispatch();
  const logGroupName = screenParams['logGroupName'] ?? '';
  const logStreamName = screenParams['logStreamName'] ?? '';

  const [events, setEvents] = useState<LogEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const visibleRows = Math.max(1, process.stdout.rows - LAYOUT_OVERHEAD);

  useEffect(() => {
    if (!activeProfile || !logGroupName || !logStreamName) return;
    const profile = activeProfile;
    let cancelled = false;
    async function run() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getLogEvents(profile, logGroupName, logStreamName);
        if (cancelled) return;
        setEvents(result);
        setScrollOffset(0);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch log events');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [activeProfile, logGroupName, logStreamName, refreshKey]);

  useInput((input, key) => {
    if (key.escape) {
      dispatch({
        type: 'NAVIGATE',
        payload: { screen: 'cw-log-streams', params: { logGroupName } },
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
    if (key.downArrow) {
      setScrollOffset((prev) => Math.min(prev + 1, Math.max(0, events.length - visibleRows)));
      return;
    }
    if (key.upArrow) {
      setScrollOffset((prev) => Math.max(prev - 1, 0));
      return;
    }
  });

  const profileLabel = activeProfile
    ? `${activeProfile.name}${activeProfile.region ? ` · ${activeProfile.region}` : ''}`
    : '';
  const header = `aws-tui [${profileLabel}] › CloudWatch › ${logGroupName} › ${logStreamName}${!isLoading ? ` (${events.length} events)` : ''}`;
  const footer = events.length > 0
    ? `↑↓ scroll · line ${scrollOffset + 1}/${events.length} · r refresh · m menu · esc back`
    : '↑↓ scroll · r refresh · m menu · esc back';

  function renderContent() {
    if (isLoading) return <Spinner label="Loading log events..." />;
    if (error !== null) return <Text color="red">Error: {error}</Text>;
    if (events.length === 0) return <Text color="yellow">No log events found</Text>;

    const visible = events.slice(scrollOffset, scrollOffset + visibleRows);

    return (
      <Box flexDirection="column">
        {visible.map((e, i) => (
          <Box key={`${e.timestamp}-${scrollOffset + i}`}>
            <Text dimColor>{formatTime(e.timestamp)} </Text>
            {colorizeMessage(e.message.trimEnd())}
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Layout header={header} footer={footer}>
      {renderContent()}
    </Layout>
  );
}
