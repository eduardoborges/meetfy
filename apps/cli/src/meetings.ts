import { getClient } from './auth';
import { getUpcomingMeetings } from './calendar';
import { listAccounts } from './config';
import type { Meeting } from './types';

export interface MergedMeetingsResult {
  meetings: Meeting[];
  accounts: string[];
  failedAccounts: string[];
}

function sortMeetings(meetings: Meeting[]): Meeting[] {
  const sorted: Meeting[] = [];
  for (const meeting of meetings) {
    const startMs = meeting.startMs ?? Infinity;
    const index = sorted.findIndex((existing) => startMs < (existing.startMs ?? Infinity));
    if (index === -1) sorted.push(meeting);
    else sorted.splice(index, 0, meeting);
  }
  return sorted;
}

export async function getMergedUpcomingMeetings(
  account?: string,
  limit = 10,
): Promise<MergedMeetingsResult> {
  const accounts = account ? [account] : listAccounts();
  const failedAccounts: string[] = [];
  const allMeetings: Meeting[] = [];

  await Promise.all(
    accounts.map(async (email) => {
      const client = await getClient(email);
      if (!client) {
        failedAccounts.push(email);
        return;
      }
      try {
        const meetings = await getUpcomingMeetings(client, limit);
        allMeetings.push(
          ...meetings.map((meeting) => ({
            ...meeting,
            accountEmail: email,
          })),
        );
      } catch {
        failedAccounts.push(email);
      }
    }),
  );

  return {
    meetings: sortMeetings(allMeetings).slice(0, limit),
    accounts,
    failedAccounts,
  };
}
