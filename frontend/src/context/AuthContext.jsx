import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Base API URL driven by Vite environment variable or defaulting to /api for reverse proxy deployment
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

/**
 * Encapsulated API client with automatic token attachment, 401 interception,
 * and automatic refresh token rotation.
 */
export const authFetch = async (endpoint, options = {}) => {
  let token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = {
    ...(options.headers || {})
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    let response = await fetch(url, {
      ...options,
      headers
    });

    // 401 Interception: Attempt Refresh Token Rotation
    if (response.status === 401) {
      const storedRefreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
      if (storedRefreshToken && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login')) {
        try {
          const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: storedRefreshToken })
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            token = refreshData.access_token;
            localStorage.setItem('token', token);
            if (refreshData.refresh_token) {
              localStorage.setItem('refresh_token', refreshData.refresh_token);
            }
            // Retry original request with newly rotated access token
            headers['Authorization'] = `Bearer ${token}`;
            response = await fetch(url, {
              ...options,
              headers
            });
          } else {
            // Refresh token revoked or expired
            throw new Error('Refresh token expired');
          }
        } catch (refreshErr) {
          // Wipe local session state
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            localStorage.setItem('signed_out', 'true');
            try { sessionStorage.clear(); } catch (e) {}
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
          }
          throw new Error('Session expired (401). Please sign in again.');
        }
      } else {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          localStorage.setItem('signed_out', 'true');
          try { sessionStorage.clear(); } catch (e) {}
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        throw new Error('Session expired or unauthorized (401). Please sign in again.');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('authFetch failed:', error);
    throw error;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('token');
    if (!stored || stored === 'bit_student_session' || stored === 'guest-token' || stored === 'null') {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      return null;
    }
    return stored;
  });

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Application Boot: Cryptographic identity validation against /api/auth/me
  useEffect(() => {
    let isMounted = true;

    const validateSessionOnBoot = async () => {
      const storedToken = localStorage.getItem('token');

      if (!storedToken || storedToken === 'bit_student_session' || storedToken === 'guest-token') {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        if (isMounted) {
          setUser(null);
          setToken(null);
          setLoading(false);
        }
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${storedToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const verifiedProfile = await response.json();
          if (isMounted) {
            setUser(verifiedProfile);
            setToken(storedToken);
            localStorage.setItem('user', JSON.stringify(verifiedProfile));
          }
        } else if (response.status === 401) {
          // Attempt refresh on boot if refresh_token available
          const storedRefreshToken = localStorage.getItem('refresh_token');
          if (storedRefreshToken) {
            try {
              const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: storedRefreshToken })
              });
              if (refreshRes.ok) {
                const refreshData = await refreshRes.json();
                const newToken = refreshData.access_token;
                localStorage.setItem('token', newToken);
                if (refreshData.refresh_token) {
                  localStorage.setItem('refresh_token', refreshData.refresh_token);
                }
                // Verify with new token
                const meRes = await fetch(`${API_BASE_URL}/auth/me`, {
                  headers: { 'Authorization': `Bearer ${newToken}` }
                });
                if (meRes.ok) {
                  const verifiedProfile = await meRes.json();
                  if (isMounted) {
                    setUser(verifiedProfile);
                    setToken(newToken);
                    localStorage.setItem('user', JSON.stringify(verifiedProfile));
                  }
                  return;
                }
              }
            } catch (e) {
              logger.warn('Boot token refresh failed:', e);
            }
          }

          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          if (isMounted) {
            setUser(null);
            setToken(null);
          }
        }
      } catch (err) {
        console.warn('Backend authentication validation unreachable:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        if (isMounted) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    validateSessionOnBoot();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = (userData, authToken, refreshToken = null) => {
    localStorage.removeItem('signed_out');
    setToken(authToken);
    setUser(userData);
    localStorage.setItem('token', authToken);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const loginAsGuest = (guestData = null, authToken = null) => {
    localStorage.removeItem('signed_out');
    const guestUser = guestData || {
      name: 'Guest Visitor',
      role: 'guest',
      isVerified: false
    };
    setUser(guestUser);
    if (authToken) {
      setToken(authToken);
      localStorage.setItem('token', authToken);
    }
    localStorage.setItem('user', JSON.stringify(guestUser));
  };

  const logout = useCallback(async () => {
    const currentToken = localStorage.getItem('token');
    if (currentToken) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${currentToken}` }
        });
      } catch (e) {}
    }

    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.setItem('signed_out', 'true');
    try { sessionStorage.clear(); } catch (e) {}
  }, []);

  // Server-validated roles (cannot be manipulated client-side)
  const role = (user?.role || '').toLowerCase();
  const isAdmin = role === 'admin';
  const isHod = role === 'hod';
  const isFaculty = role === 'faculty' || role === 'teacher';
  const isStaff = role === 'staff';
  const isStudent = role === 'student';
  const isGuest = role === 'guest';
  const isVerifiedMember = Boolean(user && ['student', 'faculty', 'hod', 'staff', 'admin'].includes(role));
  const isAuthenticated = Boolean(token && user);

  const value = {
    user,
    token,
    loading,
    login,
    loginAsGuest,
    logout,
    authFetch,
    isAdmin,
    isHod,
    isFaculty,
    isStaff,
    isGuest,
    isStudent,
    isVerifiedMember,
    isAuthenticated,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#09090b]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium tracking-wide">
            Verifying institutional credentials...
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
