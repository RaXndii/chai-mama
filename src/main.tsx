import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ChaiSite from './site/ChaiSite';
import './styles/base.css';

// Every visit opens at the top, in the cloud (a reload does not jump back down the page).
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChaiSite />
  </StrictMode>,
);
