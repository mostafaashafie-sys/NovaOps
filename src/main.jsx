import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App as AntApp } from 'antd';
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './config/msal.config.js';
import dayjs from 'dayjs';
import 'dayjs/locale/en';
import 'antd/dist/reset.css';
import App from './App.jsx';
import './index.css';

// Configure dayjs
dayjs.locale('en');

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh
      refetchOnWindowFocus: true, // Refetch when user returns to tab
      retry: 1, // Retry failed requests once
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MsalProvider instance={msalInstance}>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: '#2563eb', // Blue-600 to match Tailwind
              borderRadius: 12, // Rounded-xl equivalent
            },
          }}
        >
          <AntApp>
            <App />
          </AntApp>
        </ConfigProvider>
      </QueryClientProvider>
    </MsalProvider>
  </React.StrictMode>
);

