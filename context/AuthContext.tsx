import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { User, AuthState, UserRole } from '../types';
import { dbService } from '../services/db';

interface AuthContextType extends AuthState {
  login: (email: string, password?: string) => Promise<boolean>;
  register: (data: Omit<User, 'id' | 'status' | 'role'>) => Promise<boolean>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
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
             // Handle case where auth exists but db profile doesn't.
             // We do NOT sign out here automatically, because the 'register' function 
             // needs the auth session to exist to repair the profile.
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
      const credential = await signInWithEmailAndPassword(auth, email, password);
      
      // Explicitly check if profile exists to prevent "stuck" state
      const userProfile = await dbService.getUserById(credential.user.uid);
      
      if (!userProfile) {
        // If no profile, sign out and throw error to guide user to Register/Fix
        await signOut(auth);
        throw new Error("Account setup incomplete. Please register again to finish creating your account.");
      }

      // State updates are handled by the onAuthStateChanged listener
      return true;
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    }
  };

  const register = async (data: Omit<User, 'id' | 'status' | 'role'>): Promise<boolean> => {
    if (!data.password) throw new Error("Password is required");
    try {
      let uid = '';
      
      // 1. Create Auth User
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        uid = userCredential.user.uid;
      } catch (authError: any) {
        // SPECIAL HANDLING: If email already exists, check if we need to repair a broken profile
        if (authError.code === 'auth/email-already-in-use') {
          try {
             // Attempt to sign in to verify ownership before repairing
             const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
             uid = userCredential.user.uid;
             
             // Check if profile exists
             const existingProfile = await dbService.getUserById(uid);
             if (existingProfile) {
               throw new Error("This email is already registered. Please log in.");
             }
             // If we are here, we are authenticated, but profile is missing. Proceed to create it.
          } catch (loginError: any) {
             if (loginError.message === "This email is already registered. Please log in.") {
               throw loginError;
             }
             throw new Error("Email already in use. Please log in.");
          }
        } else {
          throw authError;
        }
      }

      // 2. Create Firestore Profile (Standard or Recovery)
      await dbService.createUserProfile(uid, {
        name: data.name,
        email: data.email,
        department: data.department,
        role: UserRole.EMPLOYEE
      });
      
      // 3. Manually update state immediately to prevent race conditions with redirects
      // onAuthStateChanged triggers asynchronously and might not catch the DB creation in time
      const newUserProfile = await dbService.getUserById(uid);
      if (newUserProfile) {
        setState({
          user: newUserProfile,
          isAuthenticated: true
        });
      }

      return true;
    } catch (error) {
      console.error("Registration failed", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setState({ user: null, isAuthenticated: false });
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Password reset failed", error);
      throw error;
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400">Loading application...</div>;
  }

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, resetPassword }}>
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