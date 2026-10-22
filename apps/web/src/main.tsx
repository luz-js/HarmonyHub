import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProviders } from './app/AppProviders';
import { registerServiceWorker } from './pwa/register';
import './index.css';

void registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>,
);
