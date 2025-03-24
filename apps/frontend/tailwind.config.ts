import type { Config } from 'tailwindcss';
import sharedConfig from '@drivebase/tailwind-config';

const config: Pick<Config, 'content' | 'presets'> = {
  content: ['./src/**/*.tsx', '../../packages/react/src/**/*.tsx'],
  presets: [sharedConfig],
};

export default config;
