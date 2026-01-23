import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState, UserRole } from '../types';
import { dbService } from '../services/db';

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
    const loadUser = async () => {
      const storedUserId = localStorage.getItem('auth_user_id');
      if (storedUserId) {
        try {
          const user = await dbService.getUserById(storedUserId);
          if (user) {
            setState({ user, isAuthenticated: true });
          }
        } catch (error) {
          console.error("Failed to restore session", error);
        }
      }
    };
    loadUser();
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    try {
      const users = await dbService.getUsers();
      // Note: In a real app with Firestore, you shouldn't fetch all users to check auth.
      // You should use Firebase Auth. This maintains the existing logic structure.
      const user = users.find(u => u.email === email && (!u.password || u.password === password));
      
      if (user) {
        localStorage.setItem('auth_user_id', user.id);
        setState({ user, isAuthenticated: true });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login failed", error);
      return false;
    }
  };

  const register = async (data: Omit<User, 'id' | 'status' | 'role'>): Promise<boolean> => {
    try {
      await dbService.addUser({
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