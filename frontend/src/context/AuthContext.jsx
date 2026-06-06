import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase';

const AuthContext = createContext(null);

const googleProvider = new GoogleAuthProvider();

function mapAuthError(code) {
  const messages = {
    'auth/email-already-in-use': 'That email is already registered. Try signing in.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/user-not-found': 'No account found with that email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed before completing.',
    'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
  };
  return messages[code] || 'Authentication failed. Please try again.';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUpWithEmail = useCallback(async (email, password) => {
    if (!auth) throw new Error('Firebase is not configured.');
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (err) {
      throw new Error(mapAuthError(err.code));
    }
  }, []);

  const signInWithEmail = useCallback(async (email, password) => {
    if (!auth) throw new Error('Firebase is not configured.');
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (err) {
      throw new Error(mapAuthError(err.code));
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!auth) throw new Error('Firebase is not configured.');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (err) {
      throw new Error(mapAuthError(err.code));
    }
  }, []);

  const signInMock = useCallback(() => {
    setUser({ email: 'mockuser@example.com', displayName: 'Mock Developer' });
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        configured,
        signUpWithEmail,
        signInWithEmail,
        signInWithGoogle,
        logout,
        signInMock,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
