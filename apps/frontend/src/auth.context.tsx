import type { User } from '@prisma/client';
import * as React from 'react';
import { useGetProfileQuery } from '@drivebase/react/lib/redux/endpoints/profile';
import { Loader } from 'lucide-react';

export interface AuthContext {
  isAuthenticated: boolean;
  isServerAvailable: boolean;
  logout: () => Promise<void>;
  user: User | null;
}

const authContext = React.createContext<AuthContext | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const profile = useGetProfileQuery();

  const logout = React.useCallback(async () => {
    // TODO: logout
  }, []);

  if (profile.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  const isServerAvailable =
    // @ts-expect-error - profile.error is not defined
    profile.error?.status === 'FETCH_ERROR' ? false : true;

  return (
    <authContext.Provider
      value={{
        isServerAvailable,
        isAuthenticated: profile.isSuccess,
        user: profile.data?.data ?? null,
        logout,
      }}
    >
      {children}
    </authContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(authContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
