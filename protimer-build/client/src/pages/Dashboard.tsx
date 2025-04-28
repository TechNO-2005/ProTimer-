import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/Sidebar";
import TaskModal from "@/components/ui/task-modal";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Task, Habit, FlashcardDeck, Meeting } from "@shared/schema";
import { Plus, MoreHorizontal, Clock, Users, BookOpen } from "lucide-react";
import { getGuestTasks, getGuestTasksByDate } from "@/lib/guestStorage";
import { getGuestHabits } from "@/lib/guestHabits";

const Dashboard = () => {
  const { user } = useAuth();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; startTime: string; endTime: string } | null>(null);
  
  const today = format(new Date(), "yyyy-MM-dd");
  const isGuestMode = localStorage.getItem("guestMode") === "true";
  
  // Fetch tasks for today
  const { data: todayTasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ["/api/tasks/date", today],
    queryFn: async () => {
      if (isGuestMode) {
        return getGuestTasksByDate(today);
      } else {
        const response = await fetch(`/api/tasks/date/${today}`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch tasks");
        return response.json();
      }
    },
  });
  
  // Fetch priority tasks
  const { data: priorityTasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
    queryFn: async () => {
      if (isGuestMode) {
        return getGuestTasks().filter(task => !task.completed).sort((a, b) => {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
        }).slice(0, 5);
      } else {
        const response = await fetch("/api/tasks", {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch tasks");
        const tasks = await response.json();
        return tasks
          .filter((task: Task) => !task.completed)
          .sort((a: Task, b: Task) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
          })
          .slice(0, 5);
      }
    },
  });
  
  // Fetch habits
  const { data: habits = [] } = useQuery({
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
  
  // Fetch flashcard decks
  const { data: flashcardDecks = [] } = useQuery({
    queryKey: ["/api/flashcard-decks"],
    queryFn: async () => {
      if (isGuestMode) {
        // Mock data for guest mode
        return [];
      } else {
        const response = await fetch("/api/flashcard-decks", {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch flashcard decks");
        return response.json();
      }
    },
  });
  
  // Fetch meetings
  const { data: meetings = [] } = useQuery({
    queryKey: ["/api/meetings"],
    queryFn: async () => {
      if (isGuestMode) {
        // Mock data for guest mode
        return [];
      } else {
        const response = await fetch("/api/meetings", {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch meetings");
        return response.json();
      }
    },
  });
  
  const sortedTasks = [...todayTasks].sort((a, b) => {
    return a.startTime.localeCompare(b.startTime);
  });
  
  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const minute = parseInt(minutes, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    const formattedMinute = minute.toString().padStart(2, '0');
    return `${formattedHour}:${formattedMinute} ${period}`;
  };
  
  const handleAddTask = () => {
    setSelectedTask(null);
    setSelectedSlot({
      date: today,
      startTime: "09:00",
      endTime: "10:00",
    });
    setIsTaskModalOpen(true);
  };
  
  // Daily productivity stats
  const completedTasksCount = todayTasks.filter(task => task.completed).length;
  const totalTasksCount = todayTasks.length;
  const productivityPercent = totalTasksCount > 0 
    ? Math.round((completedTasksCount / totalTasksCount) * 100) 
    : 0;
  
  // Weekly productivity data
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeklyProductivity = [
    { day: 'Mon', value: 75 },
    { day: 'Tue', value: 60 },
    { day: 'Wed', value: 90 },
    { day: 'Thu', value: 80 },
    { day: 'Fri', value: 40 },
    { day: 'Sat', value: 25 },
    { day: 'Sun', value: 15 },
  ];
  
  // Calculate weekly tasks completed
  const weeklyTasksCompleted = 24;
  const weeklyGrowth = "+15%";

  return (
    <div className="flex min-h-screen relative">
      <Sidebar visible={sidebarVisible} onToggle={() => setSidebarVisible(!sidebarVisible)} />

      <main className={`flex-1 transition-all duration-300 ${sidebarVisible ? 'md:ml-[280px]' : ''}`}>
        <div className="px-4 py-6 md:px-8 md:py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                Welcome back, {isGuestMode ? "Guest" : user?.username || "User"}
              </h1>
              <p className="text-gray-400">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <Button 
                className="bg-[#388282] hover:bg-[#275050] text-white" 
                onClick={handleAddTask}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Task
              </Button>
              <Button variant="secondary" className="bg-gray-800 hover:bg-gray-700 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
              </Button>
            </div>
          </div>

          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Today's Schedule */}
            <Card className="bg-gray-900 bg-opacity-60 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>Today's Schedule</CardTitle>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </CardHeader>
              <CardContent>
                {sortedTasks.length > 0 ? (
                  <div className="space-y-3">
                    {sortedTasks.map((task) => (
                      <div 
                        key={task.id} 
                        className="flex items-start p-3 bg-gray-800 rounded-lg cursor-pointer"
                        onClick={() => {
                          setSelectedTask(task);
                          setIsTaskModalOpen(true);
                        }}
                      >
                        <div className="bg-[#388282] rounded-md p-2 text-xs font-medium mr-3 whitespace-nowrap">
                          {formatTime(task.startTime)}
                        </div>
                        <div>
                          <h3 className="font-medium">{task.name}</h3>
                          <p className="text-gray-400 text-sm">
                            {formatTime(task.startTime)} - {formatTime(task.endTime)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400">
                    <p>No scheduled tasks for today</p>
                    <Button 
                      variant="link" 
                      className="text-[#388282] mt-2"
                      onClick={handleAddTask}
                    >
                      Add your first task
                    </Button>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Link href="/schedule">
                  <Button 
                    variant="ghost" 
                    className="w-full text-[#00FFFF] hover:text-white hover:bg-[#388282]"
                  >
                    View Full Schedule
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            {/* Priority Tasks */}
            <Card className="bg-gray-900 bg-opacity-60 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>Priority Tasks</CardTitle>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </CardHeader>
              <CardContent>
                {priorityTasks.length > 0 ? (
                  <div className="space-y-3">
                    {priorityTasks.map((task) => (
                      <div 
                        key={task.id} 
                        className={`task-card p-3 bg-gray-800 rounded-lg priority-${task.priority} flex items-center transition-all cursor-pointer border-l-4 ${
                          task.priority === 'high' ? 'border-red-500' : 
                          task.priority === 'medium' ? 'border-yellow-500' : 
                          'border-green-500'
                        }`}
                        onClick={() => {
                          setSelectedTask(task);
                          setIsTaskModalOpen(true);
                        }}
                      >
                        <input 
                          type="checkbox" 
                          className="rounded-full mr-3 h-5 w-5 bg-gray-700 border-gray-600"
                          checked={task.completed}
                          onChange={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <h3 className="font-medium">{task.name}</h3>
                          <p className="text-gray-400 text-sm">Due {format(new Date(task.date), 'MMM d')}</p>
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
                ) : (
                  <div className="text-center py-6 text-gray-400">
                    <p>No priority tasks</p>
                    <Button 
                      variant="link" 
                      className="text-[#388282] mt-2"
                      onClick={handleAddTask}
                    >
                      Add a priority task
                    </Button>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Link href="/tasks">
                  <Button 
                    variant="ghost" 
                    className="w-full text-[#00FFFF] hover:text-white hover:bg-[#388282]"
                  >
                    View All Tasks
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            {/* Habit Tracker */}
            <Card className="bg-gray-900 bg-opacity-60 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>Habit Tracker</CardTitle>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </CardHeader>
              <CardContent>
                {habits.length > 0 ? (
                  <div className="space-y-4">
                    {habits.slice(0, 3).map((habit) => {
                      const completedDays = habit.completedDays ? JSON.parse(habit.completedDays) : [];
                      const progress = (completedDays.length / habit.target) * 100;
                      
                      return (
                        <div key={habit.id}>
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-medium">{habit.name}</h3>
                            <span className="text-[#00FFFF]">{completedDays.length}/{habit.target} days</span>
                          </div>
                          <div className="bg-gray-800 h-2 rounded-full">
                            <div 
                              className="bg-[#388282] h-full rounded-full" 
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400">
                    <p>No habits tracked yet</p>
                    <Link href="/habits">
                      <Button 
                        variant="link" 
                        className="text-[#388282] mt-2"
                      >
                        Start tracking habits
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Link href="/habits">
                  <Button 
                    variant="ghost" 
                    className="w-full text-[#00FFFF] hover:text-white hover:bg-[#388282]"
                  >
                    Manage Habits
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            {/* Productivity Chart */}
            <Card className="bg-gray-900 bg-opacity-60 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>Weekly Productivity</CardTitle>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-[180px] flex items-end justify-between px-2">
                  {weeklyProductivity.map((day) => (
                    <div key={day.day} className="flex flex-col items-center">
                      <div 
                        className="chart-bar bg-[#388282] rounded-t-sm w-8" 
                        style={{ height: `${day.value}%` }}
                      />
                      <span className="text-xs text-gray-400 mt-2">{day.day}</span>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between items-center mt-4 text-sm text-gray-400">
                  <span>Total: {weeklyTasksCompleted} tasks completed</span>
                  <span>{weeklyGrowth} vs last week</span>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Flashcards */}
            <Card className="bg-gray-900 bg-opacity-60 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>Flashcards Due</CardTitle>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </CardHeader>
              <CardContent>
                {flashcardDecks.length > 0 ? (
                  <>
                    <div className="relative bg-gray-800 h-40 rounded-lg p-4 mb-4 flex items-center justify-center">
                      <div className="absolute top-2 right-2 bg-yellow-500 text-xs px-2 py-1 rounded-full text-black font-medium">
                        Due today
                      </div>
                      <div className="text-center">
                        <h3 className="text-lg font-medium">{flashcardDecks[0].name}</h3>
                        <p className="text-gray-400 mt-1">12 cards due for review</p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-3">
                      {flashcardDecks.slice(1, 3).map((deck) => (
                        <div key={deck.id} className="flex-1 bg-gray-800 rounded-lg p-3">
                          <h3 className="font-medium">{deck.name}</h3>
                          <p className="text-gray-400 text-sm mt-1">5 cards · Due soon</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 text-gray-400 flex flex-col items-center">
                    <BookOpen className="h-10 w-10 mb-2 text-gray-500" />
                    <p>No flashcard decks created yet</p>
                    <Link href="/flashcards">
                      <Button 
                        variant="link" 
                        className="text-[#388282] mt-2"
                      >
                        Create your first deck
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Link href="/flashcards">
                  <Button 
                    variant="ghost" 
                    className="w-full text-[#00FFFF] hover:text-white hover:bg-[#388282]"
                  >
                    {flashcardDecks.length > 0 ? "Start Review" : "Create Flashcards"}
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            {/* Smart Meetings */}
            <Card className="bg-gray-900 bg-opacity-60 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>Smart Meetings</CardTitle>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </CardHeader>
              <CardContent>
                {meetings.length > 0 ? (
                  <>
                    <div className="bg-gray-800 rounded-lg p-4 mb-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{meetings[0].name}</h3>
                          <p className="text-gray-400 text-sm">{meetings[0].date}, {meetings[0].time}</p>
                        </div>
                        <span className="bg-[#388282] text-xs px-2 py-1 rounded-full">Prep needed</span>
                      </div>
                      <div className="mt-3 flex space-x-2">
                        <Button variant="secondary" size="sm" className="bg-gray-700 hover:bg-gray-600 text-white text-xs">
                          View Agenda
                        </Button>
                        <Button variant="secondary" size="sm" className="bg-gray-700 hover:bg-gray-600 text-white text-xs">
                          See Notes
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {meetings.slice(1, 3).map((meeting) => (
                        <div key={meeting.id} className="flex items-center p-3 bg-gray-800 rounded-lg">
                          <div className="bg-gray-700 rounded-full p-2 mr-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
                              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                              className="text-[#00FFFF]">
                              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                              <rect width="8" height="5" x="8" y="2" rx="1"></rect>
                              <path d="m9 12 2 2 4-4"></path>
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium">{meeting.name}</h3>
                            <p className="text-gray-400 text-xs">Notes · {meeting.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 text-gray-400 flex flex-col items-center">
                    <Users className="h-10 w-10 mb-2 text-gray-500" />
                    <p>No meetings scheduled yet</p>
                    <Link href="/smart-meetings">
                      <Button 
                        variant="link" 
                        className="text-[#388282] mt-2"
                      >
                        Schedule a meeting
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Link href="/smart-meetings">
                  <Button 
                    variant="ghost" 
                    className="w-full text-[#00FFFF] hover:text-white hover:bg-[#388282]"
                  >
                    Manage Meetings
                  </Button>
                </Link>
              </CardFooter>
            </Card>
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

export default Dashboard;
