import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/Sidebar";
import TaskModal from "@/components/ui/task-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Task } from "@shared/schema";
import { 
  Plus, 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle, 
  Calendar, 
  MoveUp,
  MoveDown,
  ArrowDownUp
} from "lucide-react";
import { getGuestTasks, updateGuestTask } from "@/lib/guestStorage";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";

const Priorities = () => {
  const { user } = useAuth();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState("high");
  const [isDragging, setIsDragging] = useState(false);
  
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
  
  // Get uncompleted tasks by priority
  const getTasksByPriority = (priority: string) => {
    return tasks
      .filter(task => task.priority === priority && !task.completed)
      .sort((a, b) => {
        // Sort by date then by time
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.startTime.localeCompare(b.startTime);
      });
  };
  
  const highPriorityTasks = getTasksByPriority("high");
  const mediumPriorityTasks = getTasksByPriority("medium");
  const lowPriorityTasks = getTasksByPriority("low");
  
  // Calculate counts for the stats cards
  const totalTasks = tasks.filter(task => !task.completed).length;
  const highCount = highPriorityTasks.length;
  const mediumCount = mediumPriorityTasks.length;
  const lowCount = lowPriorityTasks.length;
  
  const handleAddTask = () => {
    setSelectedTask(null);
    setIsTaskModalOpen(true);
  };
  
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };
  
  const handleChangePriority = async (taskId: number, newPriority: string) => {
    if (isGuestMode) {
      // Update task priority in localStorage
      updateGuestTask(taskId, { priority: newPriority });
      refetchTasks();
    } else {
      // Update task priority via API
      try {
        await apiRequest("PUT", `/api/tasks/${taskId}`, { priority: newPriority });
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      } catch (error) {
        console.error("Failed to update task priority:", error);
      }
    }
  };
  
  const handleTaskComplete = async (taskId: number, completed: boolean) => {
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
  
  // Handle drag and drop reordering
  const onDragEnd = (result: any) => {
    setIsDragging(false);
    
    if (!result.destination) {
      return;
    }
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    const destinationId = result.destination.droppableId;
    
    // Get the task that was dragged
    const tasksList = activeTab === "high" 
      ? highPriorityTasks 
      : activeTab === "medium" 
        ? mediumPriorityTasks 
        : lowPriorityTasks;
        
    const draggedTask = tasksList[sourceIndex];
    
    // If dragged to a different priority list
    if (destinationId !== activeTab) {
      handleChangePriority(draggedTask.id, destinationId);
    }
    
    // In a real app, we would also update the order of tasks here
  };
  
  // Format time for display
  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${period}`;
  };
  
  const currentTaskList = activeTab === "high" 
    ? highPriorityTasks 
    : activeTab === "medium" 
      ? mediumPriorityTasks 
      : lowPriorityTasks;

  return (
    <div className="flex min-h-screen relative">
      <Sidebar visible={sidebarVisible} onToggle={() => setSidebarVisible(!sidebarVisible)} />

      <main className={`flex-1 transition-all duration-300 ${sidebarVisible ? 'md:ml-[280px]' : ''} px-4 py-6 md:px-8 md:py-8`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Priorities</h1>
            <p className="text-gray-400">Focus on what matters most</p>
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

        {/* Priority summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-md flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                High Priority
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-2">
                <span className="text-2xl font-bold">{highCount}</span>
                <span className="text-sm text-gray-400">tasks</span>
              </div>
              <Progress
                value={(highCount / (totalTasks || 1)) * 100}
                className="h-2 bg-gray-800"
                indicatorClassName="bg-red-500"
              />
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-md flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                Medium Priority
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-2">
                <span className="text-2xl font-bold">{mediumCount}</span>
                <span className="text-sm text-gray-400">tasks</span>
              </div>
              <Progress
                value={(mediumCount / (totalTasks || 1)) * 100}
                className="h-2 bg-gray-800"
                indicatorClassName="bg-yellow-500"
              />
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-md flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                Low Priority
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-2">
                <span className="text-2xl font-bold">{lowCount}</span>
                <span className="text-sm text-gray-400">tasks</span>
              </div>
              <Progress
                value={(lowCount / (totalTasks || 1)) * 100}
                className="h-2 bg-gray-800"
                indicatorClassName="bg-green-500"
              />
            </CardContent>
          </Card>
        </div>

        {/* Priority tabs */}
        <Tabs defaultValue="high" value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <TabsList className="bg-gray-800">
              <TabsTrigger value="high" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
                High
              </TabsTrigger>
              <TabsTrigger value="medium" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-white">
                Medium
              </TabsTrigger>
              <TabsTrigger value="low" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                Low
              </TabsTrigger>
            </TabsList>
            <div className="hidden md:flex items-center text-sm text-gray-400">
              <ArrowDownUp className="h-4 w-4 mr-2" />
              Drag to reorder or change priority
            </div>
          </div>
        </Tabs>

        {/* Task list with drag and drop */}
        <DragDropContext 
          onDragStart={() => setIsDragging(true)}
          onDragEnd={onDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Droppable droppableId="high">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`bg-gray-800 rounded-lg p-4 ${
                    isDragging && activeTab !== "high" ? "border-2 border-dashed border-red-500/50" : ""
                  }`}
                >
                  <h3 className="flex items-center text-lg font-semibold mb-4 text-red-400">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    High Priority
                  </h3>
                  
                  {activeTab === "high" && highPriorityTasks.map((task, index) => (
                    <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="task-card p-3 bg-gray-900 rounded-lg mb-3 border-l-4 border-red-500 cursor-pointer"
                          onClick={() => handleTaskClick(task)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">{task.name}</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-gray-800"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTaskComplete(task.id, true);
                              }}
                            >
                              <CheckCircle className="h-4 w-4 text-gray-400 hover:text-green-500" />
                            </Button>
                          </div>
                          <div className="flex items-center text-xs text-gray-400">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span>{format(parseISO(task.date), "MMM d")}</span>
                            <span className="mx-1">•</span>
                            <span>{formatTime(task.startTime)}</span>
                          </div>
                          <div className="mt-2 flex justify-between">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 p-0 text-xs text-gray-400 hover:text-yellow-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChangePriority(task.id, "medium");
                              }}
                            >
                              <MoveDown className="h-3 w-3 mr-1" />
                              Medium
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 p-0 text-xs text-gray-400 hover:text-green-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChangePriority(task.id, "low");
                              }}
                            >
                              <MoveDown className="h-3 w-3 mr-1" />
                              Low
                            </Button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  
                  {provided.placeholder}
                  
                  {activeTab === "high" && highPriorityTasks.length === 0 && (
                    <div className="text-center py-6 text-gray-400">
                      <p>No high priority tasks</p>
                      <Button 
                        variant="link" 
                        className="text-red-400 hover:text-red-300"
                        onClick={handleAddTask}
                      >
                        Add task
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Droppable>
            
            <Droppable droppableId="medium">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`bg-gray-800 rounded-lg p-4 ${
                    isDragging && activeTab !== "medium" ? "border-2 border-dashed border-yellow-500/50" : ""
                  }`}
                >
                  <h3 className="flex items-center text-lg font-semibold mb-4 text-yellow-400">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Medium Priority
                  </h3>
                  
                  {activeTab === "medium" && mediumPriorityTasks.map((task, index) => (
                    <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="task-card p-3 bg-gray-900 rounded-lg mb-3 border-l-4 border-yellow-500 cursor-pointer"
                          onClick={() => handleTaskClick(task)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">{task.name}</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-gray-800"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTaskComplete(task.id, true);
                              }}
                            >
                              <CheckCircle className="h-4 w-4 text-gray-400 hover:text-green-500" />
                            </Button>
                          </div>
                          <div className="flex items-center text-xs text-gray-400">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span>{format(parseISO(task.date), "MMM d")}</span>
                            <span className="mx-1">•</span>
                            <span>{formatTime(task.startTime)}</span>
                          </div>
                          <div className="mt-2 flex justify-between">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 p-0 text-xs text-gray-400 hover:text-red-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChangePriority(task.id, "high");
                              }}
                            >
                              <MoveUp className="h-3 w-3 mr-1" />
                              High
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 p-0 text-xs text-gray-400 hover:text-green-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChangePriority(task.id, "low");
                              }}
                            >
                              <MoveDown className="h-3 w-3 mr-1" />
                              Low
                            </Button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  
                  {provided.placeholder}
                  
                  {activeTab === "medium" && mediumPriorityTasks.length === 0 && (
                    <div className="text-center py-6 text-gray-400">
                      <p>No medium priority tasks</p>
                      <Button 
                        variant="link" 
                        className="text-yellow-400 hover:text-yellow-300"
                        onClick={handleAddTask}
                      >
                        Add task
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Droppable>
            
            <Droppable droppableId="low">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`bg-gray-800 rounded-lg p-4 ${
                    isDragging && activeTab !== "low" ? "border-2 border-dashed border-green-500/50" : ""
                  }`}
                >
                  <h3 className="flex items-center text-lg font-semibold mb-4 text-green-400">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Low Priority
                  </h3>
                  
                  {activeTab === "low" && lowPriorityTasks.map((task, index) => (
                    <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="task-card p-3 bg-gray-900 rounded-lg mb-3 border-l-4 border-green-500 cursor-pointer"
                          onClick={() => handleTaskClick(task)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">{task.name}</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-gray-800"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTaskComplete(task.id, true);
                              }}
                            >
                              <CheckCircle className="h-4 w-4 text-gray-400 hover:text-green-500" />
                            </Button>
                          </div>
                          <div className="flex items-center text-xs text-gray-400">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span>{format(parseISO(task.date), "MMM d")}</span>
                            <span className="mx-1">•</span>
                            <span>{formatTime(task.startTime)}</span>
                          </div>
                          <div className="mt-2 flex justify-between">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 p-0 text-xs text-gray-400 hover:text-red-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChangePriority(task.id, "high");
                              }}
                            >
                              <MoveUp className="h-3 w-3 mr-1" />
                              High
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 p-0 text-xs text-gray-400 hover:text-yellow-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChangePriority(task.id, "medium");
                              }}
                            >
                              <MoveUp className="h-3 w-3 mr-1" />
                              Medium
                            </Button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  
                  {provided.placeholder}
                  
                  {activeTab === "low" && lowPriorityTasks.length === 0 && (
                    <div className="text-center py-6 text-gray-400">
                      <p>No low priority tasks</p>
                      <Button 
                        variant="link" 
                        className="text-green-400 hover:text-green-300"
                        onClick={handleAddTask}
                      >
                        Add task
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        </DragDropContext>
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

export default Priorities;
