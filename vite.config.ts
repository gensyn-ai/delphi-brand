import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const network = env.VITE_DELPHI_NETWORK === 'testnet' ? 'testnet' : 'mainnet';
  const proxyTarget = network === 'testnet'
    ? 'https://delphi-api.gensyn.ai'
    : 'https://api.delphi.fyi';

  return {
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api/delphi': {
          target: proxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/delphi/, ''),
        },
      },
    },
  };
});
