import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Meeting } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Plus, 
  Trash2, 
  Users, 
  Clock,
  Calendar,
  FileText,
  List,
  CheckSquare,
  Search
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Schema for meeting creation/editing
const meetingSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Meeting name is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  duration: z.number().min(5, "Duration must be at least 5 minutes"),
  agenda: z.string().optional(),
  notes: z.string().optional(),
  participants: z.string(), // JSON serialized array
  actionItems: z.string().optional(), // JSON serialized array
});

type MeetingFormValues = z.infer<typeof meetingSchema>;

const SmartMeetings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  
  const isGuestMode = localStorage.getItem("guestMode") === "true";
  
  // Form for meeting creation/editing
  const form = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      name: "",
      date: new Date().toISOString().split('T')[0],
      time: "09:00",
      duration: 30,
      agenda: "",
      notes: "",
      participants: JSON.stringify([]),
      actionItems: JSON.stringify([]),
    },
  });
  
  // Reset form when modal opens/closes or selected meeting changes
  const resetForm = () => {
    if (selectedMeeting) {
      form.reset({
        id: selectedMeeting.id,
        name: selectedMeeting.name,
        date: selectedMeeting.date,
        time: selectedMeeting.time,
        duration: selectedMeeting.duration,
        agenda: selectedMeeting.agenda || "",
        notes: selectedMeeting.notes || "",
        participants: selectedMeeting.participants,
        actionItems: selectedMeeting.actionItems || JSON.stringify([]),
      });
    } else {
      form.reset({
        name: "",
        date: new Date().toISOString().split('T')[0],
        time: "09:00",
        duration: 30,
        agenda: "",
        notes: "",
        participants: JSON.stringify([]),
        actionItems: JSON.stringify([]),
      });
    }
  };
  
  // Fetch meetings
  const { data: meetings = [], refetch: refetchMeetings } = useQuery({
    queryKey: ["/api/meetings"],
    queryFn: async () => {
      if (isGuestMode) {
        // For guest mode, return empty array or mock data
        return [
          {
            id: 1,
            userId: 0,
            name: "Team Standup",
            date: format(new Date(), "yyyy-MM-dd"),
            time: "09:00",
            duration: 30,
            agenda: "Daily team updates",
            notes: "",
            participants: JSON.stringify(["You", "Team members"]),
            actionItems: JSON.stringify([]),
          },
          {
            id: 2,
            userId: 0,
            name: "Project Kickoff",
            date: format(new Date(Date.now() + 86400000), "yyyy-MM-dd"),
            time: "10:00",
            duration: 60,
            agenda: "Discuss project goals and timeline",
            notes: "",
            participants: JSON.stringify(["You", "Project stakeholders"]),
            actionItems: JSON.stringify([]),
          }
        ];
      } else {
        const response = await fetch("/api/meetings", {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch meetings");
        return response.json();
      }
    },
  });
  
  // Delete meeting mutation
  const deleteMeetingMutation = useMutation({
    mutationFn: async (id: number) => {
      if (isGuestMode) {
        // For guest mode, simulate deletion
        return true;
      } else {
        await apiRequest("DELETE", `/api/meetings/${id}`);
        return true;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      toast({
        title: "Meeting deleted",
        description: "The meeting has been deleted successfully",
      });
      setIsMeetingModalOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete meeting: ${error.message}`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsDeleting(false);
    }
  });
  
  // Create/update meeting mutation
  const saveMeetingMutation = useMutation({
    mutationFn: async (data: MeetingFormValues) => {
      if (isGuestMode) {
        // For guest mode, simulate saving
        return { ...data, id: data.id || Date.now() };
      } else {
        if (data.id) {
          // Update existing meeting
          const response = await apiRequest("PUT", `/api/meetings/${data.id}`, data);
          return response.json();
        } else {
          // Create new meeting
          const response = await apiRequest("POST", "/api/meetings", data);
          return response.json();
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      toast({
        title: selectedMeeting ? "Meeting updated" : "Meeting created",
        description: selectedMeeting 
          ? "The meeting has been updated successfully" 
          : "New meeting has been created successfully",
      });
      setIsMeetingModalOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to save meeting: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  const handleAddMeeting = () => {
    setSelectedMeeting(null);
    resetForm();
    setIsMeetingModalOpen(true);
  };
  
  const handleEditMeeting = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    resetForm();
    setIsMeetingModalOpen(true);
  };
  
  const handleViewNotes = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setIsNotesModalOpen(true);
  };
  
  const handleDeleteMeeting = async () => {
    if (!selectedMeeting) return;
    
    setIsDeleting(true);
    deleteMeetingMutation.mutate(selectedMeeting.id);
  };
  
  const onSubmitMeeting = (values: MeetingFormValues) => {
    saveMeetingMutation.mutate(values);
  };
  
  // Filter meetings based on search query
  const filteredMeetings = meetings.filter(meeting => 
    meeting.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Sort meetings by date and time
  const sortedMeetings = [...filteredMeetings].sort((a, b) => {
    // First compare dates
    const dateComparison = a.date.localeCompare(b.date);
    if (dateComparison !== 0) return dateComparison;
    
    // If dates are the same, compare times
    return a.time.localeCompare(b.time);
  });
  
  // Group meetings by upcoming and past
  const upcomingMeetings = sortedMeetings.filter(meeting => {
    const meetingDate = new Date(`${meeting.date}T${meeting.time}`);
    return meetingDate >= new Date();
  });
  
  const pastMeetings = sortedMeetings.filter(meeting => {
    const meetingDate = new Date(`${meeting.date}T${meeting.time}`);
    return meetingDate < new Date();
  });
  
  // Format date for display
  const formatDateDisplay = (dateStr: string, timeStr: string) => {
    const date = new Date(`${dateStr}T${timeStr}`);
    return format(date, "EEEE, MMMM d, yyyy 'at' h:mm a");
  };

  return (
    <div className="flex min-h-screen relative">
      <Sidebar visible={sidebarVisible} onToggle={() => setSidebarVisible(!sidebarVisible)} />

      <main className={`flex-1 transition-all duration-300 ${sidebarVisible ? 'md:ml-[280px]' : ''} px-4 py-6 md:px-8 md:py-8`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Smart Meetings</h1>
            <p className="text-gray-400">Manage and organize your meetings efficiently</p>
          </div>
          <div className="mt-4 md:mt-0">
            <Button 
              className="bg-[#388282] hover:bg-[#275050] text-white"
              onClick={handleAddMeeting}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Meeting
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search meetings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700"
          />
        </div>

        {/* Upcoming Meetings */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Upcoming Meetings</h2>
          
          {upcomingMeetings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingMeetings.map((meeting) => (
                <Card key={meeting.id} className="bg-gray-900 border-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex justify-between items-center">
                      <span>{meeting.name}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"
                        onClick={() => handleEditMeeting(meeting)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" 
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
                        </svg>
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-gray-400 mb-2">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>{formatDateDisplay(meeting.date, meeting.time)}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-400 mb-4">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>{meeting.duration} minutes</span>
                    </div>
                    
                    {meeting.agenda && (
                      <div>
                        <h3 className="text-sm font-medium mb-1">Agenda:</h3>
                        <p className="text-sm text-gray-300 line-clamp-2">{meeting.agenda}</p>
                      </div>
                    )}
                    
                    <div className="mt-3">
                      <h3 className="text-sm font-medium mb-1">Participants:</h3>
                      <div className="flex items-center flex-wrap gap-1 text-sm">
                        {(() => {
                          try {
                            const participants = JSON.parse(meeting.participants);
                            return participants.map((participant: string, index: number) => (
                              <span key={index} className="bg-gray-800 px-2 py-1 rounded-md text-gray-300">
                                {participant}
                              </span>
                            ));
                          } catch (error) {
                            return <span className="text-gray-400">No participants</span>;
                          }
                        })()}
                      </div>
                    </div>
                    
                    <div className="mt-4 flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 border-gray-700 hover:bg-gray-800"
                        onClick={() => handleViewNotes(meeting)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Notes
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1 bg-[#388282] hover:bg-[#275050]"
                        onClick={() => handleEditMeeting(meeting)}
                      >
                        <List className="h-4 w-4 mr-2" />
                        Agenda
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-gray-900 border-gray-800 p-6 text-center">
              <Users className="h-12 w-12 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No upcoming meetings</p>
              <Button 
                className="bg-[#388282] hover:bg-[#275050]"
                onClick={handleAddMeeting}
              >
                <Plus className="mr-2 h-4 w-4" />
                Schedule a Meeting
              </Button>
            </Card>
          )}
        </div>

        {/* Past Meetings */}
        {pastMeetings.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Past Meetings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastMeetings.map((meeting) => (
                <Card key={meeting.id} className="bg-gray-900 border-gray-800 opacity-80">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex justify-between items-center">
                      <span>{meeting.name}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"
                        onClick={() => handleEditMeeting(meeting)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" 
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
                        </svg>
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-gray-400 mb-2">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>{formatDateDisplay(meeting.date, meeting.time)}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-400 mb-4">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>{meeting.duration} minutes</span>
                    </div>
                    
                    <div className="mt-3">
                      <h3 className="text-sm font-medium mb-1">Action Items:</h3>
                      <div className="text-sm text-gray-300">
                        {(() => {
                          try {
                            const actionItems = JSON.parse(meeting.actionItems || "[]");
                            if (actionItems.length === 0) {
                              return <span className="text-gray-400">No action items recorded</span>;
                            }
                            return (
                              <ul className="pl-5 list-disc space-y-1">
                                {actionItems.map((item: string, index: number) => (
                                  <li key={index}>{item}</li>
                                ))}
                              </ul>
                            );
                          } catch (error) {
                            return <span className="text-gray-400">No action items</span>;
                          }
                        })()}
                      </div>
                    </div>
                    
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full mt-4 border-gray-700 hover:bg-gray-800"
                      onClick={() => handleViewNotes(meeting)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Meeting Notes
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Meeting Form Modal */}
      <Dialog open={isMeetingModalOpen} onOpenChange={(open) => {
        setIsMeetingModalOpen(open);
        if (open) resetForm();
      }}>
        <DialogContent className="bg-gray-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedMeeting ? "Edit Meeting" : "Schedule New Meeting"}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedMeeting 
                ? "Update your meeting details below"
                : "Fill out the form to schedule a new meeting"
              }
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitMeeting)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meeting Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Team Standup" 
                        {...field} 
                        className="bg-gray-800 border-gray-700 focus:ring-[#388282]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date"
                          {...field} 
                          className="bg-gray-800 border-gray-700 focus:ring-[#388282]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <Input 
                          type="time"
                          {...field} 
                          className="bg-gray-800 border-gray-700 focus:ring-[#388282]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min={5}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        className="bg-gray-800 border-gray-700 focus:ring-[#388282]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="participants"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Participants (comma-separated)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., John, Sarah, Mike"
                        value={(() => {
                          try {
                            return JSON.parse(field.value).join(", ");
                          } catch (error) {
                            return "";
                          }
                        })()}
                        onChange={(e) => {
                          const participants = e.target.value.split(",").map(p => p.trim()).filter(Boolean);
                          field.onChange(JSON.stringify(participants));
                        }}
                        className="bg-gray-800 border-gray-700 focus:ring-[#388282]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="agenda"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agenda (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Meeting agenda or topics to discuss"
                        {...field} 
                        className="bg-gray-800 border-gray-700 focus:ring-[#388282] resize-none"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {selectedMeeting && (
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meeting Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Notes from the meeting"
                          {...field} 
                          className="bg-gray-800 border-gray-700 focus:ring-[#388282] resize-none"
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {selectedMeeting && (
                <FormField
                  control={form.control}
                  name="actionItems"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Action Items (comma-separated)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Follow up with client, Send documentation"
                          value={(() => {
                            try {
                              return JSON.parse(field.value || "[]").join(", ");
                            } catch (error) {
                              return "";
                            }
                          })()}
                          onChange={(e) => {
                            const items = e.target.value.split(",").map(p => p.trim()).filter(Boolean);
                            field.onChange(JSON.stringify(items));
                          }}
                          className="bg-gray-800 border-gray-700 focus:ring-[#388282]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter className="flex sm:justify-between gap-2">
                {selectedMeeting && (
                  <Button 
                    type="button" 
                    variant="destructive"
                    onClick={handleDeleteMeeting}
                    disabled={isDeleting}
                    className="mr-auto"
                  >
                    {isDeleting ? "Deleting..." : "Delete Meeting"}
                    <Trash2 className="ml-2 h-4 w-4" />
                  </Button>
                )}
                <div className="flex gap-2 ml-auto">
                  <Button type="button" variant="secondary" onClick={() => setIsMeetingModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-[#388282] hover:bg-[#275050]"
                    disabled={saveMeetingMutation.isPending}
                  >
                    {saveMeetingMutation.isPending 
                      ? "Saving..." 
                      : selectedMeeting ? "Update Meeting" : "Schedule Meeting"
                    }
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Meeting Notes Modal */}
      <Dialog open={isNotesModalOpen} onOpenChange={setIsNotesModalOpen}>
        <DialogContent className="bg-gray-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Meeting Notes: {selectedMeeting?.name}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {formatDateDisplay(selectedMeeting?.date || "", selectedMeeting?.time || "")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedMeeting?.notes ? (
              <div className="bg-gray-800 p-4 rounded-lg">
                <p className="whitespace-pre-wrap">{selectedMeeting.notes}</p>
              </div>
            ) : (
              <p className="text-gray-400 text-center">No notes available for this meeting</p>
            )}
            
            <div>
              <h3 className="text-sm font-medium mb-2">Action Items:</h3>
              {(() => {
                try {
                  const actionItems = JSON.parse(selectedMeeting?.actionItems || "[]");
                  if (actionItems.length === 0) {
                    return <p className="text-gray-400">No action items recorded</p>;
                  }
                  return (
                    <ul className="space-y-2">
                      {actionItems.map((item: string, index: number) => (
                        <li key={index} className="flex items-start">
                          <CheckSquare className="h-5 w-5 text-[#388282] mr-2 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  );
                } catch (error) {
                  return <p className="text-gray-400">No action items</p>;
                }
              })()}
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Participants:</h3>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  try {
                    const participants = JSON.parse(selectedMeeting?.participants || "[]");
                    return participants.map((participant: string, index: number) => (
                      <span key={index} className="bg-gray-800 px-2 py-1 rounded-md text-gray-300">
                        {participant}
                      </span>
                    ));
                  } catch (error) {
                    return <span className="text-gray-400">No participants</span>;
                  }
                })()}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              className="bg-[#388282] hover:bg-[#275050] w-full sm:w-auto"
              onClick={() => handleEditMeeting(selectedMeeting!)}
            >
              Edit Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SmartMeetings;
