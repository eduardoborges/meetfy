import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import type { Meeting, CreateMeetingInput } from './types';

export async function createMeeting(
  client: OAuth2Client,
  input: CreateMeetingInput,
): Promise<Meeting | null> {
  try {
    const calendar = google.calendar({ version: 'v3', auth: client });
    const now = new Date();
    const startTime = new Date(now.getTime() + 5 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
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
            requestId: `meetfy-${Date.now()}`,
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
      startTime: startTime.toLocaleString(),
      endTime: endTime.toLocaleString(),
      hangoutLink: res.data.hangoutLink,
    };
  } catch {
    return null;
  }
}

export async function getNextMeeting(client: OAuth2Client): Promise<Meeting | null> {
  try {
    const calendar = google.calendar({ version: 'v3', auth: client });
    const now = new Date().toISOString();
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 1,
    });

    const event = res.data.items?.[0];
    if (!event) return null;
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
  } catch {
    return null;
  }
}
