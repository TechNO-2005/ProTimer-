import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Users, 
  BarChart2, 
  Settings,
  BookOpen,
  Target,
  Calendar,
  Video
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type StudySidebarProps = {
  onStartSession?: () => void;
};

type SubjectStat = {
  subject: string;
  duration: number;
};

export function StudySidebar({ onStartSession }: StudySidebarProps) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  
  // Get study stats
  const { data: stats } = useQuery<SubjectStat[]>({
    queryKey: ["/api/study-sessions/stats"],
  });
  
  // Format time display for stats
  const formatTimeShort = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };
  
  const navItems = [
    { name: "Timer", icon: <Clock className="w-5 h-5" />, path: "/study-tracker" },
    { name: "Groups", icon: <Users className="w-5 h-5" />, path: "/study-groups" },
    { name: "Statistics", icon: <BarChart2 className="w-5 h-5" />, path: "/statistics" },
    { name: "Subjects", icon: <BookOpen className="w-5 h-5" />, path: "/subjects" },
    { name: "Goals", icon: <Target className="w-5 h-5" />, path: "/goals" },
    { name: "Schedule", icon: <Calendar className="w-5 h-5" />, path: "/schedule" },
    { name: "Sessions", icon: <Video className="w-5 h-5" />, path: "/sessions" },
    { name: "Settings", icon: <Settings className="w-5 h-5" />, path: "/settings" },
  ];
  
  return (
    <div 
      className={cn(
        "h-full min-h-screen bg-gray-900 flex flex-col transition-all duration-300 relative py-8",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <button 
        className="absolute top-12 -right-4 w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center shadow-lg hover:bg-teal-700 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="w-5 h-5 text-white" />
        ) : (
          <ChevronLeft className="w-5 h-5 text-white" />
        )}
      </button>
      
      <div className="px-4 mb-8">
        {!collapsed && <h2 className="text-xl font-semibold mb-2 text-white">Study Hub</h2>}
        {collapsed && (
          <div className="flex justify-center">
            <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
          </div>
        )}
      </div>
      
      <div className="flex-1">
        <nav className="space-y-1 px-2">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <div className={cn(
                "flex items-center px-3 py-3 rounded-lg transition-colors cursor-pointer",
                location === item.path 
                  ? "bg-teal-600 bg-opacity-30 text-teal-300" 
                  : "text-gray-300 hover:bg-gray-800 hover:text-teal-200"
              )}>
                <div className={cn(
                  "flex items-center",
                  !collapsed ? "justify-start space-x-3" : "justify-center w-full"
                )}>
                  <span>{item.icon}</span>
                  {!collapsed && <span>{item.name}</span>}
                </div>
              </div>
            </Link>
          ))}
        </nav>
      </div>
      
      {!collapsed && stats && stats.length > 0 && (
        <div className="mt-6 px-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Recent Subjects</h3>
          <div className="space-y-2">
            {stats.slice(0, 3).map((stat) => (
              <div key={stat.subject} className="bg-gray-800 rounded-md p-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">{stat.subject}</span>
                  <span className="text-teal-400 text-xs">{formatTimeShort(stat.duration)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="mt-6 px-4 mb-4">
        {!collapsed && (
          <Button 
            variant="outline" 
            className="w-full border-teal-500 text-teal-500 hover:bg-teal-500 hover:text-black"
            onClick={onStartSession}
          >
            <Clock className="mr-2 h-4 w-4" /> Start Session
          </Button>
        )}
        {collapsed && (
          <div className="flex justify-center">
            <Button 
              size="icon" 
              variant="outline" 
              className="w-10 h-10 rounded-full border-teal-500 text-teal-500 hover:bg-teal-500 hover:text-black"
              onClick={onStartSession}
            >
              <Clock className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}