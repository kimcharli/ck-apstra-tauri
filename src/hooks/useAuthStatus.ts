import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface UseAuthStatusReturn {
  isAuthenticated: boolean;
  isChecking: boolean;
  hasError: boolean;
  errorMessage?: string;
  errorType?: string;
  lastChecked?: Date;
  sessionId?: string;
}

/**
 * Custom hook for accessing authentication status
 * Provides a clean, declarative interface for components
 */
export const useAuthStatus = (): UseAuthStatusReturn => {
  const { authState } = useAuth();
  
  return useMemo(() => ({
    isAuthenticated: authState.isAuthenticated,
    isChecking: authState.isChecking,
    hasError: authState.error !== null,
    errorMessage: authState.error?.message,
    errorType: authState.error?.type,
    lastChecked: authState.lastChecked ?? undefined,
    sessionId: authState.sessionId ?? undefined,
  }), [authState]);
};

/**
 * Hook for authentication actions
 * Separates read operations from write operations
 */
export const useAuthActions = () => {
  const { authenticate, logout, checkAuthentication, clearError } = useAuth();
  
  return useMemo(() => ({
    authenticate,
    logout,
    checkAuthentication,
    clearError,
  }), [authenticate, logout, checkAuthentication, clearError]);
};