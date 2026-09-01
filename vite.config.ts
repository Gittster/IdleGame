import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Actions sets GITHUB_ACTIONS=true on every runner, which is what
// the Pages deploy workflow builds with. Local dev stays served at "/".
const isGithubActionsBuild = process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  root: '.',
  base: isGithubActionsBuild ? '/IdleGame/' : '/',
  // Only the src/ui overlay is React — Phaser itself is untouched by this.
  plugins: [react()],
  server: {
    port: 5173,
  },
});
