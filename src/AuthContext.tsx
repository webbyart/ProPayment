import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

interface AuthContextType {
  user: User | null;
  role: 'admin' | 'hr' | null;
  loading: boolean;
  login: (username: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  role: null, 
  loading: true,
  login: async () => {},
  logout: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'hr' | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (username: string, pass: string) => {
    const email = `${username}@internal.com`;
    try {
      // Try to login
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const u = cred.user;
      
      // Ensure role is set in Firestore
      const userDoc = await getDoc(doc(db, 'users', u.uid));
      if (!userDoc.exists()) {
        const initialRole = username === 'admin' ? 'admin' : 'hr';
        await setDoc(doc(db, 'users', u.uid), {
          uid: u.uid,
          email: u.email,
          role: initialRole,
          name: username.charAt(0).toUpperCase() + username.slice(1)
        });
        setRole(initialRole);
      }
    } catch (error: any) {
      // If user doesn't exist, create them (for the predefined ones)
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        const validUsers: Record<string, string> = {
          'admin': 'admin123',
          'staff1': '123456',
          'staff2': '123456',
          'staff3': '123456',
          'staff4': '123456',
          'staff5': '123456',
        };

        if (validUsers[username] === pass) {
          const cred = await createUserWithEmailAndPassword(auth, email, pass);
          const u = cred.user;
          const initialRole = username === 'admin' ? 'admin' : 'hr';
          await setDoc(doc(db, 'users', u.uid), {
            uid: u.uid,
            email: u.email,
            role: initialRole,
            name: username.charAt(0).toUpperCase() + username.slice(1)
          });
          setRole(initialRole);
          return;
        }
      }
      throw error;
    }
  };

  const logout = () => auth.signOut();

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        if (userDoc.exists()) {
          setRole(userDoc.data().role);
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
