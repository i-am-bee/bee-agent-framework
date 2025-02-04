import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    react(),
    svgr({
      include: '**/*.svg',
    }),
  ],
  server: {
    proxy: {
      '/mcp': {
        target: 'http://localhost:8333',
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['mixed-decls', 'global-builtin'],
      },
    },
  },
});
