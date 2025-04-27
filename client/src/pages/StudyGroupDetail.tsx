import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

// Define types for the data
interface StudyGroup {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date | string;
  createdBy: number;
  isPrivate: boolean | null;
}

interface StudyGroupMember {
  userId: number;
  groupId: number;
  status: string;
  joinedAt: Date | string;
  username: string;
}

interface LeaderboardEntry {
  userId: number;
  username: string;
  totalDuration: number;
}
import {
  Loader2,
  Users,
  LogOut,
  Trash2,
  ArrowLeft,
  Timer,
  Trophy,
  Medal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Helper function to format duration
function formatStudyTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  
  return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${remainingMinutes} min`;
}

export default function StudyGroupDetail() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/study-groups/:id");
  const groupId = params?.id ? parseInt(params.id) : 0;

  // Query to get study group details
  const {
    data: group,
    isLoading: isGroupLoading,
    error: groupError,
  } = useQuery<StudyGroup>({
    queryKey: [`/api/study-groups/${groupId}`],
    enabled: !!groupId && !!user,
  });

  // Query to get study group members
  const {
    data: members,
    isLoading: isMembersLoading,
    error: membersError,
  } = useQuery<StudyGroupMember[]>({
    queryKey: [`/api/study-groups/${groupId}/members`],
    enabled: !!groupId && !!user,
  });

  // Query to get study group leaderboard
  const {
    data: leaderboard,
    isLoading: isLeaderboardLoading,
    error: leaderboardError,
  } = useQuery<LeaderboardEntry[]>({
    queryKey: [`/api/study-groups/${groupId}/leaderboard`],
    enabled: !!groupId && !!user,
  });

  // Mutation to leave the study group
  const leaveGroupMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/study-groups/${groupId}/leave`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        throw new Error("Failed to leave study group");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "You have left the study group",
      });
      navigate("/study-groups");
      queryClient.invalidateQueries({ queryKey: ["/api/study-groups"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to leave the study group: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to delete the study group
  const deleteGroupMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/study-groups/${groupId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to delete study group");
      }
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Study group has been deleted",
      });
      navigate("/study-groups");
      queryClient.invalidateQueries({ queryKey: ["/api/study-groups"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete the study group: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Check if the user is the creator of the group
  const isCreator = group && user ? group.createdBy === user.id : false;

  // Check if the user is a member of the group
  const isMember = members?.some(member => member.userId === user?.id && member.status === "active");

  if (isGroupLoading || isMembersLoading || isLeaderboardLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (groupError || !group) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate("/study-groups")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Groups
          </Button>
        </div>
        <div className="bg-destructive/20 p-4 rounded-md">
          <h2 className="text-lg font-semibold text-destructive">Error</h2>
          <p>Failed to load study group details. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate("/study-groups")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Groups
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 mb-6">
        <Card className="flex-1">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl mb-1">{group.name}</CardTitle>
                <CardDescription>
                  Created {formatDistanceToNow(new Date(group.createdAt))} ago
                  {group.isPrivate && (
                    <span className="ml-2 bg-secondary text-secondary-foreground px-2 py-0.5 rounded text-xs">
                      Private
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {isCreator ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Group
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the
                          study group and remove all members from it.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteGroupMutation.mutate()}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deleteGroupMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Trash2 className="h-4 w-4 mr-2" />
                          )}
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  isMember && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <LogOut className="h-4 w-4 mr-2" />
                          Leave Group
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Leave study group?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to leave this study group? You can join again later.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => leaveGroupMutation.mutate()}
                          >
                            {leaveGroupMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <LogOut className="h-4 w-4 mr-2" />
                            )}
                            Leave
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">
              {group.description || "No description provided"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="leaderboard" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="leaderboard">
            <Trophy className="h-4 w-4 mr-2" />
            Leaderboard
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-2" />
            Members
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="leaderboard" className="mt-4">
          {leaderboardError ? (
            <div className="bg-destructive/20 p-4 rounded-md">
              <h2 className="text-lg font-semibold text-destructive">Error</h2>
              <p>Failed to load leaderboard data. Please try again later.</p>
            </div>
          ) : leaderboard?.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg bg-muted/40">
              <Timer className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h2 className="text-xl font-semibold mb-2">No Study Data Yet</h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Group members haven't recorded any study sessions yet. 
                When members track their study time, they'll appear on the leaderboard.
              </p>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Group Leaderboard</CardTitle>
                <CardDescription>
                  See which members have spent the most time studying
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableCaption>Total study time for all group members</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Rank</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead className="text-right">Total Study Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard?.map((entry, index) => (
                      <TableRow key={entry.userId} className={entry.userId === user?.id ? "bg-muted/30" : ""}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            {index === 0 && <Medal className="h-5 w-5 mr-1 text-yellow-500" />}
                            {index === 1 && <Medal className="h-5 w-5 mr-1 text-gray-400" />}
                            {index === 2 && <Medal className="h-5 w-5 mr-1 text-amber-600" />}
                            {index > 2 && <span className="w-6 text-center">{index + 1}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8 mr-2">
                              <AvatarFallback>
                                {entry.username.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span>
                              {entry.username}
                              {entry.userId === user?.id && (
                                <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatStudyTime(entry.totalDuration)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="members" className="mt-4">
          {membersError ? (
            <div className="bg-destructive/20 p-4 rounded-md">
              <h2 className="text-lg font-semibold text-destructive">Error</h2>
              <p>Failed to load member data. Please try again later.</p>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Group Members</CardTitle>
                <CardDescription>
                  {members?.length} {members?.length === 1 ? "member" : "members"} in this group
                </CardDescription>
              </CardHeader>
              <CardContent>
                {members?.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground">No members in this group yet.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {members?.map((member) => (
                      <div
                        key={member.userId}
                        className={`flex items-center p-4 rounded-lg border ${
                          member.userId === user?.id ? "bg-muted/30" : ""
                        }`}
                      >
                        <Avatar className="h-10 w-10 mr-4">
                          <AvatarFallback>
                            {member.username.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {member.username}
                            {member.userId === user?.id && (
                              <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Joined {formatDistanceToNow(new Date(member.joinedAt))} ago
                          </div>
                          {member.userId === group.createdBy && (
                            <div className="text-xs mt-1 bg-secondary text-secondary-foreground px-2 py-0.5 rounded inline-block">
                              Group Creator
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}