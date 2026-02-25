import {
  SecretsManagerClient,
  ListSecretsCommand,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import type { Profile } from './profiles.js';

export type Secret = {
  name: string;
  arn: string;
  lastChangedDate: Date | undefined;
  description: string | undefined;
};

function createClient(profile: Profile): SecretsManagerClient {
  return new SecretsManagerClient({ region: profile.region, profile: profile.name });
}

export async function listSecrets(profile: Profile): Promise<Secret[]> {
  const client = createClient(profile);
  const results: Secret[] = [];
  let nextToken: string | undefined;

  do {
    const command = new ListSecretsCommand({ NextToken: nextToken });
    const response = await client.send(command).catch((err: Error) => {
      throw new Error(`Failed to list secrets: ${err.message}`);
    });
    for (const s of response.SecretList ?? []) {
      results.push({
        name: s.Name ?? '(unknown)',
        arn: s.ARN ?? '',
        lastChangedDate: s.LastChangedDate,
        description: s.Description,
      });
    }
    nextToken = response.NextToken;
  } while (nextToken !== undefined);

  return results;
}

export async function getSecretValue(profile: Profile, secretArn: string): Promise<string> {
  const client = createClient(profile);
  const command = new GetSecretValueCommand({ SecretId: secretArn });
  const response = await client.send(command).catch((err: Error) => {
    throw new Error(`Failed to get secret value: ${err.message}`);
  });
  if (response.SecretString === undefined) {
    throw new Error('Secret has no string value (binary secrets not supported)');
  }
  return response.SecretString;
}
