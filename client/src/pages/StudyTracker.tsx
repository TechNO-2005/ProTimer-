import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { Pause, Play, Plus, X, Settings, Clock, Users, Search, UserPlus, PlusCircle, Loader2 } from "lucide-react";
import { GroupDetail } from "@/components/group/GroupDetail";
import Sidebar from "@/components/layout/Sidebar";
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
  const [sidebarVisible, setSidebarVisible] = useState(true);

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
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  
  // Query for search results
  const {
    data: searchResults,
    isLoading: isSearching,
    refetch: search,
  } = useQuery<StudyGroup[]>({
    queryKey: ["/api/study-groups/search", searchQuery],
    queryFn: async () => {
      if (!searchQuery) return [];
      const res = await fetch(`/api/study-groups/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error("Failed to search for groups");
      return res.json();
    },
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/study-groups"] });
      
      // Close search dialog and reset search form
      setShowSearchDialog(false);
      searchGroupForm.reset();
      
      // Find and select the group that was just joined
      const joined = studyGroups?.find(g => g.id === variables) || 
                     searchResults?.find(g => g.id === variables);
      
      if (joined) {
        setSelectedGroup(joined);
      }
      
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
  
  const handleSearch = async (values: SearchGroupFormValues) => {
    setSearchQuery(values.searchTerm);
    try {
      await search();
    } catch (error) {
      toast({
        title: "Search Failed",
        description: "Failed to search for study groups. Please try again.",
        variant: "destructive"
      });
    }
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
    <div className="flex min-h-screen relative bg-black text-white">
      <Sidebar visible={sidebarVisible} onToggle={() => setSidebarVisible(!sidebarVisible)} />
      
      <main className={`flex-1 transition-all duration-300 ${sidebarVisible ? 'md:ml-[280px]' : ''} px-4 py-6 md:px-8 md:py-8 overflow-y-auto`}>
        <div className="w-full text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Study Tracker</h1>
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
            {selectedGroup ? (
              <GroupDetail 
                group={selectedGroup} 
                onBack={() => setSelectedGroup(null)} 
              />
            ) : (
              <>
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
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="h-12 w-12 text-teal-500 mb-4 animate-spin" />
                    <p className="text-gray-300 text-lg">Loading your study groups...</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {(!studyGroups || studyGroups.length === 0) ? (
                      <div className="flex flex-col items-center justify-center p-10 mt-8 border border-dashed border-gray-700 rounded-2xl">
                        <div className="text-center mb-8">
                          <h3 className="text-2xl mb-3 font-medium">You haven't joined any study groups yet</h3>
                          <p className="text-gray-400 max-w-md mx-auto">Create your own group or search for existing ones to collaborate with other students</p>
                        </div>
                        <div className="flex gap-4">
                          <Button 
                            onClick={() => setShowCreateDialog(true)} 
                            className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-5 h-auto rounded-xl"
                          >
                            <PlusCircle className="mr-2 h-5 w-5" /> Create New Group
                          </Button>
                          <Button 
                            onClick={() => setShowSearchDialog(true)} 
                            variant="outline" 
                            className="border-teal-500 text-teal-500 hover:bg-teal-500 hover:text-black px-6 py-5 h-auto rounded-xl"
                          >
                            <Search className="mr-2 h-5 w-5" /> Find Groups
                          </Button>
                        </div>
                      </div>
                    ) : (
                      studyGroups.map((group) => (
                        <div 
                          key={group.id} 
                          className="group-item bg-gray-900 bg-opacity-40 rounded-xl hover:bg-gray-800 transition-all duration-200 cursor-pointer"
                          onClick={() => setSelectedGroup(group)}
                        >
                          <div className="block px-8 py-4">
                            <h3 className="text-3xl font-normal text-white">{group.name}</h3>
                            <p className="text-gray-400 text-lg mt-2">
                              {group.description || "No description provided"}
                            </p>
                            <p className="text-gray-500 text-sm mt-2">
                              Created: {new Date(group.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    
                    {studyGroups && studyGroups.length > 0 && (
                      <div className="flex justify-center mt-12">
                        <Button 
                          onClick={() => setShowSearchDialog(true)} 
                          variant="outline" 
                          className="border-teal-500 text-teal-500 hover:bg-teal-500 hover:text-black px-8 py-6 h-auto rounded-xl"
                        >
                          <Search className="mr-2 h-5 w-5" /> Find More Groups
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            
            {/* Group Study Participants with Timer */}
            <div className="mt-12">
              <h2 className="text-2xl font-medium ml-4 mb-6">Group Study Session</h2>
              
              {studyGroups && studyGroups.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                    {/* Your Study Card */}
                    <div className="flex flex-col items-center">
                      <div className="bg-black rounded-[20px] shadow-[0_0_10px_10px_rgba(84.58,174,174,0.90)_inset] w-32 h-44">
                        <div className="h-full flex flex-col items-center justify-between py-4">
                          <span className="text-white font-bold text-xl">
                            {selectedSession?.subject?.charAt(0) || user?.username?.charAt(0) || "?"}
                          </span>
                          <span className="text-white font-bold text-lg">You</span>
                          <span className="text-white font-bold">
                            {formatTime(timer)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 text-sm font-medium">Current Session</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center mt-8 p-6 border border-dashed border-gray-600 rounded-xl">
                    <p className="text-gray-400 text-center mb-4">
                      Group members will appear here when they join the study session.
                    </p>
                    <p className="text-gray-500 text-sm text-center">
                      Members of your study group who are actively studying will appear here with their study times.
                      <br />Share your group name with friends to start studying together!
                    </p>
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
                </>
              ) : (
                <div className="flex flex-col items-center justify-center mt-8 p-8 border border-dashed border-gray-600 rounded-xl">
                  <p className="text-gray-300 text-center text-xl mb-4">
                    You haven't joined any study groups yet
                  </p>
                  <p className="text-gray-500 text-center mb-6">
                    Create your own study group or join existing ones to track study time together
                  </p>
                  <div className="flex gap-4">
                    <Button
                      onClick={() => setShowCreateDialog(true)}
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      <PlusCircle className="mr-2 h-5 w-5" /> Create Group
                    </Button>
                    <Button
                      onClick={() => setShowSearchDialog(true)}
                      variant="outline"
                      className="border-teal-500 text-teal-500 hover:bg-teal-500 hover:text-black"
                    >
                      <Search className="mr-2 h-5 w-5" /> Find Groups
                    </Button>
                  </div>
                </div>
              )}
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
                      <FormControl>
                        <div className="relative">
                          <Input placeholder="Mathematics, Physics, etc." {...field} />
                          <Button 
                            type="submit" 
                            size="sm" 
                            className="absolute right-1 top-1 h-8 px-3 bg-teal-600 hover:bg-teal-700 text-white"
                            disabled={isSearching}
                          >
                            {isSearching ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Search className="h-4 w-4 mr-2" />
                                Search
                              </>
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Enter a keyword to find study groups by name or description
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
            
            {isSearching ? (
              <div className="py-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-teal-500 mx-auto mb-4" />
                <p>Searching for study groups...</p>
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              <div className="space-y-3 mt-6 max-h-[300px] overflow-y-auto pr-2">
                <h3 className="font-medium text-lg">Search Results ({searchResults.length})</h3>
                {searchResults.map((group) => (
                  <div key={group.id} className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors">
                    <div className="flex justify-between">
                      <div>
                        <h4 className="font-medium text-lg">{group.name}</h4>
                        {group.description && (
                          <p className="text-sm text-gray-400 mt-1">{group.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Created: {new Date(group.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button 
                        onClick={() => handleJoinGroup(group.id)} 
                        variant="outline" 
                        size="sm" 
                        className="self-start border-teal-500 text-teal-500 hover:bg-teal-500 hover:text-black"
                        disabled={joinGroupMutation.isPending}
                      >
                        {joinGroupMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-1" />
                            Join
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchQuery && (
              <div className="py-8 text-center text-gray-400">
                <p>No study groups found matching "{searchQuery}"</p>
                <p className="mt-2 text-sm">Try a different search term or create your own group</p>
                <Button 
                  variant="outline" 
                  className="mt-4 border-teal-500 text-teal-500 hover:bg-teal-500 hover:text-black"
                  onClick={() => {
                    setShowSearchDialog(false);
                    setShowCreateDialog(true);
                  }}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create a New Group
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}