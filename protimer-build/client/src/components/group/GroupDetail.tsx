import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, UserPlus, Users, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type StudyGroup = {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date | string;
  createdBy: number;
  isPrivate: boolean | null;
};

type StudyGroupMember = {
  userId: number;
  groupId: number;
  status: string;
  joinedAt: Date | string;
  username: string;
};

type LeaderboardEntry = {
  userId: number;
  username: string;
  totalDuration: number;
};

export function GroupDetail({ 
  group, 
  onBack 
}: { 
  group: StudyGroup;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Get group members
  const { 
    data: members, 
    isLoading: isLoadingMembers,
  } = useQuery<(StudyGroupMember & { username: string })[]>({
    queryKey: ["/api/study-groups", group.id, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/study-groups/${group.id}/members`);
      if (!res.ok) throw new Error("Failed to fetch group members");
      return res.json();
    },
  });
  
  // Get leaderboard data
  const {
    data: leaderboard,
    isLoading: isLoadingLeaderboard,
  } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/study-groups", group.id, "leaderboard"],
    queryFn: async () => {
      const res = await fetch(`/api/study-groups/${group.id}/leaderboard`);
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
  });
  
  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/study-groups/${group.id}/join`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study-groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/study-groups", group.id, "members"] });
      toast({
        title: "Group joined",
        description: `You have joined ${group.name}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to join group",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Format time as HH:MM:SS
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Check if current user is a member
  const isUserMember = members?.some(member => member.userId === user?.id);
  
  // Handle join group
  const handleJoinGroup = () => {
    joinGroupMutation.mutate();
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onBack}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Groups
        </Button>
      </div>
      
      <div className="bg-gray-900 p-6 rounded-xl">
        <h2 className="text-3xl font-bold mb-2">{group.name}</h2>
        {group.description && (
          <p className="text-gray-300 text-lg mb-3">{group.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4">
          <p className="text-gray-400 text-sm flex items-center">
            <span className="inline-block w-3 h-3 bg-teal-500 rounded-full mr-2"></span>
            Created {new Date(group.createdAt).toLocaleDateString()}
          </p>
          {members?.some(member => member.userId === group.createdBy) && (
            <p className="text-gray-400 text-sm flex items-center">
              <span className="inline-block w-3 h-3 bg-teal-500 rounded-full mr-2"></span>
              Creator: {members.find(member => member.userId === group.createdBy)?.username}
            </p>
          )}
          <p className="text-gray-400 text-sm flex items-center">
            <span className="inline-block w-3 h-3 bg-teal-500 rounded-full mr-2"></span>
            {members?.length || 0} Members
          </p>
        </div>
      </div>
      
      {!isUserMember && (
        <div className="flex justify-start">
          <Button 
            onClick={handleJoinGroup} 
            className="bg-teal-600 hover:bg-teal-700 text-white"
            disabled={joinGroupMutation.isPending}
          >
            {joinGroupMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            Join This Group
          </Button>
        </div>
      )}
      
      <div className="border-t border-gray-800 my-6"></div>
      
      <div>
        <h3 className="text-xl font-medium mb-4 flex items-center">
          <Users className="mr-2 h-5 w-5" />
          Group Members
        </h3>
        
        {isLoadingMembers ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
          </div>
        ) : members && members.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {members.map((member) => (
                <div 
                  key={member.userId} 
                  className={`${member.status === 'admin' || member.userId === group.createdBy ? 'bg-gray-800 border border-teal-600' : 'bg-gray-800'} rounded-lg p-4 transition-all hover:bg-gray-700`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium flex items-center">
                        {member.username}
                        {member.userId === user?.id && (
                          <span className="ml-2 text-teal-400 text-xs">(You)</span>
                        )}
                      </h4>
                      <p className="text-sm text-gray-400">
                        Joined: {new Date(member.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {(member.status === 'admin' || member.userId === group.createdBy) && (
                      <div className="px-3 py-1 bg-teal-800 text-teal-100 text-xs rounded-full flex items-center">
                        Admin {member.userId === group.createdBy && '• Creator'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            No members in this group yet. Be the first to join!
          </div>
        )}
      </div>
      
      <div className="mt-8">
        <h3 className="text-xl font-medium mb-4">Study Leaderboard</h3>
        
        {isLoadingLeaderboard ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
          </div>
        ) : leaderboard && leaderboard.length > 0 ? (
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Username</th>
                  <th className="px-4 py-3 text-right">Total Study Time</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, index) => (
                  <tr key={entry.userId} className={`border-t border-gray-800 ${entry.userId === user?.id ? 'bg-teal-900 bg-opacity-20' : ''}`}>
                    <td className="px-4 py-3">{index + 1}</td>
                    <td className="px-4 py-3">
                      {entry.username}
                      {entry.userId === user?.id && <span className="ml-2 text-teal-400">(You)</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatTime(entry.totalDuration)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            No study sessions recorded yet. Start studying to appear on the leaderboard!
          </div>
        )}
      </div>
    </div>
  );
}