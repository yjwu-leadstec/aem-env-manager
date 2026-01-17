import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppRouter } from './router';
import './i18n';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);
