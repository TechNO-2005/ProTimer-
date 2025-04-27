import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Pause, Play, Plus, X, Settings, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format, formatDuration, intervalToDuration } from "date-fns";

// Type definitions
type StudySession = {
  id: number;
  userId: number;
  subject: string;
  taskName: string | null;
  startTime: string;
  endTime: string | null;
  duration: number;
  isActive: boolean;
  breakDuration: number;
  focusDuration: number;
  createdAt: string;
};

type SubjectStat = {
  subject: string;
  duration: number;
};

// Form schemas
const subjectSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  taskName: z.string().optional(),
});

const settingsSchema = z.object({
  focusDuration: z.number().min(1, "Focus duration must be at least 1 minute"),
  breakDuration: z.number().min(1, "Break duration must be at least 1 minute"),
});

type SubjectFormValues = z.infer<typeof subjectSchema>;
type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function StudyTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedSession, setSelectedSession] = useState<StudySession | null>(null);
  const [showSubjectDialog, setShowSubjectDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [timer, setTimer] = useState<number>(0);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<"pomodoro" | "groups">("pomodoro");

  // Get all study sessions
  const { data: sessions, isLoading } = useQuery<StudySession[]>({
    queryKey: ["/api/study-sessions"],
    enabled: !!user,
  });

  // Get study stats
  const { data: stats } = useQuery<SubjectStat[]>({
    queryKey: ["/api/study-sessions/stats"],
    enabled: !!user,
  });

  // Get active session
  const { data: activeSession } = useQuery<StudySession>({
    queryKey: ["/api/study-sessions/active"],
    enabled: !!user,
    onSuccess: (data) => {
      if (data) {
        setSelectedSession(data);
        setIsRunning(true);
      }
    },
    onError: () => {
      // No active session, that's fine
    }
  });

  // Create new study session
  const createSessionMutation = useMutation({
    mutationFn: async (data: SubjectFormValues) => {
      const res = await apiRequest("POST", "/api/study-sessions", data);
      return await res.json();
    },
    onSuccess: (data: StudySession) => {
      queryClient.invalidateQueries({ queryKey: ["/api/study-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/study-sessions/active"] });
      setSelectedSession(data);
      setIsRunning(true);
      setShowSubjectDialog(false);
      toast({
        title: "Study session started",
        description: `Now studying ${data.subject}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start session",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Stop study session
  const stopSessionMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/study-sessions/${id}/stop`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/study-sessions/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/study-sessions/stats"] });
      setSelectedSession(null);
      setIsRunning(false);
      toast({
        title: "Study session stopped",
        description: "Your study session has been recorded",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to stop session",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: SettingsFormValues) => {
      if (!selectedSession) return null;
      const res = await apiRequest("PUT", `/api/study-sessions/${selectedSession.id}`, data);
      return await res.json();
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ["/api/study-sessions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/study-sessions/active"] });
        setSelectedSession(data);
        setShowSettingsDialog(false);
        toast({
          title: "Settings updated",
          description: "Your timer settings have been updated",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Subject form
  const subjectForm = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      subject: "",
      taskName: "",
    },
  });

  // Settings form
  const settingsForm = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      focusDuration: selectedSession?.focusDuration ? selectedSession.focusDuration / 60 : 25,
      breakDuration: selectedSession?.breakDuration ? selectedSession.breakDuration / 60 : 5,
    },
  });

  // Update timer every second
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isRunning && selectedSession) {
      interval = setInterval(() => {
        const startTime = new Date(selectedSession.startTime).getTime();
        const currentTime = new Date().getTime();
        const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
        setTimer(elapsedSeconds);
      }, 1000);
    } else {
      setTimer(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, selectedSession]);

  // Format time as HH:MM:SS
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')} : ${minutes.toString().padStart(2, '0')} : ${secs.toString().padStart(2, '0')}`;
  };

  // Format duration for stats display
  const formatStatDuration = (seconds: number) => {
    const duration = intervalToDuration({ start: 0, end: seconds * 1000 });
    return formatDuration(duration, { format: ['hours', 'minutes'] });
  };

  const handleStartSession = (values: SubjectFormValues) => {
    createSessionMutation.mutate(values);
  };

  const handleStopSession = () => {
    if (selectedSession) {
      stopSessionMutation.mutate(selectedSession.id);
    }
  };

  const handleUpdateSettings = (values: SettingsFormValues) => {
    // Convert minutes to seconds
    const data = {
      focusDuration: values.focusDuration * 60,
      breakDuration: values.breakDuration * 60,
    };
    updateSettingsMutation.mutate(data);
  };

  // Reset settings form when dialog opens
  useEffect(() => {
    if (showSettingsDialog && selectedSession) {
      settingsForm.reset({
        focusDuration: selectedSession.focusDuration / 60,
        breakDuration: selectedSession.breakDuration / 60,
      });
    }
  }, [showSettingsDialog, selectedSession]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const todaysSessions = sessions?.filter(
    (session) => {
      const sessionDate = new Date(session.startTime);
      const today = new Date();
      return (
        sessionDate.getDate() === today.getDate() &&
        sessionDate.getMonth() === today.getMonth() &&
        sessionDate.getFullYear() === today.getFullYear()
      );
    }
  ) || [];

  const totalStudyTimeToday = todaysSessions.reduce((total, session) => {
    return total + (session.duration || 0);
  }, 0);

  return (
    <div className="w-full min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="w-full text-center mb-12">
          <h1 className="text-5xl font-bold mb-2">Study Tracker</h1>
        </div>

        <div className="flex justify-center gap-4 mb-8">
          <Button 
            variant={mode === "pomodoro" ? "default" : "outline"}
            onClick={() => setMode("pomodoro")}
            className={mode === "pomodoro" ? "bg-white text-black" : ""}
          >
            Pomodoro Mode
          </Button>
          <Button 
            variant={mode === "groups" ? "default" : "outline"}
            onClick={() => setMode("groups")}
            className={mode === "groups" ? "bg-white text-black" : ""}
          >
            Groups
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Study Sessions List */}
          <div className="bg-black rounded-[50px] shadow-[0_0_15px_15px_rgba(225,234,233,0.45)_inset] p-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-medium">Today</h2>
              <span className="text-gray-300">{formatTime(totalStudyTimeToday)}</span>
            </div>
            
            <div className="space-y-6">
              {todaysSessions.map((session) => (
                <div key={session.id} className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mr-4">
                    <Play className="w-6 h-6" />
                  </div>
                  <div className="flex-grow">
                    <div className="text-xl">
                      {session.subject} 
                      {session.taskName && <span className="text-sm ml-2">({session.taskName})</span>}
                    </div>
                    <div className="text-right text-gray-300">
                      {formatTime(session.duration || 0)}
                    </div>
                  </div>
                </div>
              ))}

              {todaysSessions.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  No study sessions recorded today. Start one now!
                </div>
              )}
            </div>
            
            <div className="mt-6">
              <Button 
                onClick={() => setShowSubjectDialog(true)} 
                variant="outline" 
                className="w-full border-teal-500 text-teal-500 hover:bg-teal-500 hover:text-black"
              >
                <Plus className="mr-2" /> Add Subject
              </Button>
            </div>
          </div>
          
          {/* Timer Panel */}
          <div className="bg-black rounded-[50px] shadow-[0_0_15px_15px_rgba(225,234,233,0.45)_inset] p-8 flex flex-col items-center justify-center">
            <h2 className="text-2xl font-semibold mb-8">
              {selectedSession ? `Focus Time: ${selectedSession.subject}` : "Focus Time"}
            </h2>
            
            <div className="w-40 h-40 rounded-full bg-gray-800 flex items-center justify-center mb-8">
              {selectedSession?.subject?.charAt(0) || "S"}
            </div>
            
            <div className="text-6xl font-bold mb-6">
              {formatTime(timer)}
            </div>
            
            <div className="flex gap-4">
              {isRunning ? (
                <Button onClick={handleStopSession} variant="outline" size="lg" className="border-red-500 text-red-500 hover:bg-red-500 hover:text-black">
                  <Pause className="mr-2" /> Stop
                </Button>
              ) : (
                <Button onClick={() => setShowSubjectDialog(true)} variant="outline" size="lg" className="border-green-500 text-green-500 hover:bg-green-500 hover:text-black">
                  <Play className="mr-2" /> Start
                </Button>
              )}
              
              <Button onClick={() => setShowSettingsDialog(true)} variant="outline" size="lg">
                <Settings className="mr-2" /> Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        {stats && stats.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-4">Study Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.map((stat) => (
              <div key={stat.subject} className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-xl font-medium">{stat.subject}</h3>
                <p className="text-3xl font-bold mt-2">{formatStatDuration(stat.duration)}</p>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Subject Dialog */}
        <Dialog open={showSubjectDialog} onOpenChange={setShowSubjectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start New Study Session</DialogTitle>
              <DialogDescription>
                Enter a subject and optional task to start tracking your study time.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...subjectForm}>
              <form onSubmit={subjectForm.handleSubmit(handleStartSession)} className="space-y-4">
                <FormField
                  control={subjectForm.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input placeholder="Mathematics, Physics, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={subjectForm.control}
                  name="taskName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Homework, Chapter 5, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit">Start Session</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Settings Dialog */}
        <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Timer Settings</DialogTitle>
              <DialogDescription>
                Adjust your focus and break durations.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...settingsForm}>
              <form onSubmit={settingsForm.handleSubmit(handleUpdateSettings)} className="space-y-4">
                <FormField
                  control={settingsForm.control}
                  name="focusDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Focus Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={settingsForm.control}
                  name="breakDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Break Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit">Save Settings</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}