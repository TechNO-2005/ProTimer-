import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import LandingPage from "@/pages/landing-page";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/Dashboard";
import Schedule from "@/pages/Schedule";
import Tasks from "@/pages/Tasks";
import Priorities from "@/pages/Priorities";
import Habits from "@/pages/Habits";
import Flashcards from "@/pages/Flashcards";
import SmartMeetings from "@/pages/SmartMeetings";
import CalendarSync from "@/pages/CalendarSync";
import StudyTracker from "@/pages/StudyTracker";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "@/lib/protected-route";
import "./index.css";

// Router component with protected routes
function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/home" component={Dashboard} />
      <ProtectedRoute path="/schedule" component={Schedule} />
      <ProtectedRoute path="/tasks" component={Tasks} />
      <ProtectedRoute path="/priorities" component={Priorities} />
      <ProtectedRoute path="/habits" component={Habits} />
      <ProtectedRoute path="/flashcards" component={Flashcards} />
      <ProtectedRoute path="/smart-meetings" component={SmartMeetings} />
      <ProtectedRoute path="/calendar-sync" component={CalendarSync} />
      <ProtectedRoute path="/study-tracker" component={StudyTracker} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-black text-white">
      <div className="max-w-[1600px] mx-auto">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Router />
            <Toaster />
          </AuthProvider>
        </QueryClientProvider>
      </div>
    </div>
  );
}

export default App;
