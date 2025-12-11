/**
 * MSAL (Microsoft Authentication Library) Configuration
 * For Azure AD authentication with Dataverse
 */

import { PublicClientApplication, LogLevel } from '@azure/msal-browser';

/**
 * MSAL Configuration
 * Get these values from Azure Portal → App Registrations → Your App
 */
export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '', // Azure AD App Registration Client ID
    authority: import.meta.env.VITE_AZURE_AUTHORITY || 'https://login.microsoftonline.com/common', // Azure AD Authority
    redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI || window.location.origin, // Where to redirect after login
  },
  cache: {
    cacheLocation: 'sessionStorage', // Store tokens in sessionStorage
    storeAuthStateInCookie: false, // Set to true if you have issues on IE11 or Edge
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          case LogLevel.Verbose:
            console.debug(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
        }
      },
    },
  },
};

/**
 * Scopes required for Dataverse API access
 * Dataverse API requires: https://yourorg.crm.dynamics.com/.default
 */
export const getDataverseScopes = () => {
  const dataverseUrl = import.meta.env.VITE_DATAVERSE_URL || '';
  if (!dataverseUrl) {
    return ['https://mostafashafie-uaesenvironment.crm4.dynamics.com/.default'];
  }
  
  // Extract base URL from full API URL
  // e.g., https://org.crm.dynamics.com/api/data/v9.2 -> https://org.crm.dynamics.com
  const baseUrl = dataverseUrl.replace('/api/data/v9.2', '');
  return [`${baseUrl}/.default`];
};

/**
 * Create MSAL instance
 */
export const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL
msalInstance.initialize().then(() => {
  console.log('MSAL initialized successfully');
}).catch((error) => {
  console.error('MSAL initialization error:', error);
});

