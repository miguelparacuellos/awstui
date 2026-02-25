import {
  ECSClient,
  ListClustersCommand,
  DescribeClustersCommand,
  ListServicesCommand,
  DescribeServicesCommand,
  UpdateServiceCommand,
} from '@aws-sdk/client-ecs';
import type { Profile } from './profiles.js';

export type Cluster = {
  arn: string;
  name: string;
  status: string;
  runningTasksCount: number;
  pendingTasksCount: number;
  activeServicesCount: number;
};

export type Service = {
  arn: string;
  name: string;
  status: string;
  runningCount: number;
  pendingCount: number;
  desiredCount: number;
};

export type Deployment = {
  id: string;
  status: string;
  runningCount: number;
  desiredCount: number;
  pendingCount: number;
  createdAt: Date | undefined;
  updatedAt: Date | undefined;
};

export type ServiceDetail = {
  arn: string;
  name: string;
  status: string;
  runningCount: number;
  pendingCount: number;
  desiredCount: number;
  deployments: Deployment[];
};

function createClient(profile: Profile): ECSClient {
  return new ECSClient({
    region: profile.region,
    profile: profile.name,
  });
}

export async function listClusters(profile: Profile): Promise<Cluster[]> {
  const client = createClient(profile);

  // Paginate ListClusters to get all ARNs
  const arns: string[] = [];
  let nextToken: string | undefined;
  do {
    const listResponse = await client.send(new ListClustersCommand({ nextToken }));
    arns.push(...(listResponse.clusterArns ?? []));
    nextToken = listResponse.nextToken;
  } while (nextToken);

  if (arns.length === 0) return [];

  // DescribeClusters accepts max 100 per call — batch in chunks
  const CHUNK_SIZE = 100;
  const chunks: string[][] = [];
  for (let i = 0; i < arns.length; i += CHUNK_SIZE) {
    chunks.push(arns.slice(i, i + CHUNK_SIZE));
  }

  const responses = await Promise.all(
    chunks.map((chunk) =>
      client.send(new DescribeClustersCommand({ clusters: chunk, include: ['STATISTICS'] })),
    ),
  );

  return responses.flatMap((r) =>
    (r.clusters ?? []).map((c) => ({
      arn: c.clusterArn ?? '',
      name: c.clusterName ?? '(unknown)',
      status: c.status ?? 'UNKNOWN',
      runningTasksCount: c.runningTasksCount ?? 0,
      pendingTasksCount: c.pendingTasksCount ?? 0,
      activeServicesCount: c.activeServicesCount ?? 0,
    })),
  );
}

export async function listServices(
  profile: Profile,
  clusterArn: string,
): Promise<Service[]> {
  const client = createClient(profile);

  // Paginate ListServicesCommand to get all ARNs
  const arns: string[] = [];
  let nextToken: string | undefined;
  do {
    const listResponse = await client.send(
      new ListServicesCommand({ cluster: clusterArn, nextToken }),
    );
    arns.push(...(listResponse.serviceArns ?? []));
    nextToken = listResponse.nextToken;
  } while (nextToken);

  if (arns.length === 0) return [];

  // DescribeServicesCommand accepts max 10 per call — batch in chunks
  const CHUNK_SIZE = 10;
  const chunks: string[][] = [];
  for (let i = 0; i < arns.length; i += CHUNK_SIZE) {
    chunks.push(arns.slice(i, i + CHUNK_SIZE));
  }

  const responses = await Promise.all(
    chunks.map((chunk) =>
      client.send(new DescribeServicesCommand({ cluster: clusterArn, services: chunk })),
    ),
  );

  return responses.flatMap((r) =>
    (r.services ?? []).map((s) => ({
      arn: s.serviceArn ?? '',
      name: s.serviceName ?? '(unknown)',
      status: s.status ?? 'UNKNOWN',
      runningCount: s.runningCount ?? 0,
      pendingCount: s.pendingCount ?? 0,
      desiredCount: s.desiredCount ?? 0,
    })),
  );
}

export async function getServiceDetail(
  profile: Profile,
  clusterArn: string,
  serviceArn: string,
): Promise<ServiceDetail> {
  const client = createClient(profile);
  const response = await client.send(
    new DescribeServicesCommand({ cluster: clusterArn, services: [serviceArn] }),
  );

  const s = response.services?.[0];
  if (!s) throw new Error('Service not found');

  return {
    arn: s.serviceArn ?? '',
    name: s.serviceName ?? '(unknown)',
    status: s.status ?? 'UNKNOWN',
    runningCount: s.runningCount ?? 0,
    pendingCount: s.pendingCount ?? 0,
    desiredCount: s.desiredCount ?? 0,
    deployments: (s.deployments ?? []).map((d) => ({
      id: d.id ?? '',
      status: d.status ?? 'UNKNOWN',
      runningCount: d.runningCount ?? 0,
      desiredCount: d.desiredCount ?? 0,
      pendingCount: d.pendingCount ?? 0,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    })),
  };
}

export async function forceNewDeployment(
  profile: Profile,
  clusterArn: string,
  serviceArn: string,
): Promise<void> {
  const client = createClient(profile);
  await client.send(
    new UpdateServiceCommand({
      cluster: clusterArn,
      service: serviceArn,
      forceNewDeployment: true,
    }),
  );
}
