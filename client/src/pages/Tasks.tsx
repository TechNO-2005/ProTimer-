import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, isToday, isTomorrow, isThisWeek, isAfter } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/Sidebar";
import TaskModal from "@/components/ui/task-modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Task } from "@shared/schema";
import { Plus, Calendar, CheckCircle, Search, Filter } from "lucide-react";
import { getGuestTasks, updateGuestTask } from "@/lib/guestStorage";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const Tasks = () => {
  const { user } = useAuth();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  
  const isGuestMode = localStorage.getItem("guestMode") === "true";
  
  // Fetch all tasks
  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ["/api/tasks"],
    queryFn: async () => {
      if (isGuestMode) {
        return getGuestTasks();
      } else {
        const response = await fetch("/api/tasks", {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch tasks");
        return response.json();
      }
    },
  });
  
  const handleAddTask = () => {
    setSelectedTask(null);
    setIsTaskModalOpen(true);
  };
  
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };
  
  const toggleTaskCompletion = async (taskId: number, completed: boolean) => {
    if (isGuestMode) {
      // Update task completion status in localStorage
      updateGuestTask(taskId, { completed });
      refetchTasks();
    } else {
      // Update task completion status via API
      try {
        await apiRequest("PUT", `/api/tasks/${taskId}`, { completed });
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      } catch (error) {
        console.error("Failed to update task:", error);
      }
    }
  };
  
  // Filter tasks based on search query and active tab
  const filteredTasks = tasks.filter(task => {
    // Apply search filter
    const matchesSearch = searchQuery === "" || 
      task.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Apply tab filter
    if (activeTab === "all") {
      return matchesSearch;
    } else if (activeTab === "today") {
      return matchesSearch && isToday(parseISO(task.date));
    } else if (activeTab === "upcoming") {
      return matchesSearch && !isToday(parseISO(task.date)) && isThisWeek(parseISO(task.date));
    } else if (activeTab === "completed") {
      return matchesSearch && task.completed;
    }
    
    return matchesSearch;
  });
  
  // Group tasks by date for better organization
  const groupTasksByDate = () => {
    const grouped: Record<string, Task[]> = {};
    
    filteredTasks.forEach(task => {
      // Skip completed tasks unless we're on the completed tab
      if (task.completed && activeTab !== "completed") return;
      
      // Create user-friendly date group names
      let dateGroup;
      
      if (isToday(parseISO(task.date))) {
        dateGroup = "Today";
      } else if (isTomorrow(parseISO(task.date))) {
        dateGroup = "Tomorrow";
      } else if (isThisWeek(parseISO(task.date))) {
        dateGroup = "This Week";
      } else if (isAfter(parseISO(task.date), new Date())) {
        dateGroup = "Future";
      } else {
        dateGroup = "Past";
      }
      
      if (!grouped[dateGroup]) {
        grouped[dateGroup] = [];
      }
      
      grouped[dateGroup].push(task);
    });
    
    // Sort tasks within each group by priority and time
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => {
        // First sort by priority (high, medium, low)
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const priorityDiff = priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
        
        if (priorityDiff !== 0) return priorityDiff;
        
        // Then sort by time
        return a.startTime.localeCompare(b.startTime);
      });
    });
    
    return grouped;
  };
  
  const groupedTasks = groupTasksByDate();
  
  // Format time for display
  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${period}`;
  };

  return (
    <div className="flex min-h-screen relative">
      <Sidebar visible={sidebarVisible} onToggle={() => setSidebarVisible(!sidebarVisible)} />

      <main className={`flex-1 transition-all duration-300 ${sidebarVisible ? 'md:ml-[280px]' : ''} px-4 py-6 md:px-8 md:py-8`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Tasks</h1>
            <p className="text-gray-400">Manage and organize your tasks</p>
          </div>
          <div className="mt-4 md:mt-0">
            <Button 
              className="bg-[#388282] hover:bg-[#275050] text-white"
              onClick={handleAddTask}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Button>
          </div>
        </div>

        {/* Search and filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700"
            />
          </div>
          <Button variant="outline" className="md:w-auto w-full text-gray-300 border-gray-700 hover:bg-gray-800">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>

        {/* Task tabs */}
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-gray-800">
            <TabsTrigger value="all" className="data-[state=active]:bg-[#388282] data-[state=active]:text-white">
              All
            </TabsTrigger>
            <TabsTrigger value="today" className="data-[state=active]:bg-[#388282] data-[state=active]:text-white">
              Today
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="data-[state=active]:bg-[#388282] data-[state=active]:text-white">
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-[#388282] data-[state=active]:text-white">
              Completed
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Task list by groups */}
        <div className="space-y-6">
          {Object.keys(groupedTasks).length > 0 ? (
            Object.entries(groupedTasks).map(([dateGroup, dateTasks]) => (
              <div key={dateGroup}>
                <h2 className="text-lg font-semibold mb-4 text-gray-300">{dateGroup}</h2>
                <div className="space-y-3">
                  {dateTasks.map((task) => (
                    <div 
                      key={task.id} 
                      className={`task-card p-4 bg-gray-800 rounded-lg flex items-center transition-all border-l-4 ${
                        task.priority === 'high' ? 'border-red-500' : 
                        task.priority === 'medium' ? 'border-yellow-500' : 
                        'border-green-500'
                      }`}
                    >
                      <Checkbox 
                        checked={task.completed}
                        onCheckedChange={(checked) => toggleTaskCompletion(task.id, checked as boolean)}
                        className="mr-4 h-5 w-5 rounded-sm data-[state=checked]:bg-[#388282] data-[state=checked]:border-[#388282]"
                      />
                      <div className="flex-1 cursor-pointer" onClick={() => handleTaskClick(task)}>
                        <h3 className={`font-medium ${task.completed ? 'line-through text-gray-500' : ''}`}>
                          {task.name}
                        </h3>
                        <div className="flex items-center text-sm text-gray-400 mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>{format(parseISO(task.date), "MMM d")}</span>
                          <span className="mx-2">•</span>
                          <span>{formatTime(task.startTime)} - {formatTime(task.endTime)}</span>
                        </div>
                      </div>
                      <span className={`
                        ${task.priority === 'high' ? 'bg-red-500/20 text-red-400' : 
                          task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 
                          'bg-green-500/20 text-green-400'} 
                        text-xs px-2 py-1 rounded capitalize
                      `}>
                        {task.priority}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-gray-800 rounded-lg p-10 text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-gray-500" />
              </div>
              <h3 className="text-xl font-medium text-gray-300 mb-2">No tasks found</h3>
              <p className="text-gray-400 mb-4">
                {searchQuery ? 'No tasks match your search criteria' : 'You have no tasks in this category'}
              </p>
              <Button 
                className="bg-[#388282] hover:bg-[#275050] text-white"
                onClick={handleAddTask}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add a new task
              </Button>
            </div>
          )}
        </div>
      </main>

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        task={selectedTask}
        selectedSlot={null}
        onTaskSaved={refetchTasks}
      />
    </div>
  );
};

export default Tasks;
