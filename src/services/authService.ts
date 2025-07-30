import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import config from './configService.js';
import { getCodeServer } from './webServer.js';
import { PORT_NUMBER } from '../constants.js';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

const CREDENTIALS_PATH = join(process.cwd(), 'credentials.json');
const REDIRECT_URI = `http://localhost:${PORT_NUMBER}/`;

interface AuthTokens {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

const getNewTokens = async (oAuth2Client: OAuth2Client): Promise<OAuth2Client | null> => {
  try {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });

    console.log(chalk.cyan('🔐 Authorize this app by visiting this url:'), chalk.blue(authUrl));

    const code = await getCodeServer();

    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    // Store tokens
    config.set('googleTokens', tokens);

    return oAuth2Client;
  } catch (error) {
    console.error(chalk.red('❌ Error getting tokens:'), error);
    return null;
  }
};

export const authenticateGoogle = async (): Promise<OAuth2Client | null> => {
  try {
    // Check if credentials file exists
    if (!existsSync(CREDENTIALS_PATH)) {
      console.log(chalk.yellow('⚠️  Google Calendar credentials not found.'));
      console.log(chalk.cyan('📝 Please follow these steps:'));
      console.log(chalk.cyan('1. Go to https://console.cloud.google.com'));
      console.log(chalk.cyan('2. Create a new project or select existing one'));
      console.log(chalk.cyan('3. Enable Google Calendar API'));
      console.log(chalk.cyan('4. Create OAuth 2.0 credentials'));
      console.log(chalk.cyan('5. Download credentials.json and place it in the project root'));
      console.log(chalk.cyan('6. Run: meetfy auth'));
      return null;
    }

    const credentials = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf-8'));
    const {
      client_secret: clientSecret,
      client_id: clientId,
    } = credentials.installed || credentials.web;

    const oAuth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      REDIRECT_URI,
    );

    // Check if we have stored tokens
    const storedTokens = config.get('googleTokens') as AuthTokens | undefined;

    if (storedTokens) {
      oAuth2Client.setCredentials(storedTokens);

      // Check if token is expired
      if (storedTokens.expiry_date && Date.now() > storedTokens.expiry_date) {
        console.log(chalk.yellow('🔄 Token expired, refreshing...'));
        const { credentials: newTokens } = await oAuth2Client.refreshAccessToken();
        oAuth2Client.setCredentials(newTokens);
        config.set('googleTokens', newTokens);
      }

      return oAuth2Client;
    }

    // Get new tokens
    return await getNewTokens(oAuth2Client);
  } catch (error) {
    console.error(chalk.red('❌ Authentication error:'), error);
    return null;
  }
};

export const logoutGoogle = async () => {
  config.clear();
};
