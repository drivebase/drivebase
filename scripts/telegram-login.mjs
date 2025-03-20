import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import readline from 'readline';
import chalk from 'chalk';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const stringSession = new StringSession('');

const prompt = (question) =>
  new Promise((resolve) => rl.question(question, resolve));

async function main() {
  const apiId = await prompt(chalk.blueBright('Enter your API ID: '));
  const apiHash = await prompt(chalk.blueBright('Enter your API Hash: '));

  const client = new TelegramClient(stringSession, Number(apiId), apiHash, {
    connectionRetries: 5,
    baseLogger: null,
  });

  await client.start({
    phoneNumber: async () =>
      await prompt(chalk.blueBright('Please enter your number: ')),
    password: async () =>
      await prompt(chalk.blueBright('Please enter your password: ')),
    phoneCode: async () =>
      await prompt(chalk.blueBright('Please enter the code you received: ')),
    onError: (err) => console.log(chalk.redBright(err)),
  });

  console.log(chalk.cyanBright('Here is your session string:'));

  console.log(chalk.greenBright(client.session.save()));

  await client.disconnect();
}

process.on('SIGINT', async () => {
  console.log(chalk.redBright('Disconnecting from Telegram...'));
  await client.disconnect();
});

main();
