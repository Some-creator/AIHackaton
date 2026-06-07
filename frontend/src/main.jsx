import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CreditsProvider } from './context/CreditsContext';
import './index.css';

function AppRoot() {
  const { user } = useAuth();
  return (
    <CreditsProvider user={user}>
      <App />
    </CreditsProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <AppRoot />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
