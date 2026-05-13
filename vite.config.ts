import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const creatorApiTarget = (env.VITE_DELPHI_CREATOR_API_URL ?? 'https://delphi-creator-api.gensyn.workers.dev').replace(/\/+$/, '');

  return {
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 3000,
      proxy: {
        // The Market data overlay reads from the delphi-creator-api Worker
        // (workers/creator-api/ in delphi-stats-dashboard). Routing dev
        // traffic through Vite keeps the worker host out of the browser's
        // same-origin checks.
        '/api/creator-api': {
          target: creatorApiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/creator-api/, ''),
        },
      },
    },
  };
});
