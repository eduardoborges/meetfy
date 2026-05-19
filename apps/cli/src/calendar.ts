import dayjs from 'dayjs';
import { calendar, calendar_v3 } from '@googleapis/calendar';
import type { OAuth2Client } from 'google-auth-library';
import type { Meeting, CreateMeetingInput } from './types';
import { logger } from './logger';

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
    startMs: new Date(start).getTime(),
    endMs: new Date(end).getTime(),
    hangoutLink: event.hangoutLink ?? undefined,
    location: event.location ?? undefined,
  };
}

export async function createMeeting(
  client: OAuth2Client,
  input: CreateMeetingInput,
): Promise<Meeting | null> {
  try {
    logger.info('createMeeting: creating event', { title: input.title });
    const cal = calendar({ version: 'v3', auth: client });
    const startTime = dayjs().add(5, 'minute');
    const endTime = startTime.add(30, 'minute');
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const res = await cal.events.insert({
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

    if (!res.data.id || !res.data.hangoutLink) {
      logger.warn('createMeeting: event created but missing id or hangoutLink', {
        hasId: Boolean(res.data.id),
        hasHangoutLink: Boolean(res.data.hangoutLink),
      });
      return null;
    }
    logger.info('createMeeting: success', { eventId: res.data.id });
    return {
      id: res.data.id,
      title: input.title,
      startTime: startTime.toDate().toLocaleString(),
      endTime: endTime.toDate().toLocaleString(),
      startMs: startTime.valueOf(),
      endMs: endTime.valueOf(),
      hangoutLink: res.data.hangoutLink,
    };
  } catch (err) {
    logger.error('createMeeting: failed', {
      error: String(err),
      message: (err as Error).message,
    });
    return null;
  }
}

export async function getUpcomingMeetings(
  client: OAuth2Client,
  limit = 10,
): Promise<Meeting[]> {
  logger.info('getUpcomingMeetings: fetching calendars and events', { limit });
  const cal = calendar({ version: 'v3', auth: client });
  const timeMin = dayjs().toISOString();
  const timeMax = dayjs().add(LIST_WINDOW_DAYS, 'day').toISOString();

  let ids: string[];
  let calendarListFailed = false;
  try {
    const { data: calList } = await cal.calendarList.list({
      minAccessRole: 'reader',
      maxResults: 250,
    });
    const calendarIds = (calList.items ?? [])
      .map((c) => c.id)
      .filter((id): id is string => Boolean(id));
    ids = calendarIds.length > 0 ? calendarIds : ['primary'];
    logger.debug('getUpcomingMeetings: found calendars', { count: ids.length });
  } catch (err) {
    logger.warn('getUpcomingMeetings: calendarList.list failed, falling back to primary', {
      error: String(err),
      message: (err as Error).message,
    });
    ids = ['primary'];
    calendarListFailed = true;
  }

  let eventsListsFailed = 0;
  const listResults = await Promise.all(
    ids.map((calendarId) =>
      cal.events
        .list({
          calendarId,
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: LIST_MAX_RESULTS,
        })
        .catch((err) => {
          eventsListsFailed++;
          logger.warn('getUpcomingMeetings: events.list failed for calendar', {
            calendarId,
            error: String(err),
            message: (err as Error).message,
          });
          return { data: { items: [] as calendar_v3.Schema$Event[] } };
        }),
    ),
  );

  // Distinguish "no events" from "API down": if calendarList failed AND
  // every events.list call failed, surface the error so callers can retry
  // or fall back. Returning [] here would hide a real outage.
  if (calendarListFailed && eventsListsFailed === ids.length) {
    throw new Error('all calendar API calls failed');
  }

  const events: calendar_v3.Schema$Event[] = [];
  for (const res of listResults) {
    for (const event of res.data.items ?? []) {
      if (!isAllDayEvent(event)) events.push(event);
    }
  }
  events.sort((a, b) => (eventStartMs(a) ?? Infinity) - (eventStartMs(b) ?? Infinity));

  const meetings: Meeting[] = [];
  for (const event of events) {
    if (meetings.length >= limit) break;
    const m = meetingFromEvent(event);
    if (m) meetings.push(m);
  }

  logger.info('getUpcomingMeetings: returning', { count: meetings.length });
  return meetings;
}

export async function getNextMeeting(client: OAuth2Client): Promise<Meeting | null> {
  try {
    const list = await getUpcomingMeetings(client, 1);
    return list[0] ?? null;
  } catch (err) {
    logger.error('getNextMeeting: unexpected error', {
      error: String(err),
      message: (err as Error).message,
    });
    return null;
  }
}
