import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';

interface MeetingOptions {
  title?: string;
  description?: string;
  participants?: string;
}

interface MeetingResult {
  id: string;
  hangoutLink: string;
  startTime: string;
  endTime: string;
  title: string;
}

const getMeetingDetails = async (options: MeetingOptions) => {
  const questions = [];

  if (!options.title) {
    questions.push({
      type: 'input',
      name: 'title',
      message: 'Meeting title:',
      default: 'Instant Meeting',
      validate: (input: string) => {
        if (!input.trim()) {
          return 'Please enter a meeting title';
        }
        return true;
      },
    });
  }

  if (!options.description) {
    questions.push({
      type: 'input',
      name: 'description',
      message: 'Meeting description (optional):',
      default: 'Instant meeting created via Meetfy CLI',
    });
  }

  if (!options.participants) {
    questions.push({
      type: 'input',
      name: 'participants',
      message: 'Participant emails (comma-separated, optional):',
      default: '',
    });
  }

  const answers = questions.length > 0 ? await inquirer.prompt(questions) : {};

  return {
    title: options.title || answers.title,
    description: options.description || answers.description,
    participants: (options.participants || answers.participants || '')
      .split(',')
      .filter((email: string) => email.trim() !== ''),
  };
};

export const createInstantMeeting = async (
  auth: OAuth2Client,
  options: MeetingOptions,
): Promise<MeetingResult | null> => {
  try {
    const calendar = google.calendar({ version: 'v3', auth });

    // Get meeting details from user if not provided
    const meetingDetails = await getMeetingDetails(options);

    // Calculate meeting times (30 minutes from now)
    const now = new Date();
    const startTime = new Date(now.getTime() + 5 * 60 * 1000); // Start in 5 minutes
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // 30 minutes duration

    const spinner = ora('Creating meeting and reserving calendar...').start();

    // Create calendar event
    const event = {
      summary: meetingDetails.title,
      description: meetingDetails.description,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      attendees: meetingDetails.participants.map((email: string) => ({ email: email.trim() })),
      conferenceData: {
        createRequest: {
          requestId: `meetfy-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 10 },
          { method: 'popup', minutes: 5 },
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: 1,
      sendUpdates: 'all',
    });

    spinner.succeed('Meeting created successfully!');

    if (!response.data.id || !response.data.hangoutLink) {
      throw new Error('Failed to create meeting with Google Meet link');
    }

    return {
      id: response.data.id,
      hangoutLink: response.data.hangoutLink,
      startTime: startTime.toLocaleString(),
      endTime: endTime.toLocaleString(),
      title: meetingDetails.title,
    };
  } catch (error) {
    console.error(chalk.red('❌ Error creating meeting:'), error);
    return null;
  }
};
