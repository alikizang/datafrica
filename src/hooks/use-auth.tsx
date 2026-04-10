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
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { User } from "@/types";

const googleProvider = new GoogleAuthProvider();

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<User>;
  signIn: (email: string, password: string) => Promise<User>;
  signInWithGoogle: () => Promise<User>;
  signInWithGoogleCredential: (idToken: string) => Promise<User>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAdminEmail = async (email: string): Promise<boolean> => {
    // First check the hardcoded fallback list
    if (ADMIN_EMAILS.includes(email.toLowerCase())) return true;
    try {
      const q = query(collection(db, "adminEmails"), where("email", "==", email));
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch {
      return false;
    }
  };

  const resolveUser = async (fbUser: FirebaseUser): Promise<User> => {
    try {
      const userDoc = await getDoc(doc(db, "users", fbUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        if (userData.role !== "admin" && fbUser.email) {
          const isAdmin = await checkAdminEmail(fbUser.email);
          if (isAdmin) {
            userData.role = "admin";
            await setDoc(doc(db, "users", fbUser.uid), { role: "admin" }, { merge: true });
          }
        }
        return userData;
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
        return newUser;
      }
    } catch (err) {
      console.error("Firestore error during auth:", err);
      // Fallback: check hardcoded admin emails when Firestore is unavailable
      const isFallbackAdmin = ADMIN_EMAILS.includes(
        (fbUser.email || "").toLowerCase()
      );
      const fallbackUser: User = {
        uid: fbUser.uid,
        email: fbUser.email || "",
        displayName: fbUser.displayName || "",
        role: isFallbackAdmin ? "admin" : "user",
        createdAt: new Date().toISOString(),
      };
      // Best-effort: try to create the user doc so the count stays accurate
      try {
        await setDoc(doc(db, "users", fbUser.uid), fallbackUser, { merge: true });
      } catch {
        // Truly offline, skip
      }
      return fallbackUser;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          setFirebaseUser(fbUser);
          const resolved = await resolveUser(fbUser);
          setUser(resolved);
        } else {
          setFirebaseUser(null);
          setUser(null);
        }
      } catch (err) {
        console.error("Auth state change error:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string): Promise<User> => {
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
    return newUser;
  };

  const signIn = async (email: string, password: string): Promise<User> => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const resolved = await resolveUser(credential.user);
    setUser(resolved);
    return resolved;
  };

  const signInWithGoogle = async (): Promise<User> => {
    const result = await signInWithPopup(auth, googleProvider);
    const resolved = await resolveUser(result.user);
    setUser(resolved);
    return resolved;
  };

  const signInWithGoogleCredential = async (idToken: string): Promise<User> => {
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    const resolved = await resolveUser(result.user);
    setUser(resolved);
    return resolved;
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setFirebaseUser(null);
  };

  const getIdToken = async () => {
    // Use firebaseUser state first, fall back to auth.currentUser
    // (auth.currentUser is set synchronously after signIn, before onAuthStateChanged fires)
    const currentUser = firebaseUser || auth.currentUser;
    if (currentUser) {
      return currentUser.getIdToken();
    }
    return null;
  };

  return (
    <AuthContext.Provider
      value={{ user, firebaseUser, loading, signUp, signIn, signInWithGoogle, signInWithGoogleCredential, signOut, getIdToken }}
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
