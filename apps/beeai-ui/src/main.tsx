import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './AppTemp';
import './styles/style.scss';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
