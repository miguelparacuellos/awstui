import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { Spinner } from '@inkjs/ui';
import { ScrollList } from 'ink-scroll-list';
import { useAppState, useAppDispatch } from '../../state/index.js';
import { Layout } from '../Layout.js';
import { listServices, type Service } from '../../aws/ecs.js';

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

  const fetchServices = useCallback(async () => {
    if (!activeProfile || !clusterArn) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await listServices(activeProfile, clusterArn);
      setServices(result);
      setSelectedIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch services');
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile, clusterArn]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  useInput((input, key) => {
    if (key.escape) {
      dispatch({ type: 'NAVIGATE', payload: { screen: 'ecs-clusters' } });
      return;
    }
    if (input === 'r') {
      fetchServices();
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(prev + 1, services.length - 1));
      return;
    }
    if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
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
  const footer = '↑↓ navigate · enter select · r refresh · esc back';

  function renderContent() {
    if (isLoading) return <Spinner label="Loading services..." />;
    if (error !== null) return <Text color="red">Error: {error}</Text>;
    if (services.length === 0) return <Text color="yellow">No services found in this cluster</Text>;

    return (
      <ScrollList height={15} selectedIndex={selectedIndex}>
        {services.map((s, i) => (
          <Box key={s.arn} gap={2}>
            <Text color={i === selectedIndex ? 'cyan' : 'white'} bold={i === selectedIndex}>
              {i === selectedIndex ? '> ' : '  '}
              {s.name}
            </Text>
            <Text color={taskColor(s)}>● {s.runningCount}/{s.desiredCount}</Text>
            {s.pendingCount > 0 && (
              <Text color="yellow">{s.pendingCount} pending</Text>
            )}
            <Text dimColor>{s.status}</Text>
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
