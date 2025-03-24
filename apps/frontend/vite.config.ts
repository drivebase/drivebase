import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [TanStackRouterVite(), react(), tsconfigPaths()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      '@drivebase/dtos': path.resolve(__dirname, '../../packages/dtos/src'),
    },
  },
});
