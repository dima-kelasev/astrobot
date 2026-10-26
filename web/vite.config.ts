import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, '');
  const port = env.PORT || '3000';
  return {
    base: '/app/',
    plugins: [react()],
    server: {
      port: 5173,
      proxy: { '/api': `http://127.0.0.1:${port}` }
    }
  };
});
