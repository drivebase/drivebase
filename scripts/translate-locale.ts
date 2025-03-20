import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createInterface, Interface } from 'readline';
import { readdir, readFile, mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { generateText } from 'ai';
import { createOllama } from 'ollama-ai-provider';
import chalk from 'chalk';

const ollama = createOllama();

const __dirname: string = dirname(fileURLToPath(import.meta.url));
const BASE_DIR: string = join(__dirname, '../');
const LOCALES_DIR: string = join(BASE_DIR, 'apps/frontend/public/locales');
const SOURCE_LANG = 'en';

const rl: Interface = createInterface({
  input: process.stdin,
  output: process.stdout,
});

const prompt = (question: string): Promise<string> =>
  new Promise((resolve) => rl.question(question, resolve));

async function translateWithOllama(
  content: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  const { text } = await generateText({
    model: ollama('llama3.1:latest'),
    system: `You are a translator. You are given a JSON string and you need to translate it to the target language.
      Only translate the values, not the keys.
      The source language is ${sourceLang} and the target language is ${targetLang}.
      Do not include any other text than the translation in JSON format.`,
    prompt: content,
  });
  return text;
}

// Create a new language directory with translated files
async function createNewLanguage(targetLang: string): Promise<void> {
  const sourceFiles: string[] = await getLocaleFiles(SOURCE_LANG);
  const targetDir: string = join(LOCALES_DIR, targetLang);

  // Create target directory if it doesn't exist
  if (!existsSync(targetDir)) {
    await mkdir(targetDir, { recursive: true });
  }

  console.log(
    chalk.blue(
      `Creating translations for '${targetLang}' from '${SOURCE_LANG}'...`
    )
  );

  for (const file of sourceFiles) {
    const sourcePath: string = join(LOCALES_DIR, SOURCE_LANG, file);
    const targetPath: string = join(targetDir, file);

    try {
      const content: string = await readFile(sourcePath, 'utf-8');

      console.log(chalk.blue(`Translating ${file}...`));

      const translated: string = await translateWithOllama(
        content,
        SOURCE_LANG,
        targetLang
      );

      await writeFile(targetPath, translated, 'utf-8');

      console.log(chalk.green(`✓ Translated ${file} successfully`));
    } catch (error) {
      console.error(chalk.red(`Error translating ${file}:`), error);
    }
  }

  console.log(
    chalk.green(`\n✓ Finished creating translations for '${targetLang}'`)
  );
}

async function getLocaleFiles(lang: string): Promise<string[]> {
  const langDir: string = join(LOCALES_DIR, lang);
  try {
    const files: string[] = await readdir(langDir);
    return files.filter((file) => file.endsWith('.json'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

// Main function
async function main(): Promise<void> {
  const command: string = process.argv[2];
  const targetLang: string = process.argv[3];

  switch (command) {
    case 'create':
      if (!targetLang) {
        console.error('Error: Target language code is required');
        showHelp();
        break;
      }
      await createNewLanguage(targetLang);
      break;

    case 'update':
      if (!targetLang) {
        console.error('Error: Target language code is required');
        showHelp();
        break;
      }
      // await updateLanguage(targetLang); // Placeholder for actual function
      break;

    case 'list':
      // await listLanguages(); // Placeholder for actual function
      break;

    case 'interactive':
      await interactiveMode();
      break;

    default:
      showHelp();
      break;
  }

  rl.close();
}

async function getAvailableLanguages(): Promise<string[]> {
  try {
    const dirs: string[] = await readdir(LOCALES_DIR);
    return dirs.filter((dir) => {
      const path: string = join(LOCALES_DIR, dir);
      return existsSync(path) && dir !== '.DS_Store';
    });
  } catch (error) {
    console.error('Error reading locales directory:', error);
    return [];
  }
}

async function interactiveMode(): Promise<void> {
  console.log('\n📝 Translation Tool - Interactive Mode');

  const languages: string[] = await getAvailableLanguages();
  console.log(chalk.yellowBright('\nAvailable languages:'));
  languages.forEach((lang, i) =>
    console.log(chalk.blue.bold(`${i + 1}. ${lang}`))
  );

  console.log(chalk.yellowBright('\nOptions:'));
  console.log(chalk.blueBright('1. Create a new language'));
  console.log(chalk.blueBright('2. Update an existing language'));

  const choice: string = await prompt('\nSelect an option (1-2): ');

  if (choice === '1') {
    const targetLang: string = await prompt(
      'Enter the target language code (e.g., fr, es, de): '
    );
    await createNewLanguage(targetLang);
  } else if (choice === '2') {
    const langIndex: string = await prompt(
      `Select a language to update (1-${languages.length}): `
    );
    const index: number = parseInt(langIndex, 10) - 1;

    if (
      index >= 0 &&
      index < languages.length &&
      languages[index] !== SOURCE_LANG
    ) {
      // await updateLanguage(languages[index]);
    } else {
      console.error('Invalid selection or cannot update source language');
    }
  } else {
    console.log(chalk.red('Invalid option'));
  }
}

function showHelp(): void {
  console.log(
    chalk.blue(
      `\nTranslation Tool for Locale Files\n\nCommands:\n  create <lang>    - Create translations for a new language\n  update <lang>    - Update existing language with missing translations\n  list             - List all available languages and their files\n  interactive      - Interactive mode for selecting options\n\nExamples:\n  node translate-locales.mjs create fr\n  node translate-locales.mjs update es\n  node translate-locales.mjs list\n  node translate-locales.mjs interactive\n\nEnvironment Variables:\n  OLLAMA_API       - API endpoint for Ollama (default: http://localhost:11434/api/generate)\n  OLLAMA_MODEL     - Model to use for translation (default: llama3)\n  `
    )
  );
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
