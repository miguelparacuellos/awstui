import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { Spinner } from '@inkjs/ui';
import { ScrollList } from 'ink-scroll-list';
import { useAppState, useAppDispatch } from '../../state/index.js';
import { Layout } from '../Layout.js';
import { listLogGroups, type LogGroup } from '../../aws/cloudwatch.js';
import { useDebounce } from '../../hooks/useDebounce.js';

const LAYOUT_OVERHEAD = 10;

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
}

export function LogGroups() {
  const { activeProfile } = useAppState();
  const dispatch = useAppDispatch();

  const [groups, setGroups] = useState<LogGroup[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState('');
  const [isFiltering, setIsFiltering] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const debouncedFilter = useDebounce(filter, 400);

  const visibleRows = Math.max(1, process.stdout.rows - LAYOUT_OVERHEAD);

  useEffect(() => {
    if (!activeProfile) return;
    const profile = activeProfile;
    let cancelled = false;
    async function run() {
      setIsLoading(true);
      setError(null);
      try {
        const { groups: result, hasMore: more } = await listLogGroups(profile, debouncedFilter || undefined);
        if (cancelled) return;
        setGroups(result);
        setHasMore(more);
        setSelectedIndex(0);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch log groups');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [activeProfile, debouncedFilter, refreshKey]);

  useEffect(() => {
    setIsFiltering(filter !== debouncedFilter);
  }, [filter, debouncedFilter]);

  useInput((input, key) => {
    if (key.escape) {
      dispatch({ type: 'NAVIGATE', payload: { screen: 'main-menu' } });
      return;
    }
    if (input === 'r' && !isLoading) {
      setRefreshKey((k) => k + 1);
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(prev + 1, groups.length - 1));
      return;
    }
    if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
    if (key.return && groups.length > 0) {
      const group = groups[selectedIndex];
      dispatch({
        type: 'NAVIGATE',
        payload: { screen: 'cw-log-streams', params: { logGroupName: group.name } },
      });
    }
  });

  const profileLabel = activeProfile
    ? `${activeProfile.name}${activeProfile.region ? ` · ${activeProfile.region}` : ''}`
    : '';
  const header = `aws-tui [${profileLabel}] › CloudWatch › Log Groups${!isLoading ? ` (${groups.length})` : ''}`;
  const footer = '↑↓ navigate · enter select · type to filter · r refresh · esc back';

  function renderContent() {
    if (isLoading && groups.length === 0) return <Spinner label="Loading log groups..." />;
    if (error !== null) return <Text color="red">Error: {error}</Text>;
    if (groups.length === 0) return <Text color="yellow">No log groups found</Text>;

    return (
      <Box flexDirection="column">
        <ScrollList height={visibleRows} selectedIndex={selectedIndex}>
          {groups.map((g, i) => (
            <Box key={g.name}>
              <Text color={i === selectedIndex ? 'cyan' : 'white'} bold={i === selectedIndex}>
                {i === selectedIndex ? '> ' : '  '}
                {g.name}
              </Text>
              <Text dimColor>
                {'  '}{formatBytes(g.storedBytes)}
                {g.retentionDays !== undefined ? ` · ${g.retentionDays}d retention` : ' · never expire'}
              </Text>
            </Box>
          ))}
        </ScrollList>
        {hasMore && (
          <Text dimColor>showing 50 of many — narrow your filter to see more</Text>
        )}
      </Box>
    );
  }

  return (
    <Layout header={header} footer={footer}>
      <Box marginBottom={1}>
        <Text dimColor>Filter: </Text>
        <TextInput value={filter} onChange={setFilter} placeholder="type to filter by prefix..." />
        {isFiltering && <Text dimColor> ...</Text>}
      </Box>
      {renderContent()}
    </Layout>
  );
}
