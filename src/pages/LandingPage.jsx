import { useMsal } from '@azure/msal-react';
import { getDataverseScopes } from '@/config/index.js';
import { showMessage } from '@/utils/index.js';

/**
 * Landing Page Component
 * Shown to non-authenticated users to prompt them to sign in with Microsoft
 */
export const LandingPage = () => {
  const { instance } = useMsal();

  const handleSignIn = async () => {
    try {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center">
        {/* Logo/Brand Section */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            NovaOps
          </h1>
          <p className="text-xl text-gray-600">
            Operations Management Platform
          </p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-8">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
              <svg
                className="w-10 h-10 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-semibold text-gray-900 mb-3">
              Welcome to NovaOps
            </h2>
            <p className="text-lg text-gray-600 mb-2">
              Please sign in with your Microsoft account to access the platform.
            </p>
            <p className="text-sm text-gray-500">
              Your secure access to order management, forecasts, and operations data.
            </p>
          </div>

          {/* Sign In Button */}
          <button
            onClick={handleSignIn}
            className="w-full md:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-3 mx-auto focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" />
            </svg>
            Sign In with Microsoft
          </button>
        </div>

        {/* Features/Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="font-medium">Order Management</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <p className="font-medium">Forecasts & Analytics</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <p className="font-medium">Operations Data</p>
          </div>
        </div>
      </div>
    </div>
  );
};

