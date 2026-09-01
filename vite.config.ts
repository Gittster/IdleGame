import { defineConfig } from 'vite';

// GitHub Actions sets GITHUB_ACTIONS=true on every runner, which is what
// the Pages deploy workflow builds with. Local dev stays served at "/".
const isGithubActionsBuild = process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  root: '.',
  base: isGithubActionsBuild ? '/IdleGame/' : '/',
  server: {
    port: 5173,
  },
});
