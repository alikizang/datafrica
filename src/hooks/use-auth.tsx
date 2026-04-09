"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { User } from "@/types";

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if email is in adminEmails collection
  const checkAdminEmail = async (email: string): Promise<boolean> => {
    try {
      const q = query(collection(db, "adminEmails"), where("email", "==", email));
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        const userDoc = await getDoc(doc(db, "users", fbUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          // Check if user should be admin but isn't yet
          if (userData.role !== "admin" && fbUser.email) {
            const isAdmin = await checkAdminEmail(fbUser.email);
            if (isAdmin) {
              userData.role = "admin";
              await setDoc(doc(db, "users", fbUser.uid), { ...userData, role: "admin" }, { merge: true });
            }
          }
          setUser(userData);
        } else {
          const isAdmin = fbUser.email ? await checkAdminEmail(fbUser.email) : false;
          const newUser: User = {
            uid: fbUser.uid,
            email: fbUser.email || "",
            displayName: fbUser.displayName || "",
            role: isAdmin ? "admin" : "user",
            createdAt: new Date().toISOString(),
          };
          await setDoc(doc(db, "users", fbUser.uid), newUser);
          setUser(newUser);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });

    const isAdmin = await checkAdminEmail(email);
    const newUser: User = {
      uid: credential.user.uid,
      email,
      displayName: name,
      role: isAdmin ? "admin" : "user",
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, "users", credential.user.uid), newUser);
    setUser(newUser);
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setFirebaseUser(null);
  };

  const getIdToken = async () => {
    if (firebaseUser) {
      return firebaseUser.getIdToken();
    }
    return null;
  };

  return (
    <AuthContext.Provider
      value={{ user, firebaseUser, loading, signUp, signIn, signOut, getIdToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
