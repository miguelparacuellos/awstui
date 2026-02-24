import React, { type ReactNode } from 'react';
import { Box, Text } from 'ink';

type LayoutProps = {
  header: string;
  footer: string;
  children: ReactNode;
};

export function Layout({ header, footer, children }: LayoutProps) {
  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">{header}</Text>
      </Box>
      <Box borderStyle="round" borderColor="gray" flexDirection="column" padding={1} flexGrow={1}>
        {children}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>{footer}</Text>
      </Box>
    </Box>
  );
}
