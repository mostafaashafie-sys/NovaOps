import { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { LoadingState } from '@/components/index.js';

/**
 * Home Page Component
 * Simple dashboard with user greeting, role, and a joke
 */
export const HomePage = ({ onNavigate }) => {
  const { accounts, instance } = useMsal();
  const [joke, setJoke] = useState(null);
  const [jokeLoading, setJokeLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [userPhoto, setUserPhoto] = useState(null);

  // Get user info from MSAL account
  const account = accounts.length > 0 ? accounts[0] : null;
  const userName = account?.name || account?.username || 'User';

  // Extract user role and photo from ID token claims or try to fetch from Microsoft Graph
  useEffect(() => {
    const fetchUserData = async () => {
      if (!account) return;

      let roleFound = false;

      // First, try to get roles from ID token claims
      if (account.idTokenClaims) {
        const claims = account.idTokenClaims;
        
        // Check for roles in token claims
        if (claims.roles && Array.isArray(claims.roles) && claims.roles.length > 0) {
          setUserRole(claims.roles.join(', '));
          roleFound = true;
        } else if (claims.role) {
          setUserRole(claims.role);
          roleFound = true;
        } else if (claims['extension_Role']) {
          setUserRole(claims['extension_Role']);
          roleFound = true;
        }
      }

      // Try to fetch from Microsoft Graph API if we have the right scopes
      try {
        const scopes = ['User.Read'];
        const tokenResponse = await instance.acquireTokenSilent({
          scopes: scopes,
          account: account
        }).catch(() => null);

        if (tokenResponse?.accessToken) {
          // Fetch user info which might include job title or department
          const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: {
              'Authorization': `Bearer ${tokenResponse.accessToken}`
            }
          });

          if (graphResponse.ok) {
            const userData = await graphResponse.json();
            // Use jobTitle or department as role if available and not already set
            if (!roleFound) {
              if (userData.jobTitle) {
                setUserRole(userData.jobTitle);
                roleFound = true;
              } else if (userData.department) {
                setUserRole(userData.department);
                roleFound = true;
              }
            }

            // Fetch user photo
            try {
              const photoResponse = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
                headers: {
                  'Authorization': `Bearer ${tokenResponse.accessToken}`
                }
              });

              if (photoResponse.ok) {
                const photoBlob = await photoResponse.blob();
                const photoUrl = URL.createObjectURL(photoBlob);
                setUserPhoto(photoUrl);
              }
            } catch (photoError) {
              // Silently fail - photo is optional
              console.debug('Could not fetch user photo:', photoError);
            }
          }
        }
      } catch (error) {
        // Silently fail - we'll just not show a role or photo
        console.debug('Could not fetch user data from Graph API:', error);
      }
    };

    fetchUserData();
  }, [account, instance]);

  // Cleanup: revoke photo URL when component unmounts or photo changes
  useEffect(() => {
    return () => {
      if (userPhoto) {
        URL.revokeObjectURL(userPhoto);
      }
    };
  }, [userPhoto]);

  // Fetch a joke from JokeAPI (excluding technical categories)
  const fetchJoke = async () => {
    setJokeLoading(true);
    try {
      // Exclude Programming, Misc, and other technical categories
      // Use categories: Pun, Spooky, Christmas, Any (but filter out technical)
      const categories = ['Pun', 'Spooky', 'Christmas'];
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      
      const response = await fetch(`https://v2.jokeapi.dev/joke/${randomCategory}?type=single&safe-mode`);
      const data = await response.json();
      
      if (data.joke) {
        setJoke(data.joke);
      } else if (data.setup && data.delivery) {
        // Handle two-part jokes
        setJoke(`${data.setup} ${data.delivery}`);
      } else {
        // Fallback to a simple category if the random one didn't work
        const fallbackResponse = await fetch('https://v2.jokeapi.dev/joke/Pun?type=single&safe-mode');
        const fallbackData = await fallbackResponse.json();
        if (fallbackData.joke) {
          setJoke(fallbackData.joke);
        } else if (fallbackData.setup && fallbackData.delivery) {
          setJoke(`${fallbackData.setup} ${fallbackData.delivery}`);
        } else {
          setJoke(null);
        }
      }
    } catch (error) {
      console.error('Error fetching joke:', error);
      setJoke(null);
    } finally {
      setJokeLoading(false);
    }
  };

  // Fetch joke on component mount
  useEffect(() => {
    fetchJoke();
  }, []);

  if (!account) {
    return <LoadingState message="Loading..." />;
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 rounded-2xl shadow-xl border border-gray-100 p-12 md:p-16">
          <div className="text-center space-y-8">
            {/* Greeting Section */}
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mb-4 shadow-lg overflow-hidden ring-4 ring-white">
                {userPhoto ? (
                  <img 
                    src={userPhoto} 
                    alt={userName}
                    className="w-full h-full object-cover"
                    onError={() => setUserPhoto(null)} // Fallback to icon if image fails to load
                  />
                ) : (
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Hello {userName}!
              </h1>
              {userRole && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-gray-200 shadow-sm">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M5.5 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">{userRole}</span>
                </div>
              )}
            </div>

            {/* Joke Section */}
            {jokeLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
                <span className="text-gray-500 text-sm">Loading a joke for you...</span>
              </div>
            ) : joke ? (
              <div className="mt-12 pt-8 border-t border-gray-200">
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-8 shadow-md border border-gray-100">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-md">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-800 text-lg md:text-xl leading-relaxed flex-1 text-left">
                      {joke}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-12 pt-8 border-t border-gray-200">
                <div className="bg-gray-50 rounded-xl p-8 border border-gray-200">
                  <p className="text-gray-500">No joke available at the moment.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;

