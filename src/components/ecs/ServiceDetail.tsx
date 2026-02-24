import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { Spinner } from '@inkjs/ui';
import { ScrollList } from 'ink-scroll-list';
import { useAppState, useAppDispatch } from '../../state/index.js';
import { Layout } from '../Layout.js';
import { getServiceDetail, type ServiceDetail as ServiceDetailType, type Deployment } from '../../aws/ecs.js';
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

function deploymentStatusColor(status: string): string {
  switch (status) {
    case 'PRIMARY':
    case 'IN_PROGRESS': return 'cyan';
    case 'COMPLETED': return 'gray';
    case 'FAILED': return 'red';
    default: return 'white';
  }
}

function taskCountColor(running: number, desired: number, pending: number): string {
  if (running === 0 && desired > 0) return 'red';
  if (pending > 0 || running < desired) return 'yellow';
  return 'green';
}

export function ServiceDetail() {
  const { activeProfile, screenParams } = useAppState();
  const dispatch = useAppDispatch();
  const clusterArn = screenParams['clusterArn'] ?? '';
  const clusterName = screenParams['clusterName'] ?? '';
  const serviceArn = screenParams['serviceArn'] ?? '';
  const serviceName = screenParams['serviceName'] ?? '';

  const [detail, setDetail] = useState<ServiceDetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!activeProfile || !clusterArn || !serviceArn) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await getServiceDetail(activeProfile, clusterArn, serviceArn);
      setDetail(result);
      setSelectedIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch service detail');
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile, clusterArn, serviceArn]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  useInput((input, key) => {
    if (showConfirm) return;

    if (key.escape) {
      dispatch({
        type: 'NAVIGATE',
        payload: { screen: 'ecs-services', params: { clusterArn, clusterName } },
      });
      return;
    }
    if (input === 'r') {
      fetchDetail();
      return;
    }
    if (input === 'd' && detail) {
      setShowConfirm(true);
      return;
    }
    if (key.downArrow && detail) {
      setSelectedIndex((prev) => Math.min(prev + 1, detail.deployments.length - 1));
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
  const header = `aws-tui [${profileLabel}] › ECS › ${clusterName} › ${serviceName}`;
  const footer = '↑↓ scroll · d deploy · r refresh · esc back';

  function renderContent() {
    if (isLoading) return <Spinner label="Loading service detail..." />;
    if (error !== null) return <Text color="red">Error: {error}</Text>;
    if (!detail) return <Text color="yellow">Service not found</Text>;

    const color = taskCountColor(detail.runningCount, detail.desiredCount, detail.pendingCount);

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column" borderStyle="round" borderColor="gray" padding={1}>
          <Text bold>Task Counts</Text>
          <Box gap={2} marginTop={1}>
            <Text>Running: <Text color={color} bold>{detail.runningCount}</Text></Text>
            <Text>Desired: <Text bold>{detail.desiredCount}</Text></Text>
            <Text>Pending: <Text color={detail.pendingCount > 0 ? 'yellow' : 'white'}>{detail.pendingCount}</Text></Text>
            <Text>Status: <Text color={detail.status === 'ACTIVE' ? 'green' : 'red'}>{detail.status}</Text></Text>
          </Box>
        </Box>

        <Box flexDirection="column" borderStyle="round" borderColor="gray" padding={1}>
          <Text bold>Deployments ({detail.deployments.length})</Text>
          {detail.deployments.length === 0 ? (
            <Text color="yellow" dimColor>No deployments</Text>
          ) : (
            <Box marginTop={1}>
              <ScrollList height={10} selectedIndex={selectedIndex}>
                {detail.deployments.map((d, i) => (
                  <Box key={d.id} gap={2}>
                    <Text
                      color={deploymentStatusColor(d.status)}
                      bold={d.status === 'PRIMARY' || d.status === 'IN_PROGRESS'}
                    >
                      {i === selectedIndex ? '> ' : '  '}
                      {d.status}
                    </Text>
                    <Text>
                      {d.runningCount}/{d.desiredCount}
                    </Text>
                    {d.pendingCount > 0 && (
                      <Text color="yellow">{d.pendingCount} pending</Text>
                    )}
                    <Text dimColor>{formatRelativeTime(d.updatedAt)}</Text>
                  </Box>
                ))}
              </ScrollList>
            </Box>
          )}
        </Box>

        {showConfirm && (
          <ConfirmDeploy
            serviceName={serviceName}
            clusterArn={clusterArn}
            serviceArn={serviceArn}
            onSuccess={() => {
              setShowConfirm(false);
              fetchDetail();
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
