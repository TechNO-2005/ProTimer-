import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Loader2, UserPlus, Users, Search, PlusCircle, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Define types for Study Group data
interface StudyGroup {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date | string;
  createdBy: number;
  isPrivate: boolean | null;
}

// Create schema for study group form
const createGroupSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  isPrivate: z.boolean().default(false),
});

type CreateGroupFormValues = z.infer<typeof createGroupSchema>;

export default function StudyGroups() {
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);

  // Query to get user's study groups
  const {
    data: studyGroups,
    isLoading,
    error,
  } = useQuery<StudyGroup[]>({
    queryKey: ["/api/study-groups"],
    enabled: !!user,
  });

  // Query for search results
  const {
    data: searchResults,
    isLoading: isSearching,
    refetch: search,
  } = useQuery<StudyGroup[]>({
    queryKey: ["/api/study-groups/search", searchQuery],
    enabled: false,
  });

  // Mutation to create a new study group
  const createGroupMutation = useMutation({
    mutationFn: async (data: CreateGroupFormValues) => {
      const res = await fetch("/api/study-groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error("Failed to create study group");
      }
      return await res.json();
    },
    onSuccess: () => {
      setShowCreateDialog(false);
      toast({
        title: "Success",
        description: "Study group created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/study-groups"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create study group: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to join a study group
  const joinGroupMutation = useMutation({
    mutationFn: async (groupId: number) => {
      const res = await fetch(`/api/study-groups/${groupId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        throw new Error("Failed to join study group");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Joined study group successfully",
      });
      setShowSearchDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/study-groups"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to join study group: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Setup form for creating a study group
  const form = useForm<CreateGroupFormValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: "",
      description: "",
      isPrivate: false,
    },
  });

  // Handle search submit
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search term",
        variant: "destructive",
      });
      return;
    }

    try {
      await search();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to search for study groups",
        variant: "destructive",
      });
    }
  };

  // Navigate to the group details page
  const navigateToGroup = (groupId: number) => {
    navigate(`/study-groups/${groupId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="bg-destructive/20 p-4 rounded-md">
          <h2 className="text-lg font-semibold text-destructive">Error</h2>
          <p>Failed to load study groups. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Study Groups</h1>
        <div className="flex gap-2">
          <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Search className="h-4 w-4 mr-2" />
                Find Groups
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Find Study Groups</DialogTitle>
                <DialogDescription>
                  Search for public study groups to join and collaborate with other students.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center space-x-2 mb-4">
                <Input
                  placeholder="Search by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleSearch}
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Search
                </Button>
              </div>
              
              {searchResults && searchResults.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No study groups found matching your search.
                </p>
              )}
              
              {searchResults && searchResults.length > 0 && (
                <div className="max-h-[400px] overflow-y-auto">
                  {searchResults.map((group) => (
                    <Card key={group.id} className="mb-3">
                      <CardHeader className="py-3">
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                        <CardDescription>
                          Created by: {group.createdBy === user?.id ? "You" : "Another user"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="py-2">
                        <p className="text-sm">
                          {group.description || "No description provided"}
                        </p>
                      </CardContent>
                      <CardFooter className="py-2 flex justify-end">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => joinGroupMutation.mutate(group.id)}
                          disabled={joinGroupMutation.isPending}
                        >
                          {joinGroupMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <UserPlus className="h-4 w-4 mr-2" />
                          )}
                          Join Group
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </DialogContent>
          </Dialog>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="default">
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Create Study Group</DialogTitle>
                <DialogDescription>
                  Create a new study group to collaborate with other students.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((data) => createGroupMutation.mutate(data))}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Biology Study Group" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the purpose and focus of your study group..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isPrivate"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Private Group</FormLabel>
                          <FormDescription>
                            Private groups don't appear in search results and require an invitation to join.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={createGroupMutation.isPending}
                    >
                      {createGroupMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <PlusCircle className="h-4 w-4 mr-2" />
                      )}
                      Create Group
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {studyGroups && studyGroups.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg bg-muted/40">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h2 className="text-xl font-semibold mb-2">No Study Groups Yet</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            You haven't created or joined any study groups yet. Create a new group
            or search for existing ones to start collaborating.
          </p>
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              onClick={() => setShowSearchDialog(true)}
            >
              <Search className="h-4 w-4 mr-2" />
              Find Groups
            </Button>
            <Button
              variant="default"
              onClick={() => setShowCreateDialog(true)}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {studyGroups?.map((group) => (
            <Card 
              key={group.id}
              className="h-full cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigateToGroup(group.id)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{group.name}</CardTitle>
                  {group.isPrivate && (
                    <div className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded text-xs">
                      Private
                    </div>
                  )}
                </div>
                <CardDescription>
                  Created {new Date(group.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-2">
                  {group.description || "No description provided"}
                </p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                >
                  <Users className="h-4 w-4" />
                  <span className="text-xs">Members</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                >
                  <Trophy className="h-4 w-4" />
                  <span className="text-xs">Leaderboard</span>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}