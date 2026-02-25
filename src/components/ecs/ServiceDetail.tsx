import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Spinner } from '@inkjs/ui';
import { useAppState, useAppDispatch } from '../../state/index.js';
import { Layout } from '../Layout.js';
import {
  getServiceDetail,
  listTasks,
  type ServiceDetail as ServiceDetailType,
  type Deployment,
  type Task,
} from '../../aws/ecs.js';
import { ConfirmDeploy } from './ConfirmDeploy.js';

function formatRelativeTime(date: Date | undefined): string {
  if (date === undefined) return 'unknown';
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function shortTaskDef(arn: string): string {
  const match = arn.match(/task-definition\/(.+)$/);
  return match ? match[1] : arn;
}

function progressBar(running: number, desired: number, width = 10): string {
  if (desired === 0) return '░'.repeat(width);
  const filled = Math.min(width, Math.round((running / desired) * width));
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function deploymentStatusColor(status: string): string {
  switch (status) {
    case 'PRIMARY':
    case 'IN_PROGRESS': return 'yellow';
    case 'COMPLETED': return 'green';
    case 'FAILED': return 'red';
    default: return 'white';
  }
}

function rolloutStateColor(state: string): string {
  switch (state) {
    case 'COMPLETED': return 'green';
    case 'FAILED': return 'red';
    case 'IN_PROGRESS': return 'yellow';
    default: return 'white';
  }
}

function groupTasksByStatus(tasks: Task[]): Record<string, number> {
  return tasks.reduce<Record<string, number>>((acc, t) => {
    acc[t.lastStatus] = (acc[t.lastStatus] ?? 0) + 1;
    return acc;
  }, {});
}

export function ServiceDetail() {
  const { activeProfile, screenParams } = useAppState();
  const dispatch = useAppDispatch();
  const clusterArn = screenParams['clusterArn'] ?? '';
  const clusterName = screenParams['clusterName'] ?? '';
  const serviceArn = screenParams['serviceArn'] ?? '';
  const serviceName = screenParams['serviceName'] ?? '';

  const [detail, setDetail] = useState<ServiceDetailType | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!activeProfile || !clusterArn || !serviceArn) return;
    const profile = activeProfile;
    let cancelled = false;
    async function run() {
      setIsLoading(true);
      setError(null);
      try {
        const [result, taskList] = await Promise.all([
          getServiceDetail(profile, clusterArn, serviceArn),
          listTasks(profile, clusterArn, serviceArn),
        ]);
        if (cancelled) return;
        setDetail(result);
        setTasks(taskList);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch service detail');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [activeProfile, clusterArn, serviceArn, refreshKey]);

  useInput((input, key) => {
    if (showConfirm) return;
    if (key.escape) {
      dispatch({
        type: 'NAVIGATE',
        payload: { screen: 'ecs-services', params: { clusterArn, clusterName } },
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
    if (input === 'd' && detail) {
      setShowConfirm(true);
      return;
    }
  });

  const profileLabel = activeProfile
    ? `${activeProfile.name}${activeProfile.region ? ` · ${activeProfile.region}` : ''}`
    : '';
  const header = `aws-tui [${profileLabel}] › ECS › ${clusterName} › ${serviceName}`;
  const footer = '↑↓ scroll · d deploy · r refresh · m menu · esc back';

  function renderTaskSummary() {
    const grouped = groupTasksByStatus(tasks);
    const running = grouped['RUNNING'] ?? 0;
    const pending = grouped['PENDING'] ?? 0;
    const stopped = grouped['STOPPED'] ?? 0;

    return (
      <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={2} paddingY={1}>
        <Text bold>Tasks</Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          <Text>
            <Text color="green" bold>● </Text>
            <Text color="green" bold>{running}</Text>
            <Text color="green"> RUNNING</Text>
          </Text>
          <Text>
            <Text color={pending > 0 ? 'yellow' : 'white'}>● </Text>
            <Text color={pending > 0 ? 'yellow' : 'white'} bold={pending > 0}>{pending}</Text>
            <Text color={pending > 0 ? 'yellow' : 'white'}> PENDING</Text>
          </Text>
          <Text dimColor>
            {'● '}{stopped}{' STOPPED'}
          </Text>
        </Box>
      </Box>
    );
  }

  function renderActiveDeployment(deployments: Deployment[]) {
    const active = deployments.find(
      (d) => d.status === 'PRIMARY' || d.status === 'IN_PROGRESS',
    );

    if (!active) {
      return (
        <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={2} paddingY={1}>
          <Text bold>Active Deployment</Text>
          <Box marginTop={1}><Text dimColor>No active deployment</Text></Box>
        </Box>
      );
    }

    const bar = progressBar(active.runningCount, active.desiredCount, 10);
    const taskDef = shortTaskDef(active.taskDefinition);
    const statusColor = deploymentStatusColor(active.status);

    return (
      <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={2} paddingY={1}>
        <Box gap={2}>
          <Text bold>Active Deployment</Text>
          <Text color={statusColor} bold>[{active.status}]</Text>
        </Box>

        <Box flexDirection="column" marginTop={1} gap={0}>
          <Box gap={2}>
            <Text dimColor>Service</Text>
            <Text bold>{serviceName}</Text>
          </Box>
          <Box gap={2}>
            <Text dimColor>Task def</Text>
            <Text>{taskDef !== '' ? taskDef : <Text dimColor>unknown</Text>}</Text>
          </Box>
        </Box>

        <Box marginTop={1} gap={2} alignItems="center">
          <Text>
            <Text dimColor>[</Text>
            <Text color={active.runningCount === active.desiredCount ? 'green' : 'yellow'}>{bar}</Text>
            <Text dimColor>]</Text>
          </Text>
          <Text bold>{active.runningCount}/{active.desiredCount}</Text>
          <Text dimColor>tasks running</Text>
        </Box>

        {active.rolloutState !== undefined && (
          <Box marginTop={1} gap={2}>
            <Text dimColor>Rollout</Text>
            <Text color={rolloutStateColor(active.rolloutState)} bold>{active.rolloutState}</Text>
          </Box>
        )}

        <Box marginTop={1} gap={2}>
          <Text dimColor>Updated</Text>
          <Text dimColor>{formatRelativeTime(active.updatedAt)}</Text>
        </Box>
      </Box>
    );
  }

  function renderContent() {
    if (isLoading) return <Spinner label="Loading service detail..." />;
    if (error !== null) return <Text color="red">Error: {error}</Text>;
    if (!detail) return <Text color="yellow">Service not found</Text>;

    return (
      <Box flexDirection="column" gap={1}>
        <Box gap={2}>
          <Text dimColor>Status</Text>
          <Text color={detail.status === 'ACTIVE' ? 'green' : 'red'} bold>{detail.status}</Text>
          <Text dimColor>·</Text>
          <Text dimColor>Desired</Text>
          <Text bold>{detail.desiredCount}</Text>
        </Box>

        {renderTaskSummary()}
        {renderActiveDeployment(detail.deployments)}

        {showConfirm && (
          <ConfirmDeploy
            serviceName={serviceName}
            clusterArn={clusterArn}
            serviceArn={serviceArn}
            onSuccess={() => {
              setShowConfirm(false);
              setRefreshKey((k) => k + 1);
            }}
            onCancel={() => setShowConfirm(false)}
          />
        )}
      </Box>
    );
  }

  return (
    <Layout header={header} footer={footer}>
      {renderContent()}
    </Layout>
  );
}
