import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Spinner } from '@inkjs/ui';
import { useAppState, useAppDispatch } from '../../state/index.js';
import { Layout } from '../Layout.js';
import { getSecretValue } from '../../aws/secrets.js';

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

function isFlatObject(parsed: unknown): parsed is Record<string, string | number | boolean | null> {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return false;
  return Object.values(parsed as Record<string, unknown>).every(
    (v) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null,
  );
}

function valueText(val: string | number | boolean | null): string {
  if (val === null) return 'null';
  return String(val);
}

function valueColor(val: string | number | boolean | null): string {
  if (val === null) return 'gray';
  if (typeof val === 'number') return 'cyan';
  if (typeof val === 'boolean') return 'yellow';
  return 'white';
}

export function SecretDetail() {
  const { activeProfile, screenParams } = useAppState();
  const dispatch = useAppDispatch();
  const secretArn = screenParams['secretArn'] ?? '';
  const secretName = screenParams['secretName'] ?? '';

  const [revealed, setRevealed] = useState(false);
  const [value, setValue] = useState<string | null>(null);
  const [isRevealLoading, setIsRevealLoading] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);

  useInput((input, key) => {
    if (input === ' ') {
      if (revealed) {
        setRevealed(false);
      } else if (value !== null) {
        setRevealed(true);
      } else if (!isRevealLoading && activeProfile) {
        const profile = activeProfile;
        setIsRevealLoading(true);
        setRevealError(null);
        getSecretValue(profile, secretArn)
          .then((v) => {
            setValue(v);
            setRevealed(true);
          })
          .catch((err: Error) => {
            setRevealError(err.message);
          })
          .finally(() => {
            setIsRevealLoading(false);
          });
      }
      return;
    }
    if (key.escape) {
      dispatch({
        type: 'NAVIGATE',
        payload: { screen: 'secrets-list', params: { secretArn, secretName } },
      });
      return;
    }
    if (input === 'm') {
      dispatch({ type: 'NAVIGATE', payload: { screen: 'main-menu' } });
      return;
    }
  });

  const profileLabel = activeProfile
    ? `${activeProfile.name}${activeProfile.region ? ` · ${activeProfile.region}` : ''}`
    : '';
  const header = `aws-tui [${profileLabel}] › Secrets Manager › ${secretName}`;
  const footer = 'space reveal/hide · m menu · esc back';

  function renderRevealedValue(val: string) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(val);
    } catch {
      return (
        <Box borderStyle="round" borderColor="green" paddingX={1}>
          <Text>{val}</Text>
        </Box>
      );
    }

    if (isFlatObject(parsed)) {
      const keys = Object.keys(parsed);
      const maxKeyLen = Math.max(...keys.map((k) => k.length));
      return (
        <Box borderStyle="round" borderColor="green" paddingX={1} flexDirection="column">
          {keys.map((key) => (
            <Box key={key} gap={2}>
              <Box width={maxKeyLen + 1}>
                <Text color="yellow">{key}</Text>
              </Box>
              <Text color={valueColor(parsed[key])}>{valueText(parsed[key])}</Text>
            </Box>
          ))}
        </Box>
      );
    }

    return (
      <Box borderStyle="round" borderColor="green" paddingX={1} flexDirection="column">
        <Text>{JSON.stringify(parsed, null, 2)}</Text>
      </Box>
    );
  }

  function renderSecretValue() {
    if (isRevealLoading) return <Spinner label="Fetching secret..." />;
    if (revealError !== null) return <Text color="red">Error: {revealError}</Text>;
    if (!revealed || value === null) {
      return (
        <Box gap={1}>
          <Text dimColor>••••••••••••••••••</Text>
          <Text dimColor>[hidden]</Text>
        </Box>
      );
    }
    return renderRevealedValue(value);
  }

  return (
    <Layout header={header} footer={footer}>
      <Box flexDirection="column" gap={1}>
        <Box gap={2}>
          <Text dimColor>Name</Text>
          <Text bold>{secretName}</Text>
        </Box>
        <Box gap={2}>
          <Text dimColor>ARN</Text>
          <Text dimColor>{secretArn}</Text>
        </Box>
        <Box gap={2}>
          <Text dimColor>Value</Text>
          {renderSecretValue()}
        </Box>
      </Box>
    </Layout>
  );
}
