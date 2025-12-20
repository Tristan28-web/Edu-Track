
"use client";

import type { AppUser, UserRole } from '@/types';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth as firebaseAuth, db } from '@/lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile,
  updatePassword,
  type User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { toast } from "@/hooks/use-toast";

interface AuthContextType {
  user: AppUser | null;
  role: UserRole | null;
  loading: boolean;
  loginWithUsername: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserDisplayName: (newDisplayName: string) => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data() as AppUser; 
            const finalDisplayName = userData.displayName || firebaseUser.displayName;
            const finalRole = userData.role;

            if (!finalRole) {
              console.error("CRITICAL: User document in Firestore is missing the 'role' field for UID:", firebaseUser.uid);
              toast({
                title: "Account Error",
                description: "Your user account is not configured correctly. Missing role.",
                variant: "destructive",
              });
              await signOut(firebaseAuth);
              setUser(null);
              setRole(null);
              setLoading(false);
              return; 
            }

            try {
              await updateDoc(userDocRef, {
                lastLogin: Timestamp.now(),
              });
            } catch (updateError) {
              console.warn("Could not update lastLogin timestamp:", updateError);
            }

            const appUser: AppUser = {
              ...(userDocSnap.data() as AppUser),
              id: firebaseUser.uid,
              username: userData.username,
              email: firebaseUser.email,
              displayName: finalDisplayName,
              role: finalRole,
            };

            setUser(appUser);
            setRole(finalRole);
          } else {
            console.warn("User document not found in Firestore for UID:", firebaseUser.uid);
          }
        } catch (error) {
          console.error("Error fetching/updating user document from Firestore:", error);
          toast({
            title: "Login Error",
            description: "Could not fetch user details. Please try again.",
            variant: "destructive",
          });
          await signOut(firebaseAuth); 
          setUser(null);
          setRole(null);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginWithUsername = async (username: string, password: string) => {
    try {
      const email = `${username.toLowerCase()}@edu-track.local`;
      await signInWithEmailAndPassword(firebaseAuth, email, password);
    } catch (error: any) {
      console.error("Error logging in:", error);
      toast({
        title: "Login Failed",
        description: error.code === 'auth/invalid-credential' ? "Invalid username or password." : "An error occurred during login.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateUserDisplayName = async (newDisplayName: string) => {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) {
      toast({ title: "Error", description: "You must be logged in to update your profile.", variant: "destructive" });
      throw new Error("User not authenticated");
    }

    if (role && ['teacher', 'student', 'principal'].includes(role)) {
      toast({
        title: "Permission Denied",
        description: "Users with your role are not permitted to change their display name to maintain system integrity.",
        variant: "destructive",
        duration: 7000,
      });
      throw new Error("Permission denied for this role.");
    }

    if (!newDisplayName || newDisplayName.trim().length < 2) {
      toast({ title: "Error", description: "Display name must be at least 2 characters.", variant: "destructive" });
      throw new Error("Invalid display name");
    }

    try {
      await updateProfile(currentUser, { displayName: newDisplayName });
      
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, { displayName: newDisplayName });

      setUser(prevUser => prevUser ? { ...prevUser, displayName: newDisplayName } : null);
      
      toast({ title: "Success", description: "Your display name has been updated." });
    } catch (error: any) {
      console.error("Error updating display name:", error);
      toast({ title: "Update Failed", description: error.message || "Could not update display name.", variant: "destructive" });
      throw error;
    }
  };
  
  const updateUserPassword = async (newPassword: string) => {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) {
      toast({ title: "Error", description: "You must be logged in to update your password.", variant: "destructive" });
      throw new Error("User not authenticated");
    }

    try {
      await updatePassword(currentUser, newPassword);
      toast({ title: "Success", description: "Your password has been updated successfully." });
    } catch (error: any) {
      console.error("Error updating password:", error);
      let description = "Could not update password.";
      if (error.code === 'auth/requires-recent-login') {
        description = "This operation is sensitive and requires recent authentication. Please log out and log back in to change your password.";
      } else {
        description = error.message || description;
      }
      toast({ title: "Update Failed", description, variant: "destructive", duration: 7000 });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(firebaseAuth);
      if (typeof window !== 'undefined') {
        window.location.href = '/login'; 
      }
    } catch (error: any) {
      console.error("Error logging out:", error);
      toast({
        title: "Logout Failed",
        description: error.message || "Could not log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, loginWithUsername, logout, updateUserDisplayName, updateUserPassword }}>
      {children} 
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
