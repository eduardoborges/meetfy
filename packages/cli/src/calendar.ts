import dayjs from 'dayjs';
import { google } from 'googleapis';
import type { calendar_v3 } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import type { Meeting, CreateMeetingInput } from './types';

/** Upper bound for events.list when using orderBy startTime (exclusive). */
const LIST_WINDOW_DAYS = 180;

/** Fetched per calendar; must be >1 so we can skip leading all-day events. */
const LIST_MAX_RESULTS = 50;

function isAllDayEvent(event: calendar_v3.Schema$Event): boolean {
  return Boolean(event.start?.date && !event.start?.dateTime);
}

function eventStartMs(event: calendar_v3.Schema$Event): number | null {
  const start = event.start?.dateTime ?? event.start?.date;
  if (!start) return null;
  return new Date(start).getTime();
}

function meetingFromEvent(event: calendar_v3.Schema$Event): Meeting | null {
  const start = event.start?.dateTime || event.start?.date;
  const end = event.end?.dateTime || event.end?.date;
  if (!start || !end) return null;
  return {
    id: event.id ?? '',
    title: event.summary ?? 'Untitled',
    startTime: new Date(start).toLocaleString(),
    endTime: new Date(end).toLocaleString(),
    hangoutLink: event.hangoutLink ?? undefined,
    location: event.location ?? undefined,
  };
}

export async function createMeeting(
  client: OAuth2Client,
  input: CreateMeetingInput,
): Promise<Meeting | null> {
  try {
    const calendar = google.calendar({ version: 'v3', auth: client });
    const startTime = dayjs().add(5, 'minute');
    const endTime = startTime.add(30, 'minute');
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: input.title,
        description: input.description,
        start: { dateTime: startTime.toISOString(), timeZone: tz },
        end: { dateTime: endTime.toISOString(), timeZone: tz },
        attendees: input.participants.map((email) => ({ email: email.trim() })),
        conferenceData: {
          createRequest: {
            requestId: `meetfy-${dayjs().valueOf()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 10 },
            { method: 'popup', minutes: 5 },
          ],
        },
      },
      conferenceDataVersion: 1,
      sendUpdates: 'all',
    });

    if (!res.data.id || !res.data.hangoutLink) return null;
    return {
      id: res.data.id,
      title: input.title,
      startTime: startTime.toDate().toLocaleString(),
      endTime: endTime.toDate().toLocaleString(),
      hangoutLink: res.data.hangoutLink,
    };
  } catch {
    return null;
  }
}

export async function getNextMeeting(client: OAuth2Client): Promise<Meeting | null> {
  try {
    const calendar = google.calendar({ version: 'v3', auth: client });
    const timeMin = dayjs().toISOString();
    const timeMax = dayjs().add(LIST_WINDOW_DAYS, 'day').toISOString();

    let ids: string[];
    try {
      const { data: calList } = await calendar.calendarList.list({
        minAccessRole: 'reader',
        maxResults: 250,
      });
      const calendarIds = (calList.items ?? [])
        .map((c) => c.id)
        .filter((id): id is string => Boolean(id));
      ids = calendarIds.length > 0 ? calendarIds : ['primary'];
    } catch {
      ids = ['primary'];
    }

    const listResults = await Promise.all(
      ids.map((calendarId) =>
        calendar.events
          .list({
            calendarId,
            timeMin,
            timeMax,
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: LIST_MAX_RESULTS,
          })
          .catch(() => ({ data: { items: [] as calendar_v3.Schema$Event[] } })),
      ),
    );

    let best: calendar_v3.Schema$Event | null = null;
    let bestMs = Infinity;

    for (const res of listResults) {
      const event = (res.data.items ?? []).find((e) => !isAllDayEvent(e));
      if (!event) continue;
      const ms = eventStartMs(event);
      if (ms === null || ms >= bestMs) continue;
      bestMs = ms;
      best = event;
    }

    if (!best) return null;
    return meetingFromEvent(best);
  } catch {
    return null;
  }
}
