import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  signInWithPopup, 
  GoogleAuthProvider,
  User as FirebaseUser,
  onAuthStateChanged
} from "firebase/auth";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";

type AuthContextType = {
  user: SelectUser | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  enableGuestMode: () => void;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, username: string) => Promise<void>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [firebaseLoading, setFirebaseLoading] = useState(true);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setFirebaseLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  const {
    data: user,
    error,
    isLoading: apiLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Combined loading state
  const isLoading = firebaseLoading || apiLoading;

  // Check if guest mode is enabled
  const isGuestMode = localStorage.getItem("guestMode") === "true";

  // Function to enable guest mode
  const enableGuestMode = () => {
    localStorage.setItem("guestMode", "true");
    toast({
      title: "Guest Mode Enabled",
      description: "You are now using ProTimer in guest mode. Your data will be stored locally.",
    });
    window.location.href = "/home";
  };

  // Firebase Google authentication
  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // The signed-in user info
      const user = result.user;
      
      toast({
        title: "Login Successful",
        description: `Welcome, ${user.displayName || user.email}!`,
      });
      
      // Here you would typically create or update the user in your backend
      // For simplicity, we'll just set the user data directly
      queryClient.setQueryData(["/api/user"], {
        id: user.uid,
        username: user.displayName || user.email?.split('@')[0] || "user",
        email: user.email,
      });
      
      localStorage.removeItem("guestMode"); // Clear guest mode if logged in
    } catch (error: any) {
      toast({
        title: "Google Login Failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  // Firebase Email/Password authentication
  const loginWithEmail = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      toast({
        title: "Login Successful",
        description: `Welcome back, ${user.displayName || user.email}!`,
      });
      
      // Set user data
      queryClient.setQueryData(["/api/user"], {
        id: user.uid,
        username: user.displayName || user.email?.split('@')[0] || "user",
        email: user.email,
      });
      
      localStorage.removeItem("guestMode"); // Clear guest mode if logged in
    } catch (error: any) {
      toast({
        title: "Email Login Failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  // Firebase Email/Password registration
  const registerWithEmail = async (email: string, password: string, username: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      toast({
        title: "Registration Successful",
        description: `Welcome to ProTimer, ${username}!`,
      });
      
      // Set user data
      queryClient.setQueryData(["/api/user"], {
        id: user.uid,
        username: username,
        email: user.email,
      });
      
      localStorage.removeItem("guestMode"); // Clear guest mode if registered
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  // Legacy backend authentication
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      localStorage.removeItem("guestMode"); // Clear guest mode if logged in
      toast({
        title: "Login Successful",
        description: `Welcome back, ${user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      localStorage.removeItem("guestMode"); // Clear guest mode if registered
      toast({
        title: "Registration Successful",
        description: `Welcome to ProTimer, ${user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (isGuestMode) {
        localStorage.removeItem("guestMode");
      } else if (firebaseUser) {
        await signOut(auth);
      } else {
        await apiRequest("POST", "/api/logout");
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        firebaseUser,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        enableGuestMode,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
