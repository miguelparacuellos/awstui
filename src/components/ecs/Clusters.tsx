import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { Spinner } from '@inkjs/ui';
import { ScrollList } from 'ink-scroll-list';
import { useAppState, useAppDispatch } from '../../state/index.js';
import { Layout } from '../Layout.js';
import { listClusters, type Cluster } from '../../aws/ecs.js';

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

  const fetchClusters = useCallback(async () => {
    if (!activeProfile) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await listClusters(activeProfile);
      setClusters(result);
      setSelectedIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch clusters');
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile]);

  useEffect(() => {
    fetchClusters();
  }, [fetchClusters]);

  useInput((input, key) => {
    if (key.escape) {
      dispatch({ type: 'GO_BACK' });
      return;
    }
    if (input === 'r') {
      fetchClusters();
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(prev + 1, clusters.length - 1));
      return;
    }
    if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
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
  const footer = '↑↓ navigate · enter select · r refresh · esc back';

  function renderContent() {
    if (isLoading) return <Spinner label="Loading clusters..." />;
    if (error !== null) return <Text color="red">Error: {error}</Text>;
    if (clusters.length === 0) return <Text color="yellow">No ECS clusters found</Text>;

    return (
      <ScrollList height={15} selectedIndex={selectedIndex}>
        {clusters.map((c, i) => (
          <Box key={c.arn} gap={2}>
            <Text color={i === selectedIndex ? 'cyan' : 'white'} bold={i === selectedIndex}>
              {i === selectedIndex ? '> ' : '  '}
              {c.name}
            </Text>
            <Text color={statusColor(c)}>● {c.status}</Text>
            <Text dimColor>
              {c.runningTasksCount} running · {c.pendingTasksCount} pending · {c.activeServicesCount} services
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
