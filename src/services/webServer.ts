import http from 'node:http';
import express, { Request, Response } from 'express';
import chalk from 'chalk';
import { PORT_NUMBER } from '../constants.js';

const server = express();

export const getCodeServer = async (): Promise<string> => new Promise<string>((resolve, reject) => {
  let instance: http.Server;

  server.get('/', (req: Request, res: Response) => {
    console.log(req.query);

    const { code } = req.query;
    if (code) {
      resolve(code as string);
      res.send(`
        <html>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              background-color: #f0f0f0;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            }
            h1 {
              color: #000;
            }
            p {
              color: #000;
            }
          </style>
          <body>
            <h1>Meetfy</h1>
            <p>You can close this window now.</p>
          </body>  
        </html>
      `);
      instance.close();
    } else {
      reject(new Error('No code found'));
    }
  });

  instance = server.listen(PORT_NUMBER, (error) => {
    console.log(chalk.cyan(`🔐 Waiting for code on port ${PORT_NUMBER}...`));
    if (error) {
      console.error(error);
    }
  });
});
