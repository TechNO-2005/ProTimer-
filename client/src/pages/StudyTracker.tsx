import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { Pause, Play, Plus, X, Settings, Clock, Users, Search, UserPlus, PlusCircle } from "lucide-react";
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
  FormDescription,
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

// Study Group Types
type StudyGroup = {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date | string;
  createdBy: number;
  isPrivate: boolean | null;
};

type StudyGroupMember = {
  userId: number;
  groupId: number;
  status: string;
  joinedAt: Date | string;
  username: string;
};

type LeaderboardEntry = {
  userId: number;
  username: string;
  totalDuration: number;
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

const createGroupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
  isPrivate: z.boolean().default(false),
});

const searchGroupSchema = z.object({
  searchTerm: z.string().min(1, "Search term is required"),
});

type SubjectFormValues = z.infer<typeof subjectSchema>;
type SettingsFormValues = z.infer<typeof settingsSchema>;
type CreateGroupFormValues = z.infer<typeof createGroupSchema>;
type SearchGroupFormValues = z.infer<typeof searchGroupSchema>;

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
    staleTime: 5000,
    gcTime: 10000,
    retry: false, // Don't retry since 404s are expected
  });
  
  // Get user's study groups
  const { 
    data: studyGroups,
    isLoading: isGroupsLoading,
  } = useQuery<StudyGroup[]>({
    queryKey: ["/api/study-groups"],
    enabled: !!user && mode === "groups",
  });
  
  // State for study group UI
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  
  // Query for search results
  const {
    data: searchResults,
    isLoading: isSearching,
    refetch: search,
  } = useQuery<StudyGroup[]>({
    queryKey: ["/api/study-groups/search", searchQuery],
    enabled: false,
  });
  
  // Effect to handle active session data
  useEffect(() => {
    if (activeSession) {
      setSelectedSession(activeSession);
      setIsRunning(true);
    }
  }, [activeSession]);

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
  
  // Create group form
  const createGroupForm = useForm<CreateGroupFormValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: "",
      description: "",
      isPrivate: false,
    },
  });
  
  // Search group form
  const searchGroupForm = useForm<SearchGroupFormValues>({
    resolver: zodResolver(searchGroupSchema),
    defaultValues: {
      searchTerm: "",
    },
  });
  
  // Create study group
  const createGroupMutation = useMutation({
    mutationFn: async (data: CreateGroupFormValues) => {
      const res = await apiRequest("POST", "/api/study-groups", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study-groups"] });
      setShowCreateDialog(false);
      createGroupForm.reset();
      toast({
        title: "Study group created",
        description: "Your new study group has been created",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create group",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Join study group
  const joinGroupMutation = useMutation({
    mutationFn: async (groupId: number) => {
      const res = await apiRequest("POST", `/api/study-groups/${groupId}/join`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study-groups"] });
      toast({
        title: "Group joined",
        description: "You have joined the study group",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to join group",
        description: error.message,
        variant: "destructive",
      });
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
  
  const handleCreateGroup = (values: CreateGroupFormValues) => {
    createGroupMutation.mutate(values);
  };
  
  const handleJoinGroup = (groupId: number) => {
    joinGroupMutation.mutate(groupId);
  };
  
  const handleSearch = (values: SearchGroupFormValues) => {
    setSearchQuery(values.searchTerm);
    search();
    setShowSearchDialog(false);
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
          <div className="flex relative">
            <div 
              className={`w-[400px] h-24 rounded-[70px] ${mode === "pomodoro" ? "bg-black shadow-[0_0_6px_6px_rgba(224.66,234.09,232.68,0.45)]" : "bg-[rgba(249,249,249,0.57)] shadow-[0_0_6px_6px_rgba(224.66,234.09,232.68,0.45)]"}`}
              onClick={() => setMode("pomodoro")}
            >
              <div className="h-full flex items-center justify-center cursor-pointer">
                <span className="text-white text-3xl font-medium">Pomodoro Mode</span>
              </div>
            </div>
            
            <div 
              className={`w-[210px] h-24 rounded-[70px] ml-4 ${mode === "groups" ? "bg-black shadow-[0_0_6px_6px_rgba(224.66,234.09,232.68,0.45)]" : "bg-[rgba(249,249,249,0.57)] shadow-[0_0_6px_6px_rgba(224.66,234.09,232.68,0.45)]"}`}
              onClick={() => setMode("groups")}
            >
              <div className="h-full flex items-center justify-center cursor-pointer">
                <span className="text-white text-3xl font-medium">Groups</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pomodoro Mode */}
        {mode === "pomodoro" && (
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
        )}
        
        {/* Groups Mode */}
        {mode === "groups" && (
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-medium ml-4">My Groups</h2>
              <Button 
                onClick={() => setShowCreateDialog(true)} 
                variant="ghost" 
                size="icon"
                className="rounded-full bg-black shadow-[0_0_6px_6px_rgba(225,234,233,0.45)] w-12 h-12 flex items-center justify-center mr-4"
              >
                <PlusCircle className="w-6 h-6 text-white" />
              </Button>
            </div>
            
            {isGroupsLoading ? (
              <div className="py-8 text-center">Loading study groups...</div>
            ) : (
              <div className="space-y-8">
                {(!studyGroups || studyGroups.length === 0) ? (
                  <div className="text-center py-10">
                    <p className="text-gray-400 text-xl mb-4">You haven't joined any study groups yet</p>
                    <Button 
                      onClick={() => setShowCreateDialog(true)} 
                      variant="outline" 
                      className="border-teal-500 text-teal-500 hover:bg-teal-500 hover:text-black px-6 mr-4"
                    >
                      <PlusCircle className="mr-2 h-5 w-5" /> Create a Group
                    </Button>
                    <Button 
                      onClick={() => setShowSearchDialog(true)} 
                      variant="outline" 
                      className="border-teal-500 text-teal-500 hover:bg-teal-500 hover:text-black px-6"
                    >
                      <Search className="mr-2 h-5 w-5" /> Find Groups
                    </Button>
                  </div>
                ) : (
                  studyGroups.map((group) => (
                    <div key={group.id} className="group-item">
                      <Link href={`/study-group/${group.id}`} className="block px-8">
                        <h3 className="text-4xl font-normal">{group.name}</h3>
                        <p className="text-gray-400 text-xl mt-2">
                          {group.description || `Created: ${new Date(group.createdAt).toLocaleDateString()}`}
                        </p>
                      </Link>
                      <div className="border-t border-gray-400 my-4 mx-8"></div>
                    </div>
                  ))
                )}
                
                <div className="flex justify-center mt-8">
                  <Button 
                    onClick={() => setShowSearchDialog(true)} 
                    variant="outline" 
                    className="border-teal-500 text-teal-500 hover:bg-teal-500 hover:text-black px-6"
                  >
                    <Search className="mr-2 h-5 w-5" /> Find More Groups
                  </Button>
                </div>
              </div>
            )}
            
            {/* Group Study Participants with Timer */}
            <div className="mt-12">
              <h2 className="text-2xl font-medium ml-4 mb-6">Group Study Session</h2>
              
              <div className="grid grid-cols-2 gap-8 mt-6">
                {/* Example Group Members with Study Times */}
                <div className="flex flex-col items-center">
                  <div className="bg-black rounded-[20px] shadow-[0_0_10px_10px_rgba(84.58,174,174,0.90)_inset] w-32 h-44">
                    <div className="h-full flex flex-col items-center justify-between py-4">
                      <span className="text-white font-bold text-xl">
                        {selectedSession?.subject?.charAt(0) || "S"}
                      </span>
                      <span className="text-white font-bold text-lg">You</span>
                      <span className="text-white font-bold">
                        {formatTime(timer)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-sm font-medium">Current Session</div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="bg-black rounded-[20px] shadow-[0_0_10px_10px_rgba(225,234,233,0.45)_inset] w-32 h-44">
                    <div className="h-full flex flex-col items-center justify-between py-4">
                      <span className="text-white font-bold text-xl">K</span>
                      <span className="text-white font-bold text-lg">Kane_22</span>
                      <span className="text-white font-bold">00:45:30</span>
                    </div>
                  </div>
                  <div className="mt-2 text-sm font-medium">Total Today</div>
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-4 mt-8">
                <div className="flex flex-col items-center">
                  <div className="bg-black rounded-[20px] shadow-[0_0_10px_10px_rgba(225,234,233,0.45)_inset] w-32 h-44">
                    <div className="h-full flex flex-col items-center justify-between py-4">
                      <span className="text-white font-bold text-xl">A</span>
                      <span className="text-white font-bold text-sm">Agarwal_30</span>
                      <span className="text-white font-bold">00:30:30</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="bg-black rounded-[20px] shadow-[0_0_10px_10px_rgba(225,234,233,0.45)_inset] w-32 h-44">
                    <div className="h-full flex flex-col items-center justify-between py-4">
                      <span className="text-white font-bold text-xl">S</span>
                      <span className="text-white font-bold text-sm">Seema_25</span>
                      <span className="text-white font-bold">00:19:30</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="bg-black rounded-[20px] shadow-[0_0_10px_10px_rgba(225,234,233,0.45)_inset] w-32 h-44">
                    <div className="h-full flex flex-col items-center justify-between py-4">
                      <span className="text-white font-bold text-xl">R</span>
                      <span className="text-white font-bold text-sm">Reema_25</span>
                      <span className="text-white font-bold">00:14:30</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="bg-black rounded-[20px] shadow-[0_0_10px_10px_rgba(84.58,174,174,0.90)_inset] w-32 h-44">
                    <div className="h-full flex flex-col items-center justify-between py-4">
                      <span className="text-white font-bold text-xl">R</span>
                      <span className="text-white font-bold text-sm">Reema_25</span>
                      <span className="text-white font-bold">00:10:30</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center mt-8">
                {isRunning ? (
                  <Button onClick={handleStopSession} variant="outline" size="lg" className="border-red-500 text-red-500 hover:bg-red-500 hover:text-black">
                    <Pause className="mr-2" /> Stop Session
                  </Button>
                ) : (
                  <Button onClick={() => setShowSubjectDialog(true)} variant="outline" size="lg" className="border-green-500 text-green-500 hover:bg-green-500 hover:text-black">
                    <Play className="mr-2" /> Start Session
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

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
        
        {/* Create Group Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Study Group</DialogTitle>
              <DialogDescription>
                Create a new study group to collaborate with others.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...createGroupForm}>
              <form onSubmit={createGroupForm.handleSubmit(handleCreateGroup)} className="space-y-4">
                <FormField
                  control={createGroupForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Mathematics Study Group" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createGroupForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="A group for studying mathematics together" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createGroupForm.control}
                  name="isPrivate"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Private Group</FormLabel>
                        <FormDescription>
                          Private groups won't appear in search results
                        </FormDescription>
                      </div>
                      <FormControl>
                        <div>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="peer h-4 w-4 rounded border-gray-300"
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit">Create Group</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Search Groups Dialog */}
        <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Search Study Groups</DialogTitle>
              <DialogDescription>
                Find study groups to join and collaborate with others.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...searchGroupForm}>
              <form onSubmit={searchGroupForm.handleSubmit(handleSearch)} className="space-y-4">
                <FormField
                  control={searchGroupForm.control}
                  name="searchTerm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Search Term</FormLabel>
                      <div className="flex space-x-2">
                        <FormControl>
                          <Input placeholder="Mathematics, Physics, etc." {...field} />
                        </FormControl>
                        <Button type="submit" size="sm" className="px-3">
                          <Search className="h-4 w-4 mr-2" />
                          Search
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
            
            {isSearching ? (
              <div className="py-4 text-center">Searching...</div>
            ) : searchResults && searchResults.length > 0 ? (
              <div className="space-y-3 mt-4 max-h-[300px] overflow-y-auto">
                <h3 className="font-medium">Search Results:</h3>
                {searchResults.map((group) => (
                  <div key={group.id} className="bg-gray-800 p-3 rounded-lg">
                    <div className="flex justify-between">
                      <div>
                        <h4 className="font-medium">{group.name}</h4>
                        {group.description && (
                          <p className="text-sm text-gray-400">{group.description}</p>
                        )}
                      </div>
                      <Button 
                        onClick={() => handleJoinGroup(group.id)} 
                        variant="outline" 
                        size="sm" 
                        className="self-start"
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Join
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchQuery && (
              <div className="py-4 text-center text-gray-400">
                No study groups found matching your search.
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}