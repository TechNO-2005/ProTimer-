import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Habit } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Plus, 
  Trash2, 
  Award, 
  Calendar, 
  CheckCircle, 
  Flame, 
  Zap,
  Sparkles
} from "lucide-react";
import { 
  getGuestHabits, 
  saveGuestHabit, 
  updateGuestHabit, 
  deleteGuestHabit, 
  trackGuestHabitCompletion 
} from "@/lib/guestHabits";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Schema for the habit form
const habitSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Habit name is required"),
  target: z.number().min(1, "Target must be at least 1").max(7, "Target cannot exceed 7 days"),
});

type HabitFormValues = z.infer<typeof habitSchema>;

const Habits = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const isGuestMode = localStorage.getItem("guestMode") === "true";
  
  // Form initialization
  const form = useForm<HabitFormValues>({
    resolver: zodResolver(habitSchema),
    defaultValues: {
      name: "",
      target: 7, // Default to daily (7 days a week)
    },
  });
  
  // Reset form when modal opens/closes or selected habit changes
  const resetForm = () => {
    form.reset({
      id: selectedHabit?.id,
      name: selectedHabit?.name || "",
      target: selectedHabit?.target || 7,
    });
  };
  
  // Fetch habits
  const { data: habits = [], refetch: refetchHabits } = useQuery({
    queryKey: ["/api/habits"],
    queryFn: async () => {
      if (isGuestMode) {
        return getGuestHabits();
      } else {
        const response = await fetch("/api/habits", {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch habits");
        return response.json();
      }
    },
  });
  
  const handleAddHabit = () => {
    setSelectedHabit(null);
    form.reset({
      name: "",
      target: 7,
    });
    setIsHabitModalOpen(true);
  };
  
  const handleEditHabit = (habit: Habit) => {
    setSelectedHabit(habit);
    form.reset({
      id: habit.id,
      name: habit.name,
      target: habit.target,
    });
    setIsHabitModalOpen(true);
  };
  
  const handleDeleteHabit = async () => {
    if (!selectedHabit) return;
    
    setIsDeleting(true);
    
    try {
      if (isGuestMode) {
        const success = deleteGuestHabit(selectedHabit.id);
        if (success) {
          toast({
            title: "Habit deleted",
            description: "Your habit has been deleted successfully",
          });
          setIsHabitModalOpen(false);
          refetchHabits();
        } else {
          throw new Error("Failed to delete habit");
        }
      } else {
        await apiRequest("DELETE", `/api/habits/${selectedHabit.id}`);
        queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
        toast({
          title: "Habit deleted",
          description: "Your habit has been deleted successfully",
        });
        setIsHabitModalOpen(false);
      }
    } catch (error) {
      toast({
        title: "Failed to delete habit",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  const onSubmitHabit = async (values: HabitFormValues) => {
    try {
      if (isGuestMode) {
        if (selectedHabit?.id) {
          // Update existing habit
          const updatedHabit = updateGuestHabit(selectedHabit.id, values);
          if (updatedHabit) {
            toast({
              title: "Habit updated",
              description: "Your habit has been updated successfully",
            });
          }
        } else {
          // Create new habit
          saveGuestHabit({
            name: values.name,
            target: values.target,
            streak: 0,
            completedDays: JSON.stringify([]),
            userId: 0, // Guest user ID
          });
          
          toast({
            title: "Habit created",
            description: "Your new habit has been created successfully",
          });
        }
        
        refetchHabits();
        setIsHabitModalOpen(false);
      } else {
        if (selectedHabit?.id) {
          // Update existing habit
          await apiRequest("PUT", `/api/habits/${selectedHabit.id}`, values);
          toast({
            title: "Habit updated",
            description: "Your habit has been updated successfully",
          });
        } else {
          // Create new habit
          await apiRequest("POST", "/api/habits", {
            ...values,
            streak: 0,
            completedDays: JSON.stringify([]),
          });
          toast({
            title: "Habit created",
            description: "Your new habit has been created successfully",
          });
        }
        
        queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
        setIsHabitModalOpen(false);
      }
    } catch (error) {
      toast({
        title: "Failed to save habit",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };
  
  const trackHabit = async (habit: Habit) => {
    try {
      if (isGuestMode) {
        const updatedHabit = trackGuestHabitCompletion(habit.id);
        if (updatedHabit) {
          toast({
            title: "Habit tracked",
            description: `You've tracked "${habit.name}" for today!`,
          });
          refetchHabits();
        }
      } else {
        // Parse current completed days
        let completedDays: string[] = [];
        try {
          completedDays = JSON.parse(habit.completedDays);
        } catch (error) {
          completedDays = [];
        }
        
        // Add today's date if not already tracked
        const today = new Date().toISOString().split('T')[0];
        if (!completedDays.includes(today)) {
          completedDays.push(today);
          
          // Calculate new streak
          let newStreak = habit.streak;
          
          // Check if yesterday was completed
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayString = yesterday.toISOString().split('T')[0];
          
          if (completedDays.includes(yesterdayString) || newStreak === 0) {
            newStreak++;
          }
          
          // Update the habit
          await apiRequest("PUT", `/api/habits/${habit.id}`, {
            completedDays: JSON.stringify(completedDays),
            streak: newStreak,
          });
          
          queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
          
          toast({
            title: "Habit tracked",
            description: `You've tracked "${habit.name}" for today!`,
          });
        } else {
          toast({
            title: "Already tracked",
            description: `You've already tracked "${habit.name}" for today.`,
          });
        }
      }
    } catch (error) {
      toast({
        title: "Failed to track habit",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };
  
  // Calculate stats
  const totalHabits = habits.length;
  const totalStreaks = habits.reduce((sum, habit) => sum + (habit.streak || 0), 0);
  const avgCompletion = habits.length > 0 
    ? habits.reduce((sum, habit) => {
        const completedDays = habit.completedDays ? JSON.parse(habit.completedDays).length : 0;
        return sum + (completedDays / habit.target);
      }, 0) / habits.length * 100
    : 0;
  
  // Check if habit was completed today
  const isCompletedToday = (habit: Habit) => {
    const today = new Date().toISOString().split('T')[0];
    let completedDays: string[] = [];
    try {
      completedDays = JSON.parse(habit.completedDays);
    } catch (error) {
      return false;
    }
    return completedDays.includes(today);
  };
  
  // Get completion percentage for a habit
  const getCompletionPercentage = (habit: Habit) => {
    let completedDays: string[] = [];
    try {
      completedDays = JSON.parse(habit.completedDays);
    } catch (error) {
      completedDays = [];
    }
    return (completedDays.length / habit.target) * 100;
  };

  return (
    <div className="flex min-h-screen relative">
      <Sidebar visible={sidebarVisible} onToggle={() => setSidebarVisible(!sidebarVisible)} />

      <main className={`flex-1 transition-all duration-300 ${sidebarVisible ? 'md:ml-[280px]' : ''} px-4 py-6 md:px-8 md:py-8`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Habits</h1>
            <p className="text-gray-400">Build consistency with daily habits</p>
          </div>
          <div className="mt-4 md:mt-0">
            <Button 
              className="bg-[#388282] hover:bg-[#275050] text-white"
              onClick={handleAddHabit}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Habit
            </Button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-md flex items-center">
                <Award className="h-5 w-5 text-[#388282] mr-2" />
                Total Habits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">{totalHabits}</span>
                <span className="text-sm text-gray-400">habits tracked</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-md flex items-center">
                <Flame className="h-5 w-5 text-orange-500 mr-2" />
                Total Streaks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">{totalStreaks}</span>
                <span className="text-sm text-gray-400">days maintained</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-md flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                Average Completion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">{Math.round(avgCompletion)}%</span>
                <span className="text-sm text-gray-400">of weekly goals</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Habits list */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {habits.length > 0 ? (
            habits.map((habit) => {
              const completionPercentage = getCompletionPercentage(habit);
              const isCompleted = isCompletedToday(habit);
              
              return (
                <Card key={habit.id} className="bg-gray-900 border-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex justify-between items-center">
                      <span>{habit.name}</span>
                      <div className="flex items-center">
                        {habit.streak > 0 && (
                          <div className="flex items-center text-yellow-500 mr-3" title="Current streak">
                            <Flame className="h-4 w-4 mr-1" />
                            <span className="text-sm">{habit.streak}</span>
                          </div>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"
                          onClick={() => handleEditHabit(habit)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" 
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
                          </svg>
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 relative h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="absolute left-0 top-0 h-full bg-[#388282]" 
                        style={{ width: `${Math.min(completionPercentage, 100)}%` }}
                      />
                    </div>
                    
                    <div className="flex justify-between text-sm mb-4">
                      <span className="text-gray-400">Progress: {Math.round(completionPercentage)}%</span>
                      <span className="text-gray-400">
                        {(() => {
                          try {
                            return `${JSON.parse(habit.completedDays).length}/${habit.target} days`;
                          } catch (error) {
                            return `0/${habit.target} days`;
                          }
                        })()}
                      </span>
                    </div>
                    
                    <Button 
                      className={`w-full ${
                        isCompleted 
                          ? 'bg-gray-700 text-gray-300 cursor-not-allowed' 
                          : 'bg-[#388282] hover:bg-[#275050] text-white'
                      }`}
                      onClick={() => !isCompleted && trackHabit(habit)}
                      disabled={isCompleted}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Completed Today
                        </>
                      ) : (
                        <>
                          <Zap className="mr-2 h-4 w-4" />
                          Mark as Complete
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="col-span-full bg-gray-800 rounded-lg p-10 text-center">
              <div className="flex justify-center mb-4">
                <Calendar className="h-16 w-16 text-gray-600" />
              </div>
              <h3 className="text-xl font-medium text-gray-300 mb-2">No habits tracked yet</h3>
              <p className="text-gray-400 mb-6">
                Start building your daily routines by creating your first habit
              </p>
              <Button 
                className="bg-[#388282] hover:bg-[#275050] text-white"
                onClick={handleAddHabit}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Habit
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Habit Form Modal */}
      <Dialog open={isHabitModalOpen} onOpenChange={(open) => {
        setIsHabitModalOpen(open);
        if (open) resetForm();
      }}>
        <DialogContent className="bg-gray-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedHabit ? "Edit Habit" : "Create New Habit"}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedHabit 
                ? "Update your habit's details below"
                : "Build consistency by tracking daily activities"
              }
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitHabit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Habit Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Morning Meditation" 
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
                name="target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weekly Target (days)</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        <Slider
                          value={[field.value]}
                          min={1}
                          max={7}
                          step={1}
                          onValueChange={(vals) => field.onChange(vals[0])}
                          className="py-4"
                        />
                        <div className="flex justify-between text-sm text-gray-400">
                          <span>1 day</span>
                          <span>7 days</span>
                        </div>
                        <div className="flex justify-center">
                          <span className="text-lg font-medium">{field.value} {field.value === 1 ? 'day' : 'days'} per week</span>
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      How many days per week do you want to complete this habit?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="flex sm:justify-between gap-2">
                {selectedHabit && (
                  <Button 
                    type="button" 
                    variant="destructive"
                    onClick={handleDeleteHabit}
                    disabled={isDeleting}
                    className="mr-auto"
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                    <Trash2 className="ml-2 h-4 w-4" />
                  </Button>
                )}
                <div className="flex gap-2 ml-auto">
                  <Button type="button" variant="secondary" onClick={() => setIsHabitModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-[#388282] hover:bg-[#275050]">
                    {selectedHabit ? (
                      "Save Changes"
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Create Habit
                      </>
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Habits;
