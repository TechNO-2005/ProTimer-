import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, CalendarDays, BarChart2, BookOpen, Mail, Loader2 } from "lucide-react";
import { FaGoogle } from "react-icons/fa";
import { Separator } from "@/components/ui/separator";

// Create the schema with zod for login
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Create the schema with zod for registration
const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

const AuthPage = () => {
  const [activeTab, setActiveTab] = useState<string>("login");
  const [, navigate] = useLocation();
  const { 
    user, 
    loginMutation, 
    registerMutation, 
    enableGuestMode,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail
  } = useAuth();
  
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isEmailRegisterLoading, setIsEmailRegisterLoading] = useState(false);
  
  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  
  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  
  // If the user is already logged in, redirect to the dashboard
  useEffect(() => {
    if (user) {
      navigate("/home");
    }
  }, [user, navigate]);
  
  // Handle Google sign in
  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      // Display a message about the unauthorized domain
      alert("Google Sign-in requires domain authorization in Firebase console.\n\nPlease go to Firebase console → Authentication → Settings → Authorized domains and add your Replit domain. For now, please use email/password sign-in.");

      // Uncomment this line when domain is authorized
      // await loginWithGoogle();
      // navigate("/");
    } catch (error) {
      console.error("Google sign in failed:", error);
    } finally {
      setIsGoogleLoading(false);
    }
  };
  
  // Handle email login form submission
  const onLoginSubmit = async (values: LoginFormValues) => {
    try {
      setIsEmailLoading(true);
      // Use the standard email/password authentication
      await loginMutation.mutateAsync({
        username: values.email, // Using email as username for login
        password: values.password
      });
      
      // Redirect to homepage after successful login
      window.location.href = "/"; // Using direct navigation to ensure full page reload
    } catch (error) {
      console.error("Email login failed:", error);
    } finally {
      setIsEmailLoading(false);
    }
  };
  
  // Handle email registration form submission
  const onRegisterSubmit = async (values: RegisterFormValues) => {
    try {
      setIsEmailRegisterLoading(true);
      // Use the database registration instead of Firebase
      await registerMutation.mutateAsync({
        username: values.username,
        password: values.password,
        email: values.email
      });
      
      // Redirect to homepage after successful registration
      window.location.href = "/"; // Using direct navigation to ensure full page reload
    } catch (error) {
      console.error("Email registration failed:", error);
    } finally {
      setIsEmailRegisterLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left side - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#1a1a1a]">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:text-left">
            <h1 className="font-['Jaro'] text-4xl text-white mb-2">ProTimer</h1>
            <p className="text-gray-400">Your productivity companion</p>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle>Login to your account</CardTitle>
                  <CardDescription>Enter your credentials to access your account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleLoading}
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FaGoogle className="h-4 w-4 text-red-500" />
                    )}
                    {isGoogleLoading ? "Connecting..." : "Sign in with Google"}
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <Separator className="flex-1" />
                    <span className="text-xs text-gray-500">OR</span>
                    <Separator className="flex-1" />
                  </div>
                  
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input 
                                type="email"
                                placeholder="Enter your email" 
                                {...field} 
                                className="bg-gray-800 border-gray-700"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Enter your password" 
                                {...field} 
                                className="bg-gray-800 border-gray-700"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full bg-[#388282] hover:bg-[#275050]"
                        disabled={isEmailLoading}
                      >
                        {isEmailLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Logging in...
                          </>
                        ) : (
                          <>
                            <Mail className="mr-2 h-4 w-4" />
                            Sign in with Email
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => enableGuestMode()}
                  >
                    Continue as Guest
                  </Button>
                  <p className="text-center text-sm text-gray-500">
                    Don't have an account?{" "}
                    <button 
                      className="text-[#388282] hover:underline" 
                      onClick={() => setActiveTab("register")}
                    >
                      Register
                    </button>
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="register">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle>Create an account</CardTitle>
                  <CardDescription>Sign up to start using ProTimer</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleLoading}
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FaGoogle className="h-4 w-4 text-red-500" />
                    )}
                    {isGoogleLoading ? "Connecting..." : "Sign up with Google"}
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <Separator className="flex-1" />
                    <span className="text-xs text-gray-500">OR</span>
                    <Separator className="flex-1" />
                  </div>
                  
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Choose a username" 
                                {...field} 
                                className="bg-gray-800 border-gray-700"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input 
                                type="email"
                                placeholder="Enter your email" 
                                {...field} 
                                className="bg-gray-800 border-gray-700"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Create a password" 
                                {...field} 
                                className="bg-gray-800 border-gray-700"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Confirm your password" 
                                {...field} 
                                className="bg-gray-800 border-gray-700"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full bg-[#388282] hover:bg-[#275050]"
                        disabled={isEmailRegisterLoading}
                      >
                        {isEmailRegisterLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          <>
                            <Mail className="mr-2 h-4 w-4" />
                            Sign up with Email
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => enableGuestMode()}
                  >
                    Continue as Guest
                  </Button>
                  <p className="text-center text-sm text-gray-500">
                    Already have an account?{" "}
                    <button 
                      className="text-[#388282] hover:underline" 
                      onClick={() => setActiveTab("login")}
                    >
                      Login
                    </button>
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Right side - Hero/Info Section */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-b from-[#388282] to-[#234848] p-12 items-center justify-center">
        <div className="max-w-lg">
          <h2 className="text-4xl font-bold text-white mb-6">
            Boost Your Productivity with Smart Planning
          </h2>
          <p className="text-lg text-white/80 mb-8">
            ProTimer helps you manage your time, track habits, prioritize tasks, and learn efficiently - all in one place.
          </p>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <div className="flex items-center mb-3">
                <CalendarDays className="h-6 w-6 mr-2 text-white" />
                <h3 className="text-xl font-semibold text-white">Smart Schedule</h3>
              </div>
              <p className="text-white/80">Plan your day with an intuitive scheduler that adapts to your needs.</p>
            </div>
            
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <div className="flex items-center mb-3">
                <BarChart2 className="h-6 w-6 mr-2 text-white" />
                <h3 className="text-xl font-semibold text-white">Task Priorities</h3>
              </div>
              <p className="text-white/80">Focus on what's important with our priority management system.</p>
            </div>
            
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <div className="flex items-center mb-3">
                <Clock className="h-6 w-6 mr-2 text-white" />
                <h3 className="text-xl font-semibold text-white">Habit Tracking</h3>
              </div>
              <p className="text-white/80">Build positive routines with visual habit tracking and streaks.</p>
            </div>
            
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <div className="flex items-center mb-3">
                <BookOpen className="h-6 w-6 mr-2 text-white" />
                <h3 className="text-xl font-semibold text-white">Flashcards</h3>
              </div>
              <p className="text-white/80">Boost learning with our integrated flashcard and spaced repetition system.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
