import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Spinner } from '@inkjs/ui';
import { useAppState, useAppDispatch } from '../../state/index.js';
import { Layout } from '../Layout.js';
import { listServices, type Service } from '../../aws/ecs.js';

const LAYOUT_OVERHEAD = 10;

function taskColor(service: Service): string {
  if (service.runningCount === 0) return 'red';
  if (service.pendingCount > 0) return 'yellow';
  if (service.runningCount === service.desiredCount) return 'green';
  return 'yellow';
}

export function Services() {
  const { activeProfile, screenParams } = useAppState();
  const dispatch = useAppDispatch();
  const clusterArn = screenParams['clusterArn'] ?? '';
  const clusterName = screenParams['clusterName'] ?? '';

  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const visibleRows = Math.max(1, process.stdout.rows - LAYOUT_OVERHEAD);

  useEffect(() => {
    if (!activeProfile || !clusterArn) return;
    const profile = activeProfile;
    let cancelled = false;
    async function run() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await listServices(profile, clusterArn);
        if (cancelled) return;
        setServices(result);
        setSelectedIndex(0);
        setScrollOffset(0);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch services');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [activeProfile, clusterArn, refreshKey]);

  useInput((input, key) => {
    if (key.escape) {
      dispatch({ type: 'NAVIGATE', payload: { screen: 'ecs-clusters' } });
      return;
    }
    if (input === 'r' && !isLoading) {
      setRefreshKey((k) => k + 1);
      return;
    }
    if (key.downArrow) {
      const next = Math.min(selectedIndex + 1, services.length - 1);
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
    if (key.return && services.length > 0) {
      const service = services[selectedIndex];
      dispatch({
        type: 'NAVIGATE',
        payload: {
          screen: 'ecs-service-detail',
          params: {
            clusterArn,
            clusterName,
            serviceArn: service.arn,
            serviceName: service.name,
          },
        },
      });
    }
  });

  const profileLabel = activeProfile
    ? `${activeProfile.name}${activeProfile.region ? ` · ${activeProfile.region}` : ''}`
    : '';
  const header = `aws-tui [${profileLabel}] › ECS › ${clusterName}${!isLoading ? ` (${services.length} services)` : ''}`;
  const footer = services.length > 0
    ? `↑↓ navigate · enter select · ${selectedIndex + 1}/${services.length} · r refresh · esc back`
    : '↑↓ navigate · enter select · r refresh · esc back';

  function renderContent() {
    if (isLoading) return <Spinner label="Loading services..." />;
    if (error !== null) return <Text color="red">Error: {error}</Text>;
    if (services.length === 0) return <Text color="yellow">No services found in this cluster</Text>;

    const visible = services.slice(scrollOffset, scrollOffset + visibleRows);

    return (
      <Box flexDirection="column">
        {visible.map((s, i) => {
          const actualIndex = scrollOffset + i;
          return (
            <Box key={s.arn} gap={2}>
              <Text color={actualIndex === selectedIndex ? 'cyan' : 'white'} bold={actualIndex === selectedIndex}>
                {actualIndex === selectedIndex ? '> ' : '  '}
                {s.name}
              </Text>
              <Text color={taskColor(s)}>● {s.runningCount}/{s.desiredCount}</Text>
              {s.pendingCount > 0 && (
                <Text color="yellow">{s.pendingCount} pending</Text>
              )}
              <Text dimColor>{s.status}</Text>
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
