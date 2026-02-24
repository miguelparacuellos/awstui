import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  DescribeLogStreamsCommand,
  GetLogEventsCommand,
  OrderBy,
} from '@aws-sdk/client-cloudwatch-logs';
import type { Profile } from './profiles.js';

export type LogGroup = {
  name: string;
  storedBytes: number;
  retentionDays: number | undefined;
};

export type LogStream = {
  name: string;
  lastEventTime: number | undefined;
};

export type LogEvent = {
  timestamp: number;
  message: string;
};

function createClient(profile: Profile): CloudWatchLogsClient {
  return new CloudWatchLogsClient({
    region: profile.region,
    profile: profile.name,
  });
}

export async function listLogGroups(
  profile: Profile,
  filterPattern?: string,
): Promise<LogGroup[]> {
  const client = createClient(profile);
  const command = new DescribeLogGroupsCommand({
    ...(filterPattern ? { logGroupNamePrefix: filterPattern } : {}),
    limit: 50,
  });
  const response = await client.send(command);

  return (response.logGroups ?? []).map((lg) => ({
    name: lg.logGroupName ?? '(unknown)',
    storedBytes: lg.storedBytes ?? 0,
    retentionDays: lg.retentionInDays,
  }));
}

export async function listLogStreams(
  profile: Profile,
  logGroupName: string,
): Promise<LogStream[]> {
  const client = createClient(profile);
  const command = new DescribeLogStreamsCommand({
    logGroupName,
    orderBy: OrderBy.LastEventTime,
    descending: true,
    limit: 50,
  });
  const response = await client.send(command);

  return (response.logStreams ?? []).map((ls) => ({
    name: ls.logStreamName ?? '(unknown)',
    lastEventTime: ls.lastEventTimestamp,
  }));
}

export async function getLogEvents(
  profile: Profile,
  logGroupName: string,
  logStreamName: string,
): Promise<LogEvent[]> {
  const client = createClient(profile);
  const command = new GetLogEventsCommand({
    logGroupName,
    logStreamName,
    startFromHead: false,
    limit: 200,
  });
  const response = await client.send(command);

  return (response.events ?? []).map((e) => ({
    timestamp: e.timestamp ?? 0,
    message: e.message ?? '',
  }));
}
