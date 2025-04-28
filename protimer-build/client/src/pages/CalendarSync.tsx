import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  Globe, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  Plus,
  ArrowRight,
  Loader2
} from "lucide-react";
import { FaGoogle, FaMicrosoft, FaApple, FaSlack } from "react-icons/fa";

const CalendarSync = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [isGoogleConnecting, setIsGoogleConnecting] = useState(false);
  const [isOutlookConnecting, setIsOutlookConnecting] = useState(false);
  const [isAppleConnecting, setIsAppleConnecting] = useState(false);
  const [isSlackConnecting, setIsSlackConnecting] = useState(false);
  
  const isGuestMode = localStorage.getItem("guestMode") === "true";
  
  // Mock connected services for demonstration
  const [connectedServices, setConnectedServices] = useState({
    google: false,
    outlook: false,
    apple: false,
    slack: false
  });
  
  // Mock sync settings
  const [syncSettings, setSyncSettings] = useState({
    importEvents: true,
    exportEvents: true,
    notifications: true,
    autoAccept: false
  });
  
  const handleConnectService = (service: string) => {
    if (isGuestMode) {
      toast({
        title: "Guest Mode",
        description: "Calendar sync is not available in guest mode. Please create an account to use this feature.",
        variant: "destructive"
      });
      return;
    }
    
    switch(service) {
      case 'google':
        setIsGoogleConnecting(true);
        setTimeout(() => {
          setConnectedServices({...connectedServices, google: true});
          setIsGoogleConnecting(false);
          toast({
            title: "Google Calendar Connected",
            description: "Your Google Calendar has been successfully connected",
          });
        }, 1500);
        break;
        
      case 'outlook':
        setIsOutlookConnecting(true);
        setTimeout(() => {
          setConnectedServices({...connectedServices, outlook: true});
          setIsOutlookConnecting(false);
          toast({
            title: "Outlook Calendar Connected",
            description: "Your Outlook Calendar has been successfully connected",
          });
        }, 1500);
        break;
        
      case 'apple':
        setIsAppleConnecting(true);
        setTimeout(() => {
          setConnectedServices({...connectedServices, apple: true});
          setIsAppleConnecting(false);
          toast({
            title: "Apple Calendar Connected",
            description: "Your Apple Calendar has been successfully connected",
          });
        }, 1500);
        break;
        
      case 'slack':
        setIsSlackConnecting(true);
        setTimeout(() => {
          setConnectedServices({...connectedServices, slack: true});
          setIsSlackConnecting(false);
          toast({
            title: "Slack Connected",
            description: "Your Slack account has been successfully connected",
          });
        }, 1500);
        break;
    }
  };
  
  const handleDisconnectService = (service: string) => {
    switch(service) {
      case 'google':
        setConnectedServices({...connectedServices, google: false});
        toast({
          title: "Google Calendar Disconnected",
          description: "Your Google Calendar has been disconnected",
        });
        break;
        
      case 'outlook':
        setConnectedServices({...connectedServices, outlook: false});
        toast({
          title: "Outlook Calendar Disconnected",
          description: "Your Outlook Calendar has been disconnected",
        });
        break;
        
      case 'apple':
        setConnectedServices({...connectedServices, apple: false});
        toast({
          title: "Apple Calendar Disconnected",
          description: "Your Apple Calendar has been disconnected",
        });
        break;
        
      case 'slack':
        setConnectedServices({...connectedServices, slack: false});
        toast({
          title: "Slack Disconnected",
          description: "Your Slack account has been disconnected",
        });
        break;
    }
  };
  
  const handleToggleSetting = (setting: string) => {
    setSyncSettings({
      ...syncSettings,
      [setting]: !syncSettings[setting as keyof typeof syncSettings]
    });
    
    toast({
      title: "Setting Updated",
      description: `Calendar sync setting has been updated`
    });
  };

  return (
    <div className="flex min-h-screen relative">
      <Sidebar visible={sidebarVisible} onToggle={() => setSidebarVisible(!sidebarVisible)} />

      <main className={`flex-1 transition-all duration-300 ${sidebarVisible ? 'md:ml-[280px]' : ''} px-4 py-6 md:px-8 md:py-8`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Calendar Sync</h1>
            <p className="text-gray-400">Connect and sync your external calendars</p>
          </div>
        </div>

        {isGuestMode ? (
          <Card className="bg-gray-900 border-gray-800 mb-8">
            <CardHeader>
              <CardTitle>Guest Mode Limitations</CardTitle>
              <CardDescription className="text-gray-400">
                Calendar sync is not available in guest mode
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4 text-gray-300">
                <AlertCircle className="h-10 w-10 text-amber-500" />
                <div>
                  <h3 className="font-medium mb-1">Limited Functionality</h3>
                  <p className="text-gray-400">Create an account to connect external calendars and enable sync.</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="bg-[#388282] hover:bg-[#275050] w-full sm:w-auto"
                onClick={() => window.location.href = "/auth"}
              >
                Create an Account <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <>
            {/* Connected Services */}
            <h2 className="text-xl font-semibold mb-4">Connected Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Google Calendar */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-md flex items-center">
                    <FaGoogle className="h-5 w-5 text-red-500 mr-2" />
                    Google Calendar
                  </CardTitle>
                  {connectedServices.google && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-400 mb-4">
                    {connectedServices.google 
                      ? "Sync your Google Calendar events with ProTimer" 
                      : "Connect your Google Calendar to sync events"
                    }
                  </p>
                </CardContent>
                <CardFooter>
                  {connectedServices.google ? (
                    <Button 
                      variant="destructive" 
                      className="w-full"
                      onClick={() => handleDisconnectService('google')}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button 
                      className="w-full bg-[#388282] hover:bg-[#275050]"
                      onClick={() => handleConnectService('google')}
                      disabled={isGoogleConnecting}
                    >
                      {isGoogleConnecting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Connect
                        </>
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>

              {/* Outlook Calendar */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-md flex items-center">
                    <FaMicrosoft className="h-5 w-5 text-blue-500 mr-2" />
                    Outlook
                  </CardTitle>
                  {connectedServices.outlook && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-400 mb-4">
                    {connectedServices.outlook 
                      ? "Sync your Outlook Calendar events with ProTimer" 
                      : "Connect your Outlook Calendar to sync events"
                    }
                  </p>
                </CardContent>
                <CardFooter>
                  {connectedServices.outlook ? (
                    <Button 
                      variant="destructive" 
                      className="w-full"
                      onClick={() => handleDisconnectService('outlook')}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button 
                      className="w-full bg-[#388282] hover:bg-[#275050]"
                      onClick={() => handleConnectService('outlook')}
                      disabled={isOutlookConnecting}
                    >
                      {isOutlookConnecting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Connect
                        </>
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>

              {/* Apple Calendar */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-md flex items-center">
                    <FaApple className="h-5 w-5 text-gray-300 mr-2" />
                    Apple Calendar
                  </CardTitle>
                  {connectedServices.apple && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-400 mb-4">
                    {connectedServices.apple 
                      ? "Sync your Apple Calendar events with ProTimer" 
                      : "Connect your Apple Calendar to sync events"
                    }
                  </p>
                </CardContent>
                <CardFooter>
                  {connectedServices.apple ? (
                    <Button 
                      variant="destructive" 
                      className="w-full"
                      onClick={() => handleDisconnectService('apple')}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button 
                      className="w-full bg-[#388282] hover:bg-[#275050]"
                      onClick={() => handleConnectService('apple')}
                      disabled={isAppleConnecting}
                    >
                      {isAppleConnecting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Connect
                        </>
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>

              {/* Slack */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-md flex items-center">
                    <FaSlack className="h-5 w-5 text-purple-500 mr-2" />
                    Slack
                  </CardTitle>
                  {connectedServices.slack && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-400 mb-4">
                    {connectedServices.slack 
                      ? "Get meeting notifications in Slack" 
                      : "Connect Slack to get meeting notifications"
                    }
                  </p>
                </CardContent>
                <CardFooter>
                  {connectedServices.slack ? (
                    <Button 
                      variant="destructive" 
                      className="w-full"
                      onClick={() => handleDisconnectService('slack')}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button 
                      className="w-full bg-[#388282] hover:bg-[#275050]"
                      onClick={() => handleConnectService('slack')}
                      disabled={isSlackConnecting}
                    >
                      {isSlackConnecting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Connect
                        </>
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </div>

            {/* Sync Settings */}
            <h2 className="text-xl font-semibold mb-4">Sync Settings</h2>
            <Card className="bg-gray-900 border-gray-800 mb-8">
              <CardHeader>
                <CardTitle>Calendar Integration Settings</CardTitle>
                <CardDescription className="text-gray-400">
                  Configure how ProTimer interacts with your calendars
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Import External Events</div>
                    <div className="text-xs text-gray-400">Import events from connected calendars</div>
                  </div>
                  <Switch 
                    checked={syncSettings.importEvents}
                    onCheckedChange={() => handleToggleSetting('importEvents')}
                    className="data-[state=checked]:bg-[#388282]"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Export ProTimer Events</div>
                    <div className="text-xs text-gray-400">Export ProTimer events to connected calendars</div>
                  </div>
                  <Switch 
                    checked={syncSettings.exportEvents}
                    onCheckedChange={() => handleToggleSetting('exportEvents')}
                    className="data-[state=checked]:bg-[#388282]"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Meeting Notifications</div>
                    <div className="text-xs text-gray-400">Send notifications for upcoming meetings</div>
                  </div>
                  <Switch 
                    checked={syncSettings.notifications}
                    onCheckedChange={() => handleToggleSetting('notifications')}
                    className="data-[state=checked]:bg-[#388282]"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Auto-Accept Invitations</div>
                    <div className="text-xs text-gray-400">Automatically accept calendar invitations</div>
                  </div>
                  <Switch 
                    checked={syncSettings.autoAccept}
                    onCheckedChange={() => handleToggleSetting('autoAccept')}
                    className="data-[state=checked]:bg-[#388282]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Sync Status */}
            <h2 className="text-xl font-semibold mb-4">Sync Status</h2>
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Calendar Sync Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <CheckCircle className="h-10 w-10 text-green-500" />
                  <div>
                    <h3 className="font-medium mb-1">Last Sync: Just now</h3>
                    <p className="text-gray-400">All calendars are up to date</p>
                  </div>
                </div>
                
                <div className="space-y-4 mt-6">
                  <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-[#388282] mr-3" />
                      <span>Total Events</span>
                    </div>
                    <span className="font-medium">15</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center">
                      <Globe className="h-5 w-5 text-[#388282] mr-3" />
                      <span>Connected Services</span>
                    </div>
                    <span className="font-medium">
                      {Object.values(connectedServices).filter(Boolean).length}/4
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full sm:w-auto bg-[#388282] hover:bg-[#275050]"
                  onClick={() => {
                    toast({
                      title: "Sync Complete",
                      description: "Your calendars have been successfully synchronized",
                    });
                  }}
                >
                  Sync Now
                </Button>
              </CardFooter>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default CalendarSync;
