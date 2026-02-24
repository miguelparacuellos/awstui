import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { Spinner } from '@inkjs/ui';
import { ScrollList } from 'ink-scroll-list';
import { useAppState, useAppDispatch } from '../../state/index.js';
import { Layout } from '../Layout.js';
import { getLogEvents, type LogEvent } from '../../aws/cloudwatch.js';

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
  const [selectedIndex, setSelectedIndex] = useState(0);

  const fetchEvents = useCallback(async () => {
    if (!activeProfile || !logGroupName || !logStreamName) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await getLogEvents(activeProfile, logGroupName, logStreamName);
      setEvents(result);
      setSelectedIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch log events');
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile, logGroupName, logStreamName]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useInput((input, key) => {
    if (key.escape) {
      dispatch({
        type: 'NAVIGATE',
        payload: { screen: 'cw-log-streams', params: { logGroupName } },
      });
      return;
    }
    if (input === 'r') {
      fetchEvents();
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(prev + 1, events.length - 1));
      return;
    }
    if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
  });

  const profileLabel = activeProfile
    ? `${activeProfile.name}${activeProfile.region ? ` · ${activeProfile.region}` : ''}`
    : '';
  const header = `aws-tui [${profileLabel}] › CloudWatch › ${logGroupName} › ${logStreamName}${!isLoading ? ` (${events.length} events)` : ''}`;
  const footer = '↑↓ scroll · r refresh · esc back';

  function renderContent() {
    if (isLoading) return <Spinner label="Loading log events..." />;
    if (error !== null) return <Text color="red">Error: {error}</Text>;
    if (events.length === 0) return <Text color="yellow">No log events found</Text>;

    return (
      <ScrollList height={20} selectedIndex={selectedIndex}>
        {events.map((e, i) => (
          <Box key={`${e.timestamp}-${i}`}>
            <Text dimColor>{formatTime(e.timestamp)} </Text>
            {colorizeMessage(e.message.trimEnd())}
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
