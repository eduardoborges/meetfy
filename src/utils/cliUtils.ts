import boxen from 'boxen';
import chalk from 'chalk';

export const showWelcomeMessage = (): void => {
  console.log(boxen('Meetfy', {
    padding: 1,
    margin: 0,
    width: 40,
    title: 'Instant Meeting Creator',
    titleAlignment: 'center',
    textAlignment: 'center',
  }));
  console.log(chalk.gray('Create instant meetings and reserve time in Google Calendar\n'));
};
