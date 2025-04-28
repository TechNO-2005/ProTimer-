import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, startOfWeek, parse, isSameDay } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/Sidebar";
import TaskModal from "@/components/ui/task-modal";
import { Button } from "@/components/ui/button";
import { Task } from "@shared/schema";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { getGuestTasks } from "@/lib/guestStorage";

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8 AM to 8 PM

const Schedule = () => {
  const { user } = useAuth();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; startTime: string; endTime: string } | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Week starts on Monday
  
  const isGuestMode = localStorage.getItem("guestMode") === "true";
  
  // Generate dates for the week
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    return addDays(currentWeekStart, i);
  });
  
  // Format dates to ISO strings for API calls
  const weekDatesISO = weekDates.map(date => format(date, "yyyy-MM-dd"));
  
  // Fetch tasks for the week
  const { data: weekTasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ["/api/tasks", ...weekDatesISO],
    queryFn: async () => {
      if (isGuestMode) {
        // For guest mode, filter tasks from local storage for the current week
        const allTasks = getGuestTasks();
        return allTasks.filter(task => 
          weekDatesISO.includes(task.date)
        );
      } else {
        // For authenticated users, fetch from the API
        // Ideally, we'd have an endpoint to fetch tasks for a date range
        // As a workaround, we'll fetch all tasks and filter on the client
        const response = await fetch("/api/tasks", {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch tasks");
        const tasks = await response.json();
        return tasks.filter((task: Task) => 
          weekDatesISO.includes(task.date)
        );
      }
    },
  });
  
  const handlePreviousWeek = () => {
    setCurrentWeekStart(prevWeekStart => addDays(prevWeekStart, -7));
  };
  
  const handleNextWeek = () => {
    setCurrentWeekStart(prevWeekStart => addDays(prevWeekStart, 7));
  };
  
  const handleAddTask = (hour: number, day: Date) => {
    const date = format(day, "yyyy-MM-dd");
    const startHour = hour.toString().padStart(2, "0");
    const endHour = (hour + 1).toString().padStart(2, "0");
    
    setSelectedTask(null);
    setSelectedSlot({
      date,
      startTime: `${startHour}:00`,
      endTime: `${endHour}:00`,
    });
    setIsTaskModalOpen(true);
  };
  
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setSelectedSlot(null);
    setIsTaskModalOpen(true);
  };
  
  const formatSlotTime = (hour: number) => {
    return `${hour % 12 || 12} ${hour >= 12 ? 'PM' : 'AM'}`;
  };
  
  const getTimePosition = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const hourPosition = hours - 8; // Offset from our 8 AM start
    const minutePosition = minutes / 60; // Convert minutes to fraction of hour
    return hourPosition + minutePosition;
  };

  return (
    <div className="flex min-h-screen relative">
      <Sidebar visible={sidebarVisible} onToggle={() => setSidebarVisible(!sidebarVisible)} />

      <main className={`flex-1 transition-all duration-300 ${sidebarVisible ? 'md:ml-[280px]' : ''} px-4 py-6 md:px-8 md:py-8`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Schedule</h1>
            <p className="text-gray-400">Plan your week efficiently</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="icon"
              onClick={handlePreviousWeek}
              className="border-gray-700 hover:bg-gray-800"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="text-gray-300">
              {format(currentWeekStart, "MMM d")} - {format(addDays(currentWeekStart, 6), "MMM d, yyyy")}
            </span>
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleNextWeek}
              className="border-gray-700 hover:bg-gray-800"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <Button 
              className="bg-[#388282] hover:bg-[#275050] text-white hidden md:flex"
              onClick={() => {
                const today = new Date();
                handleAddTask(9, today); // Default to 9 AM
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Button>
          </div>
        </div>

        {/* Mobile Add Task Button */}
        <div className="md:hidden mb-4">
          <Button 
            className="bg-[#388282] hover:bg-[#275050] text-white w-full"
            onClick={() => {
              const today = new Date();
              handleAddTask(9, today); // Default to 9 AM
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>

        {/* Weekly Calendar View */}
        <div className="bg-gray-900 bg-opacity-60 rounded-xl p-4 md:p-6 overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Day Headers */}
            <div className="grid grid-cols-8 border-b border-gray-800 pb-2 mb-4">
              <div className="text-gray-400 text-sm font-medium pl-10">Time</div>
              {weekDates.map((date, i) => (
                <div key={i} className={`text-center ${isSameDay(date, new Date()) ? 'bg-[#388282]/20 rounded-md py-1' : ''}`}>
                  <p className="text-sm font-medium">{format(date, "EEE")}</p>
                  <p className={`text-lg ${isSameDay(date, new Date()) ? 'text-white' : 'text-gray-300'}`}>{format(date, "d")}</p>
                </div>
              ))}
            </div>

            {/* Time Grid */}
            <div className="relative">
              {HOURS.map((hour) => (
                <div key={hour} className="grid grid-cols-8 border-b border-gray-800 h-20">
                  <div className="flex items-start pt-1 text-gray-400 text-sm">
                    {formatSlotTime(hour)}
                  </div>
                  
                  {weekDates.map((date, dayIndex) => (
                    <div 
                      key={dayIndex} 
                      className="calendar-slot hover:bg-[#388282]/20 border-l border-gray-800 h-full relative"
                      onClick={() => handleAddTask(hour, date)}
                    >
                      {/* Place tasks that fall within this hour slot */}
                      {weekTasks
                        .filter(task => {
                          const taskDate = task.date;
                          const taskStartHour = parseInt(task.startTime.split(':')[0]);
                          return taskDate === format(date, "yyyy-MM-dd") && taskStartHour === hour;
                        })
                        .map((task) => {
                          const startPosition = getTimePosition(task.startTime);
                          const endPosition = getTimePosition(task.endTime);
                          const durationHeight = (endPosition - startPosition) * 100; // Percentage of hour
                          
                          return (
                            <div
                              key={task.id}
                              className={`absolute left-0 right-0 mx-1 rounded-md px-2 py-1 cursor-pointer overflow-hidden text-white ${
                                task.priority === 'high' ? 'bg-red-900/70' : 
                                task.priority === 'medium' ? 'bg-yellow-900/70' : 
                                'bg-green-900/70'
                              }`}
                              style={{
                                top: `${(startPosition - Math.floor(startPosition)) * 100}%`,
                                height: `${Math.min(durationHeight, 100)}%`,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTaskClick(task);
                              }}
                            >
                              <p className="text-xs font-medium truncate">{task.name}</p>
                              <p className="text-xs opacity-70">
                                {task.startTime.substring(0, 5)} - {task.endTime.substring(0, 5)}
                              </p>
                            </div>
                          );
                        })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        task={selectedTask}
        selectedSlot={selectedSlot}
        onTaskSaved={refetchTasks}
      />
    </div>
  );
};

export default Schedule;
