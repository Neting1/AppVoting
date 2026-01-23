import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState, UserRole } from '../types';
import { mockDb } from '../services/mockDb';

interface AuthContextType extends AuthState {
  login: (email: string, password?: string) => Promise<boolean>;
  register: (data: Omit<User, 'id' | 'status' | 'role'>) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
  });

  useEffect(() => {
    const storedUserId = localStorage.getItem('auth_user_id');
    if (storedUserId) {
      const user = mockDb.getUserById(storedUserId);
      if (user) {
        setState({ user, isAuthenticated: true });
      }
    }
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    // Simulating API latency
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const users = mockDb.getUsers();
    // In production, verify hash. Here we compare simple strings for the mock.
    const user = users.find(u => u.email === email && (!u.password || u.password === password));
    
    if (user) {
      localStorage.setItem('auth_user_id', user.id);
      setState({ user, isAuthenticated: true });
      return true;
    }
    return false;
  };

  const register = async (data: Omit<User, 'id' | 'status' | 'role'>): Promise<boolean> => {
    // Simulating API latency
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      mockDb.addUser({
        ...data,
        role: UserRole.EMPLOYEE // Default role for self-registration
      });
      return true;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_user_id');
    setState({ user: null, isAuthenticated: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};