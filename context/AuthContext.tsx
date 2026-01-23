import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../services/firebase';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          // Fetch the user profile from Firestore
          const userProfile = await dbService.getUserById(firebaseUser.uid);
          
          if (userProfile) {
            setState({ 
              user: userProfile, 
              isAuthenticated: true 
            });
          } else {
             // Handle case where auth exists but db profile doesn't
             console.warn("Auth user found but no Firestore profile");
             setState({ user: null, isAuthenticated: false });
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setState({ user: null, isAuthenticated: false });
        }
      } else {
        setState({ user: null, isAuthenticated: false });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    if (!password) return false;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // State updates are handled by the onAuthStateChanged listener
      return true;
    } catch (error) {
      console.error("Login failed", error);
      throw error; // Propagate error to UI
    }
  };

  const register = async (data: Omit<User, 'id' | 'status' | 'role'>): Promise<boolean> => {
    if (!data.password) throw new Error("Password is required");
    try {
      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      
      // 2. Create Firestore Profile
      // The role assignment logic (First user = Admin) happens in dbService.createUserProfile
      await dbService.createUserProfile(userCredential.user.uid, {
        name: data.name,
        email: data.email,
        department: data.department,
        role: UserRole.EMPLOYEE // dbService might override this if it's the first user
      });

      return true;
    } catch (error) {
      console.error("Registration failed", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400">Loading application...</div>;
  }

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