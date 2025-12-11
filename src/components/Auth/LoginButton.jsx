import { useMsal } from '@azure/msal-react';
import { getDataverseScopes } from '@/config/index.js';
import { showMessage } from '@/utils/index.js';

/**
 * Login Button Component
 * Handles Azure AD authentication for Dataverse
 */
export const LoginButton = () => {
  const { instance, accounts } = useMsal();
  const isAuthenticated = accounts.length > 0;

  const handleLogin = async () => {
    try {
      // Check if interaction is already in progress
      const inProgress = instance.getActiveAccount() || instance.getAllAccounts().length > 0;
      
      const scopes = getDataverseScopes();
      
      // Use redirect instead of popup to avoid interaction_in_progress errors
      await instance.loginRedirect({
        scopes: scopes,
      });
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle specific errors
      if (error.message && error.message.includes('AADSTS9002326')) {
        showMessage.error('App Registration must be configured as Single-Page Application. Please check Azure Portal configuration.');
      } else if (error.message && error.message.includes('interaction_in_progress')) {
        showMessage.warning('Sign-in is already in progress. Please complete the sign-in window.');
      } else {
        showMessage.error(`Failed to sign in: ${error.message}`);
      }
    }
  };

  const handleLogout = () => {
    instance.logoutPopup({
      postLogoutRedirectUri: window.location.origin,
    });
    showMessage.info('Signed out successfully');
  };

  if (isAuthenticated) {
    const account = accounts[0];
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          Signed in as: <span className="font-medium">{account.name || account.username}</span>
        </span>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      Sign In with Microsoft
    </button>
  );
};

