'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  isVerified: boolean;
  aiCreditsRemaining?: number;
}

interface Workspace {
  _id: string;
  name: string;
  ownerId: string;
  members: any[];
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  loading: boolean;
  login: (email: string, passwordPlain: string) => Promise<void>;
  register: (email: string, passwordPlain: string, name: string) => Promise<void>;
  logout: () => void;
  createWorkspace: (name: string) => Promise<Workspace>;
  setCurrentWorkspace: (workspace: Workspace) => void;
  refreshWorkspaces: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  const setCurrentWorkspace = (workspace: Workspace) => {
    setCurrentWorkspaceState(workspace);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cp_current_workspace', JSON.stringify(workspace));
    }
  };

  const fetchWorkspaces = async () => {
    try {
      const data = await api.get<Workspace[]>('/workspaces');
      setWorkspaces(data);
      
      // Attempt to restore active workspace context from localStorage
      if (data.length > 0) {
        const stored = localStorage.getItem('cp_current_workspace');
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as Workspace;
            const matched = data.find((w) => w._id === parsed._id);
            if (matched) {
              setCurrentWorkspaceState(matched);
              return;
            }
          } catch {}
        }
        // Fallback to first available workspace
        setCurrentWorkspace(data[0]);
      } else {
        setCurrentWorkspaceState(null);
      }
    } catch (e) {
      console.error('Failed to load workspaces:', e);
    }
  };

  const loadUser = async () => {
    setLoading(true);
    const token = localStorage.getItem('cp_access_token');
    if (token) {
      try {
        const userData = await api.get<User>('/auth/me');
        setUser(userData);
        await fetchWorkspaces();
      } catch (e) {
        console.error('Failed to load authenticated user profile:', e);
        api.clearTokens();
        setUser(null);
        setWorkspaces([]);
        setCurrentWorkspaceState(null);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUser();
  }, []);

  const login = async (email: string, passwordPlain: string) => {
    setLoading(true);
    try {
      const data = await api.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/login', {
        email,
        password: passwordPlain,
      });
      api.setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      await fetchWorkspaces();
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, passwordPlain: string, name: string) => {
    setLoading(true);
    try {
      const data = await api.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/register', {
        email,
        password: passwordPlain,
        name,
      });
      api.setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      
      // Auto-create a default workspace for new registrants
      const defaultWorkspace = await api.post<Workspace>('/workspaces', {
        name: `${name}'s Workspace`,
      });
      setWorkspaces([defaultWorkspace]);
      setCurrentWorkspace(defaultWorkspace);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    api.clearTokens();
    setUser(null);
    setWorkspaces([]);
    setCurrentWorkspaceState(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const createWorkspace = async (name: string) => {
    const ws = await api.post<Workspace>('/workspaces', { name });
    await fetchWorkspaces();
    // Auto switch to newly created workspace
    setCurrentWorkspace(ws);
    return ws;
  };

  const refreshWorkspaces = async () => {
    await fetchWorkspaces();
  };

  const refreshUser = async () => {
    try {
      const userData = await api.get<User>('/auth/me');
      setUser(userData);
    } catch (e) {
      console.error('Failed to refresh authenticated user profile:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        workspaces,
        currentWorkspace,
        loading,
        login,
        register,
        logout,
        createWorkspace,
        setCurrentWorkspace,
        refreshWorkspaces,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
