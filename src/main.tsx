import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/source-serif-4/latin-400.css';
import '@fontsource/source-serif-4/latin-400-italic.css';
import '@fontsource/source-serif-4/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import './index.css';
import App from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Rodelementet #root mangler i index.html');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
