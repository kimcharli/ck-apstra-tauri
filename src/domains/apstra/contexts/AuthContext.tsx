import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { AuthState, AuthError, AuthContextType } from '../types/Auth';
import { apstraApiService } from '../services/ApstraApiService';

// Initial state
const initialAuthState: AuthState = {
  isAuthenticated: false,
  isChecking: false,
  lastChecked: null,
  error: null,
  sessionId: null,
};

// Action types
type AuthAction =
  | { type: 'SET_CHECKING'; payload: boolean }
  | { type: 'SET_AUTHENTICATED'; payload: { authenticated: boolean; sessionId?: string } }
  | { type: 'SET_ERROR'; payload: AuthError }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LAST_CHECKED'; payload: Date };

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_CHECKING':
      return { ...state, isChecking: action.payload };
    case 'SET_AUTHENTICATED':
      return {
        ...state,
        isAuthenticated: action.payload.authenticated,
        sessionId: action.payload.sessionId || null,
        error: null,
        isChecking: false,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isChecking: false,
        isAuthenticated: false,
        sessionId: null,
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SET_LAST_CHECKED':
      return { ...state, lastChecked: action.payload };
    default:
      return state;
  }
};

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
interface AuthProviderProps {
  children: React.ReactNode;
  pollInterval?: number; // milliseconds, default 30000
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ 
  children, 
  pollInterval = 30000 
}) => {
  const [authState, dispatch] = useReducer(authReducer, initialAuthState);

  const createAuthError = useCallback((type: AuthError['type'], message: string): AuthError => ({
    type,
    message,
    timestamp: new Date(),
  }), []);

  const authenticate = useCallback(async (baseUrl: string, username: string, password: string) => {
    dispatch({ type: 'SET_CHECKING', payload: true });
    
    try {
      const result = await apstraApiService.login(baseUrl, username, password);
      dispatch({ 
        type: 'SET_AUTHENTICATED', 
        payload: { authenticated: true, sessionId: result.session_id } 
      });
      dispatch({ type: 'SET_LAST_CHECKED', payload: new Date() });
    } catch (error: any) {
      let authError: AuthError;
      
      if (error.message?.includes('network') || error.message?.includes('timeout')) {
        authError = createAuthError('NETWORK', `Network error: ${error.message}`);
      } else if (error.message?.includes('authentication') || error.message?.includes('credentials')) {
        authError = createAuthError('AUTHENTICATION', `Authentication failed: ${error.message}`);
      } else {
        authError = createAuthError('UNKNOWN', `Login failed: ${error.message || error}`);
      }
      
      dispatch({ type: 'SET_ERROR', payload: authError });
      throw error; // Re-throw for component handling
    }
  }, [createAuthError]);

  const logout = useCallback(async () => {
    try {
      await apstraApiService.logout();
    } catch (error) {
      console.warn('Logout warning:', error);
    } finally {
      dispatch({ type: 'SET_AUTHENTICATED', payload: { authenticated: false } });
    }
  }, []);

  const checkAuthentication = useCallback(async () => {
    dispatch({ type: 'SET_CHECKING', payload: true });
    
    try {
      const isAuth = await apstraApiService.checkAuthentication();
      const sessionId = isAuth ? (apstraApiService.getSessionId() ?? null) : null;
      
      dispatch({ 
        type: 'SET_AUTHENTICATED', 
        payload: { authenticated: isAuth, sessionId: sessionId || undefined } 
      });
      dispatch({ type: 'SET_LAST_CHECKED', payload: new Date() });
    } catch (error: any) {
      const authError = createAuthError('NETWORK', `Status check failed: ${error.message}`);
      dispatch({ type: 'SET_ERROR', payload: authError });
    }
  }, [createAuthError]);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // Periodic authentication checking
  useEffect(() => {
    // Initial check with timeout to prevent UI blocking
    const performInitialCheck = async () => {
      try {
        // Add a timeout to prevent hanging
        await Promise.race([
          checkAuthentication(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Authentication check timeout')), 5000)
          )
        ]);
      } catch (error) {
        console.warn('Initial authentication check failed or timed out:', error);
        // Set as not authenticated to allow UI to proceed
        dispatch({ 
          type: 'SET_AUTHENTICATED', 
          payload: { authenticated: false } 
        });
      }
    };
    
    performInitialCheck();
    
    // Set up polling with error handling
    const interval = setInterval(async () => {
      try {
        await Promise.race([
          checkAuthentication(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Authentication check timeout')), 10000)
          )
        ]);
      } catch (error) {
        console.warn('Periodic authentication check failed or timed out:', error);
      }
    }, pollInterval);
    
    return () => clearInterval(interval);
  }, [checkAuthentication, pollInterval]);

  const contextValue: AuthContextType = {
    authState,
    authenticate,
    logout,
    checkAuthentication,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};