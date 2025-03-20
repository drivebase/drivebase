import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const stringSession = new StringSession('');

const prompt = (question) =>
  new Promise((resolve) => rl.question(question, resolve));

async function main() {
  const apiId = await prompt('Enter your API ID: ');
  const apiHash = await prompt('Enter your API Hash: ');

  const client = new TelegramClient(stringSession, Number(apiId), apiHash, {
    connectionRetries: 5,
    baseLogger: null,
  });

  await client.start({
    phoneNumber: async () => await prompt('Please enter your number: '),
    password: async () => await prompt('Please enter your password: '),
    phoneCode: async () => await prompt('Please enter the code you received: '),
    onError: (err) => console.log(err),
  });

  console.log('Here is your session string:');

  console.log(client.session.save());

  await client.disconnect();
}

process.on('SIGINT', async () => {
  console.log('Disconnecting from Telegram...');
  await client.disconnect();
});

main();
