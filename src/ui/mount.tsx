import { createRoot } from 'react-dom/client';
import { App } from './App';

export function mountUI(): void {
  const container = document.getElementById('ui-root');
  if (!container) throw new Error('Missing #ui-root mount point');
  createRoot(container).render(<App />);
}
