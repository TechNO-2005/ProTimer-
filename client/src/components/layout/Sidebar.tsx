import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  Home, 
  Calendar, 
  BarChart2, 
  LayoutGrid, 
  Clock, 
  BookOpen, 
  Users, 
  Globe, 
  ChevronLeft,
  ChevronRight,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface SidebarProps {
  visible: boolean;
  onToggle: () => void;
}

const Sidebar = ({ visible, onToggle }: SidebarProps) => {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const isGuestMode = localStorage.getItem("guestMode") === "true";
  
  // For mobile, we need to be able to close the sidebar
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  
  const handleLogout = () => {
    if (isGuestMode) {
      // Remove guest mode and redirect to landing page
      localStorage.removeItem("guestMode");
      window.location.href = "/";
    } else {
      // Regular logout for authenticated users
      logoutMutation.mutate();
      window.location.href = "/";
    }
  };
  
  const navLinks = [
    { path: "/home", label: "Home", icon: <Home className="h-5 w-5" /> },
    { path: "/schedule", label: "Schedule", icon: <Calendar className="h-5 w-5" /> },
    { path: "/priorities", label: "Priorities", icon: <BarChart2 className="h-5 w-5" /> },
    { path: "/tasks", label: "Tasks", icon: <LayoutGrid className="h-5 w-5" /> },
    { path: "/habits", label: "Habits", icon: <Clock className="h-5 w-5" /> },
    { path: "/flashcards", label: "Flashcards", icon: <BookOpen className="h-5 w-5" /> },
    { path: "/smart-meetings", label: "Smart Meetings", icon: <Users className="h-5 w-5" /> },
    { path: "/calendar-sync", label: "Calendar Sync", icon: <Globe className="h-5 w-5" /> },
  ];

  // Mobile sidebar toggle
  const toggleMobileSidebar = () => {
    setIsMobileExpanded(!isMobileExpanded);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div 
        className={`fixed z-50 left-0 top-0 bottom-0 w-[280px] bg-gradient-to-b from-[#388282] via-[#275050] to-[#234848] transition-all duration-300 hidden md:block ${visible ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="px-6 pt-6 pb-4 flex flex-col h-full">
          <div className="flex justify-between items-center">
            <h1 className="font-['Jaro'] text-3xl text-white mb-10">ProTimer</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="text-white hover:bg-white/10"
            >
              {visible ? <ChevronLeft /> : <ChevronRight />}
            </Button>
          </div>
          
          <nav className="space-y-3 flex-1">
            {navLinks.map((link) => (
              <Link 
                key={link.path} 
                href={link.path}
                className={`flex items-center gap-3 text-white text-lg py-2 px-3 rounded-md transition-colors ${
                  location === link.path 
                    ? 'bg-[#312727] shadow-[0px_0px_4px_4px_rgba(224.66,234.09,232.68,0.45)]' 
                    : 'hover:text-[#00FFFF]'
                }`}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>

          <div className="mt-auto pt-4 border-t border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{isGuestMode ? "Guest User" : user?.username}</p>
                <p className="text-gray-300 text-sm">{isGuestMode ? "Local data only" : "Signed In"}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-white hover:bg-white/10"
              >
                <LogOut className="h-5 w-5 mr-2" />
                {isGuestMode ? "Exit Guest" : "Logout"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle Button for collapsed sidebar (Desktop) */}
      {!visible && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="fixed left-4 top-4 z-50 bg-gray-800/60 text-white hover:bg-gray-700 hover:text-[#00FFFF] transition-all shadow-md hidden md:flex"
          aria-label="Open sidebar"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      )}

      {/* Mobile Sidebar */}
      <div className="md:hidden">
        {/* Mobile sidebar toggle button (visible when sidebar is closed) */}
        {!isMobileExpanded && (
          <button 
            onClick={toggleMobileSidebar}
            className="fixed top-4 left-4 z-50 bg-[#388282] p-2 rounded-full text-white shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" 
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" x2="20" y1="12" y2="12"/>
              <line x1="4" x2="20" y1="6" y2="6"/>
              <line x1="4" x2="20" y1="18" y2="18"/>
            </svg>
          </button>
        )}

        {/* Mobile sidebar */}
        <div 
          className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-sm transition-all duration-300 ${
            isMobileExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={toggleMobileSidebar}
        >
          <div 
            className={`fixed left-0 top-0 bottom-0 w-[80%] max-w-[300px] bg-gradient-to-b from-[#388282] via-[#275050] to-[#234848] transition-all duration-300 ${
              isMobileExpanded ? 'translate-x-0' : '-translate-x-full'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4 flex flex-col h-full">
              <div className="flex justify-between items-center mb-8">
                <h1 className="font-['Jaro'] text-3xl text-white">ProTimer</h1>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMobileSidebar}
                  className="text-white hover:bg-white/10"
                >
                  <ChevronLeft />
                </Button>
              </div>
              
              <nav className="space-y-3 flex-1">
                {navLinks.map((link) => (
                  <Link 
                    key={link.path} 
                    href={link.path}
                    className={`flex items-center gap-3 text-white text-base py-2 px-3 rounded-md transition-colors ${
                      location === link.path 
                        ? 'bg-[#312727] shadow-[0px_0px_4px_4px_rgba(224.66,234.09,232.68,0.45)]' 
                        : 'hover:text-[#00FFFF]'
                    }`}
                    onClick={toggleMobileSidebar}
                  >
                    {link.icon}
                    <span>{link.label}</span>
                  </Link>
                ))}
              </nav>

              <div className="mt-auto pt-4 border-t border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white">{isGuestMode ? "Guest User" : user?.username}</p>
                    <p className="text-gray-300 text-xs">{isGuestMode ? "Local data only" : "Signed In"}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-white hover:bg-white/10"
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    {isGuestMode ? "Exit" : "Logout"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
