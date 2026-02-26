import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { Spinner } from '@inkjs/ui';
import { useAppState, useAppDispatch } from '../../state/index.js';
import { Layout } from '../Layout.js';
import { listServices, type Service } from '../../aws/ecs.js';

const LAYOUT_OVERHEAD = 11;

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
  const [filter, setFilter] = useState('');
  const [filterMode, setFilterMode] = useState(false);
  const [filterError, setFilterError] = useState(false);

  const visibleRows = Math.max(1, process.stdout.rows - LAYOUT_OVERHEAD);

  const filteredServices = useMemo(() => {
    if (!filter) return services;
    try {
      const re = new RegExp(filter, 'i');
      setFilterError(false);
      return services.filter((s) => re.test(s.name));
    } catch {
      setFilterError(true);
      return services;
    }
  }, [services, filter]);

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

  useEffect(() => {
    setSelectedIndex(0);
    setScrollOffset(0);
  }, [filter]);

  useInput((input, key) => {
    if (filterMode) {
      if (key.escape) {
        setFilterMode(false);
      }
      return;
    }
    if (key.escape) {
      dispatch({ type: 'NAVIGATE', payload: { screen: 'ecs-clusters' } });
      return;
    }
    if (input === '/') {
      setFilterMode(true);
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
      const next = Math.min(selectedIndex + 1, filteredServices.length - 1);
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
    if (key.return && filteredServices.length > 0) {
      const service = filteredServices[selectedIndex];
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
  const countLabel = !isLoading
    ? filter
      ? ` (${filteredServices.length}/${services.length} services)`
      : ` (${services.length} services)`
    : '';
  const header = `aws-tui [${profileLabel}] › ECS › ${clusterName}${countLabel}`;
  const footer = filterMode
    ? 'type regex · esc done'
    : filteredServices.length > 0
      ? `↑↓ navigate · enter select · ${selectedIndex + 1}/${filteredServices.length} · / filter · r refresh · m menu · esc back`
      : '↑↓ navigate · enter select · / filter · r refresh · m menu · esc back';

  function renderContent() {
    if (isLoading) return <Spinner label="Loading services..." />;
    if (error !== null) return <Text color="red">Error: {error}</Text>;
    if (services.length === 0) return <Text color="yellow">No services found in this cluster</Text>;
    if (filteredServices.length === 0) return <Text color="yellow">No services match filter</Text>;

    const visible = filteredServices.slice(scrollOffset, scrollOffset + visibleRows);

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
      <Box marginBottom={1} gap={1}>
        <Text dimColor>Filter:</Text>
        <TextInput
          value={filter}
          onChange={setFilter}
          placeholder="press / then type a regex..."
          focus={filterMode}
        />
        {filterError && <Text color="red">invalid regex</Text>}
      </Box>
      {renderContent()}
    </Layout>
  );
}
