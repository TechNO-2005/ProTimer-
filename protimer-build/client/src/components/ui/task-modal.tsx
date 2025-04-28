import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Task } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";
import { saveGuestTask, updateGuestTask, deleteGuestTask } from "@/lib/guestStorage";
import { saveGuestHabit } from "@/lib/guestHabits";

// Define a schema for the task form validation
const taskSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Task name is required"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  priority: z.enum(["high", "medium", "low"]),
  completed: z.boolean().default(false),
  isHabit: z.boolean().default(false),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  selectedSlot: { date: string; startTime: string; endTime: string } | null;
  onTaskSaved: () => void;
}

const TaskModal = ({ isOpen, onClose, task, selectedSlot, onTaskSaved }: TaskModalProps) => {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [makeHabit, setMakeHabit] = useState(false);
  
  // Check if in guest mode
  const isGuestMode = localStorage.getItem("guestMode") === "true";
  
  // Initialize the form with default values or task values if editing
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      id: task?.id || undefined,
      name: task?.name || '',
      date: task?.date || selectedSlot?.date || new Date().toISOString().split('T')[0],
      startTime: task?.startTime || selectedSlot?.startTime || '09:00',
      endTime: task?.endTime || selectedSlot?.endTime || '10:00',
      priority: task?.priority || 'medium',
      completed: task?.completed || false,
      isHabit: task?.isHabit || false,
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        id: task?.id,
        name: task?.name || '',
        date: task?.date || selectedSlot?.date || new Date().toISOString().split('T')[0],
        startTime: task?.startTime || selectedSlot?.startTime || '09:00',
        endTime: task?.endTime || selectedSlot?.endTime || '10:00',
        priority: task?.priority || 'medium',
        completed: task?.completed || false,
        isHabit: task?.isHabit || false,
      });
      
      setMakeHabit(task?.isHabit || false);
    }
  }, [isOpen, task, selectedSlot, form]);

  const onSubmit = async (values: TaskFormValues) => {
    if (isGuestMode) {
      // Handle saving in guest mode using localStorage
      try {
        if (task?.id) {
          // Update existing task
          const updatedTask = updateGuestTask(task.id, { ...values });
          if (updatedTask) {
            toast({
              title: "Task updated",
              description: "Your task has been updated successfully",
            });
          }
        } else {
          // Create new task
          const newTask = saveGuestTask({ 
            ...values, 
            userId: 0 // Guest user ID
          });
          
          // Create habit if checkbox is checked
          if (makeHabit) {
            saveGuestHabit({
              name: values.name,
              streak: 0,
              target: 7, // Default to daily
              completedDays: JSON.stringify([]), // Empty array initially
              userId: 0, // Guest user ID
            });
            
            toast({
              title: "Task & Habit created",
              description: "Your task and habit have been created successfully",
            });
          } else {
            toast({
              title: "Task created",
              description: "Your task has been created successfully",
            });
          }
        }
        
        onTaskSaved();
        onClose();
      } catch (error) {
        toast({
          title: "Failed to save task",
          description: error instanceof Error ? error.message : "Unknown error occurred",
          variant: "destructive",
        });
      }
    } else {
      // Handle saving for authenticated users using API
      try {
        if (task?.id) {
          // Update existing task
          await apiRequest("PUT", `/api/tasks/${task.id}`, values);
          queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
          toast({
            title: "Task updated",
            description: "Your task has been updated successfully",
          });
        } else {
          // Create new task
          await apiRequest("POST", "/api/tasks", values);
          queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
          
          // Create habit if checkbox is checked
          if (makeHabit) {
            await apiRequest("POST", "/api/habits", {
              name: values.name,
              streak: 0,
              target: 7, // Default to daily
              completedDays: JSON.stringify([]), // Empty array initially
            });
            queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
            
            toast({
              title: "Task & Habit created",
              description: "Your task and habit have been created successfully",
            });
          } else {
            toast({
              title: "Task created",
              description: "Your task has been created successfully",
            });
          }
        }
        
        onTaskSaved();
        onClose();
      } catch (error) {
        toast({
          title: "Failed to save task",
          description: error instanceof Error ? error.message : "Unknown error occurred",
          variant: "destructive",
        });
      }
    }
  };

  const handleDelete = async () => {
    if (!task?.id) return;
    
    setIsDeleting(true);
    
    try {
      if (isGuestMode) {
        // Delete in guest mode
        const success = deleteGuestTask(task.id);
        if (success) {
          toast({
            title: "Task deleted",
            description: "Your task has been deleted successfully",
          });
          onTaskSaved();
          onClose();
        } else {
          throw new Error("Failed to delete task");
        }
      } else {
        // Delete for authenticated users
        await apiRequest("DELETE", `/api/tasks/${task.id}`);
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        toast({
          title: "Task deleted",
          description: "Your task has been deleted successfully",
        });
        onTaskSaved();
        onClose();
      }
    } catch (error) {
      toast({
        title: "Failed to delete task",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-gray-900 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Add New Task"}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter task name" 
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
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
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
              
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
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
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-gray-800 border-gray-700 focus:ring-[#388282]">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="high" className="text-red-400">High</SelectItem>
                      <SelectItem value="medium" className="text-yellow-400">Medium</SelectItem>
                      <SelectItem value="low" className="text-green-400">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {!task && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="make-habit"
                  checked={makeHabit}
                  onCheckedChange={(checked) => setMakeHabit(checked as boolean)}
                  className="data-[state=checked]:bg-[#388282] data-[state=checked]:border-[#388282]"
                />
                <label
                  htmlFor="make-habit"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Also add as recurring habit
                </label>
              </div>
            )}

            <DialogFooter className="flex sm:justify-between gap-2">
              {task && (
                <Button 
                  type="button" 
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="mr-auto"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                  <Trash2 className="ml-2 h-4 w-4" />
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#388282] hover:bg-[#275050]">
                  {task ? "Update" : "Save"} Task
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default TaskModal;
