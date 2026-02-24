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
  const listResponse = await client.send(new ListClustersCommand({}));
  const arns = listResponse.clusterArns ?? [];
  if (arns.length === 0) return [];

  const describeResponse = await client.send(
    new DescribeClustersCommand({ clusters: arns, include: ['STATISTICS'] }),
  );

  return (describeResponse.clusters ?? []).map((c) => ({
    arn: c.clusterArn ?? '',
    name: c.clusterName ?? '(unknown)',
    status: c.status ?? 'UNKNOWN',
    runningTasksCount: c.runningTasksCount ?? 0,
    pendingTasksCount: c.pendingTasksCount ?? 0,
    activeServicesCount: c.activeServicesCount ?? 0,
  }));
}

export async function listServices(
  profile: Profile,
  clusterArn: string,
): Promise<Service[]> {
  const client = createClient(profile);
  const listResponse = await client.send(
    new ListServicesCommand({ cluster: clusterArn }),
  );
  const arns = listResponse.serviceArns ?? [];
  if (arns.length === 0) return [];

  const describeResponse = await client.send(
    new DescribeServicesCommand({ cluster: clusterArn, services: arns }),
  );

  return (describeResponse.services ?? []).map((s) => ({
    arn: s.serviceArn ?? '',
    name: s.serviceName ?? '(unknown)',
    status: s.status ?? 'UNKNOWN',
    runningCount: s.runningCount ?? 0,
    pendingCount: s.pendingCount ?? 0,
    desiredCount: s.desiredCount ?? 0,
  }));
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
