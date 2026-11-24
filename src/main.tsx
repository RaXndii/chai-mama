import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ChaiSite from './site/ChaiSite';
import './styles/base.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChaiSite />
  </StrictMode>,
);
