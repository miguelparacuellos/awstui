import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { ConfirmInput, Spinner } from '@inkjs/ui';
import { useAppState } from '../../state/index.js';
import { forceNewDeployment } from '../../aws/ecs.js';

type ConfirmDeployProps = {
  serviceName: string;
  clusterArn: string;
  serviceArn: string;
  onSuccess: () => void;
  onCancel: () => void;
};

export function ConfirmDeploy({
  serviceName,
  clusterArn,
  serviceArn,
  onSuccess,
  onCancel,
}: ConfirmDeployProps) {
  const { activeProfile } = useAppState();
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!activeProfile) return;
    setIsDeploying(true);
    setError(null);
    try {
      await forceNewDeployment(activeProfile, clusterArn, serviceArn);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deploy failed');
      setIsDeploying(false);
    }
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="yellow"
      padding={1}
      marginTop={1}
    >
      <Text bold color="yellow">Force New Deployment</Text>
      <Text>
        Service: <Text bold>{serviceName}</Text>
      </Text>
      <Box marginTop={1}>
        <Text color="yellow">
          This will stop current tasks and start new ones. Continue?
        </Text>
      </Box>
      <Box marginTop={1}>
        {isDeploying ? (
          <Spinner label="Deploying..." />
        ) : error !== null ? (
          <Text color="red">Error: {error}</Text>
        ) : (
          <ConfirmInput
            onConfirm={handleConfirm}
            onCancel={onCancel}
          />
        )}
      </Box>
    </Box>
  );
}
