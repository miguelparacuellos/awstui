import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Spinner } from '@inkjs/ui';
import { useAppState, useAppDispatch } from '../../state/index.js';
import { Layout } from '../Layout.js';
import { listClusters, type Cluster } from '../../aws/ecs.js';

const LAYOUT_OVERHEAD = 10;

function statusColor(cluster: Cluster): string {
  if (cluster.status !== 'ACTIVE') return 'red';
  if (cluster.pendingTasksCount > 0) return 'yellow';
  return 'green';
}

export function Clusters() {
  const { activeProfile } = useAppState();
  const dispatch = useAppDispatch();

  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const visibleRows = Math.max(1, process.stdout.rows - LAYOUT_OVERHEAD);

  useEffect(() => {
    if (!activeProfile) return;
    const profile = activeProfile;
    let cancelled = false;
    async function run() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await listClusters(profile);
        if (cancelled) return;
        setClusters(result);
        setSelectedIndex(0);
        setScrollOffset(0);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch clusters');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [activeProfile, refreshKey]);

  useInput((input, key) => {
    if (key.escape) {
      dispatch({ type: 'GO_BACK' });
      return;
    }
    if (input === 'r' && !isLoading) {
      setRefreshKey((k) => k + 1);
      return;
    }
    if (key.downArrow) {
      const next = Math.min(selectedIndex + 1, clusters.length - 1);
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
    if (key.return && clusters.length > 0) {
      const cluster = clusters[selectedIndex];
      dispatch({
        type: 'NAVIGATE',
        payload: {
          screen: 'ecs-services',
          params: { clusterArn: cluster.arn, clusterName: cluster.name },
        },
      });
    }
  });

  const profileLabel = activeProfile
    ? `${activeProfile.name}${activeProfile.region ? ` · ${activeProfile.region}` : ''}`
    : '';
  const header = `aws-tui [${profileLabel}] › ECS${!isLoading ? ` (${clusters.length} clusters)` : ''}`;
  const footer = clusters.length > 0
    ? `↑↓ navigate · enter select · ${selectedIndex + 1}/${clusters.length} · r refresh · esc back`
    : '↑↓ navigate · enter select · r refresh · esc back';

  function renderContent() {
    if (isLoading) return <Spinner label="Loading clusters..." />;
    if (error !== null) return <Text color="red">Error: {error}</Text>;
    if (clusters.length === 0) return <Text color="yellow">No ECS clusters found</Text>;

    const visible = clusters.slice(scrollOffset, scrollOffset + visibleRows);

    return (
      <Box flexDirection="column">
        {visible.map((c, i) => {
          const actualIndex = scrollOffset + i;
          return (
            <Box key={c.arn} gap={2}>
              <Text color={actualIndex === selectedIndex ? 'cyan' : 'white'} bold={actualIndex === selectedIndex}>
                {actualIndex === selectedIndex ? '> ' : '  '}
                {c.name}
              </Text>
              <Text color={statusColor(c)}>● {c.status}</Text>
              <Text dimColor>
                {c.activeServicesCount} services · {c.pendingTasksCount} pending tasks
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
