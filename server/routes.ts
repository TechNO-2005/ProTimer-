import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertTaskSchema, insertHabitSchema, insertFlashcardDeckSchema, insertFlashcardSchema, insertMeetingSchema, insertStudySessionSchema, insertStudyGroupSchema, insertStudyGroupMemberSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // API routes with /api prefix
  
  // Tasks API
  app.get("/api/tasks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = req.user!.id;
    
    const tasks = await storage.getTasks(userId);
    res.json(tasks);
  });
  
  app.get("/api/tasks/date/:date", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = req.user!.id;
    const { date } = req.params;
    
    const tasks = await storage.getTasksByDate(userId, date);
    res.json(tasks);
  });
  
  app.get("/api/tasks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;
    
    const task = await storage.getTaskById(Number(id));
    if (!task) return res.status(404).json({ message: "Task not found" });
    
    if (task.userId !== req.user!.id) {
      return res.status(403).json({ message: "Not authorized to access this task" });
    }
    
    res.json(task);
  });
  
  app.post("/api/tasks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const taskData = insertTaskSchema.parse({ ...req.body, userId: req.user!.id });
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      res.status(400).json({ message: "Invalid task data", error });
    }
  });
  
  app.put("/api/tasks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;
    
    const task = await storage.getTaskById(Number(id));
    if (!task) return res.status(404).json({ message: "Task not found" });
    
    if (task.userId !== req.user!.id) {
      return res.status(403).json({ message: "Not authorized to update this task" });
    }
    
    const updatedTask = await storage.updateTask(Number(id), req.body);
    res.json(updatedTask);
  });
  
  app.delete("/api/tasks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;
    
    const task = await storage.getTaskById(Number(id));
    if (!task) return res.status(404).json({ message: "Task not found" });
    
    if (task.userId !== req.user!.id) {
      return res.status(403).json({ message: "Not authorized to delete this task" });
    }
    
    const success = await storage.deleteTask(Number(id));
    if (success) {
      res.sendStatus(204);
    } else {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });
  
  // Habits API
  app.get("/api/habits", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = req.user!.id;
    
    const habits = await storage.getHabits(userId);
    res.json(habits);
  });
  
  app.get("/api/habits/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;
    
    const habit = await storage.getHabitById(Number(id));
    if (!habit) return res.status(404).json({ message: "Habit not found" });
    
    if (habit.userId !== req.user!.id) {
      return res.status(403).json({ message: "Not authorized to access this habit" });
    }
    
    res.json(habit);
  });
  
  app.post("/api/habits", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const habitData = insertHabitSchema.parse({ ...req.body, userId: req.user!.id });
      const habit = await storage.createHabit(habitData);
      res.status(201).json(habit);
    } catch (error) {
      res.status(400).json({ message: "Invalid habit data", error });
    }
  });
  
  app.put("/api/habits/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;
    
    const habit = await storage.getHabitById(Number(id));
    if (!habit) return res.status(404).json({ message: "Habit not found" });
    
    if (habit.userId !== req.user!.id) {
      return res.status(403).json({ message: "Not authorized to update this habit" });
    }
    
    const updatedHabit = await storage.updateHabit(Number(id), req.body);
    res.json(updatedHabit);
  });
  
  app.delete("/api/habits/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;
    
    const habit = await storage.getHabitById(Number(id));
    if (!habit) return res.status(404).json({ message: "Habit not found" });
    
    if (habit.userId !== req.user!.id) {
      return res.status(403).json({ message: "Not authorized to delete this habit" });
    }
    
    const success = await storage.deleteHabit(Number(id));
    if (success) {
      res.sendStatus(204);
    } else {
      res.status(500).json({ message: "Failed to delete habit" });
    }
  });
  
  // Flashcard Decks API
  app.get("/api/flashcard-decks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = req.user!.id;
    
    const decks = await storage.getFlashcardDecks(userId);
    res.json(decks);
  });
  
  app.get("/api/flashcard-decks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;
    
    const deck = await storage.getFlashcardDeckById(Number(id));
    if (!deck) return res.status(404).json({ message: "Flashcard deck not found" });
    
    if (deck.userId !== req.user!.id) {
      return res.status(403).json({ message: "Not authorized to access this deck" });
    }
    
    res.json(deck);
  });
  
  app.post("/api/flashcard-decks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const deckData = insertFlashcardDeckSchema.parse({ ...req.body, userId: req.user!.id });
      const deck = await storage.createFlashcardDeck(deckData);
      res.status(201).json(deck);
    } catch (error) {
      res.status(400).json({ message: "Invalid flashcard deck data", error });
    }
  });
  
  app.put("/api/flashcard-decks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;
    
    const deck = await storage.getFlashcardDeckById(Number(id));
    if (!deck) return res.status(404).json({ message: "Flashcard deck not found" });
    
    if (deck.userId !== req.user!.id) {
      return res.status(403).json({ message: "Not authorized to update this deck" });
    }
    
    const updatedDeck = await storage.updateFlashcardDeck(Number(id), req.body);
    res.json(updatedDeck);
  });
  
  app.delete("/api/flashcard-decks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;
    
    const deck = await storage.getFlashcardDeckById(Number(id));
    if (!deck) return res.status(404).json({ message: "Flashcard deck not found" });
    
    if (deck.userId !== req.user!.id) {
      return res.status(403).json({ message: "Not authorized to delete this deck" });
    }
    
    const success = await storage.deleteFlashcardDeck(Number(id));
    if (success) {
      res.sendStatus(204);
    } else {
      res.status(500).json({ message: "Failed to delete flashcard deck" });
    }
  });
  
  // Flashcards API
  app.get("/api/flashcard-decks/:deckId/flashcards", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { deckId } = req.params;
    
    const deck = await storage.getFlashcardDeckById(Number(deckId));
    if (!deck) return res.status(404).json({ message: "Flashcard deck not found" });
    
    if (deck.userId !== req.user!.id) {
      return res.status(403).json({ message: "Not authorized to access flashcards in this deck" });
    }
    
    const flashcards = await storage.getFlashcards(Number(deckId));
    res.json(flashcards);
  });
  
  app.post("/api/flashcard-decks/:deckId/flashcards", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { deckId } = req.params;
    
    const deck = await storage.getFlashcardDeckById(Number(deckId));
    if (!deck) return res.status(404).json({ message: "Flashcard deck not found" });
    
    if (deck.userId !== req.user!.id) {
      return res.status(403).json({ message: "Not authorized to add flashcards to this deck" });
    }
    
    try {
      const flashcardData = insertFlashcardSchema.parse({ ...req.body, deckId: Number(deckId) });
      const flashcard = await storage.createFlashcard(flashcardData);
      res.status(201).json(flashcard);
    } catch (error) {
      res.status(400).json({ message: "Invalid flashcard data", error });
    }
  });
  
  app.put("/api/flashcards/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;
    
    const card = await storage.getFlashcardById(Number(id));
    if (!card) return res.status(404).json({ message: "Flashcard not found" });
    
    const deck = await storage.getFlashcardDeckById(card.deckId);
    if (!deck) return res.status(404).json({ message: "Flashcard deck not found" });
    
    if (deck.userId !== req.user!.id) {
      return res.status(403).json({ message: "Not authorized to update this flashcard" });
    }
    
    const updatedCard = await storage.updateFlashcard(Number(id), req.body);
    res.json(updatedCard);
  });
  
  app.delete("/api/flashcards/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;
    
    const card = await storage.getFlashcardById(Number(id));
    if (!card) return res.status(404).json({ message: "Flashcard not found" });
    
    const deck = await storage.getFlashcardDeckById(card.deckId);
    if (!deck) return res.status(404).json({ message: "Flashcard deck not found" });
    
    if (deck.userId !== req.user!.id) {
      return res.status(403).json({ message: "Not authorized to delete this flashcard" });
    }
    
    const success = await storage.deleteFlashcard(Number(id));
    if (success) {
      res.sendStatus(204);
    } else {
      res.status(500).json({ message: "Failed to delete flashcard" });
    }
  });
  
  // Meetings API
  app.get("/api/meetings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = req.user!.id;
    
    const meetings = await storage.getMeetings(userId);
    res.json(meetings);
  });
  
  app.get("/api/meetings/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;
    
    const meeting = await storage.getMeetingById(Number(id));
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });
    
    if (meeting.userId !== req.user!.id) {
      return res.status(403).json({ message: "Not authorized to access this meeting" });
    }
    
    res.json(meeting);
  });
  
  app.post("/api/meetings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const meetingData = insertMeetingSchema.parse({ ...req.body, userId: req.user!.id });
      const meeting = await storage.createMeeting(meetingData);
      res.status(201).json(meeting);
    } catch (error) {
      res.status(400).json({ message: "Invalid meeting data", error });
    }
  });
  
  app.put("/api/meetings/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;
    
    const meeting = await storage.getMeetingById(Number(id));
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });
    
    if (meeting.userId !== req.user!.id) {
      return res.status(403).json({ message: "Not authorized to update this meeting" });
    }
    
    const updatedMeeting = await storage.updateMeeting(Number(id), req.body);
    res.json(updatedMeeting);
  });
  
  app.delete("/api/meetings/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;
    
    const meeting = await storage.getMeetingById(Number(id));
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });
    
    if (meeting.userId !== req.user!.id) {
      return res.status(403).json({ message: "Not authorized to delete this meeting" });
    }
    
    const success = await storage.deleteMeeting(Number(id));
    if (success) {
      res.sendStatus(204);
    } else {
      res.status(500).json({ message: "Failed to delete meeting" });
    }
  });

  // Study Sessions API
  app.get("/api/study-sessions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = req.user!.id;
    
    const sessions = await storage.getStudySessions(userId);
    res.json(sessions);
  });
  
  app.get("/api/study-sessions/active", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = req.user!.id;
    
    const session = await storage.getActiveStudySession(userId);
    if (!session) {
      return res.status(404).json({ message: "No active study session found" });
    }
    
    res.json(session);
  });
  
  app.get("/api/study-sessions/stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = req.user!.id;
    
    const stats = await storage.getTotalStudyTimeBySubject(userId);
    res.json(stats);
  });
  
  app.get("/api/study-sessions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;
    
    const session = await storage.getStudySessionById(Number(id));
    if (!session) return res.status(404).json({ message: "Study session not found" });
    
    if (session.userId !== req.user!.id) {
      return res.status(403).json({ message: "Not authorized to access this study session" });
    }
    
    res.json(session);
  });
  
  app.post("/api/study-sessions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Add userId and startTime to the request body
      const sessionData = insertStudySessionSchema.parse({ 
        ...req.body, 
        userId: req.user!.id,
        startTime: new Date() 
      });
      
      const session = await storage.createStudySession(sessionData);
      res.status(201).json(session);
    } catch (error) {
      res.status(400).json({ message: "Invalid study session data", error });
    }
  });
  
  app.put("/api/study-sessions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;
    
    const session = await storage.getStudySessionById(Number(id));
    if (!session) return res.status(404).json({ message: "Study session not found" });
    
    if (session.userId !== req.user!.id) {
      return res.status(403).json({ message: "Not authorized to update this study session" });
    }
    
    const updatedSession = await storage.updateStudySession(Number(id), req.body);
    res.json(updatedSession);
  });
  
  app.post("/api/study-sessions/:id/stop", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;
    
    const session = await storage.getStudySessionById(Number(id));
    if (!session) return res.status(404).json({ message: "Study session not found" });
    
    if (session.userId !== req.user!.id) {
      return res.status(403).json({ message: "Not authorized to update this study session" });
    }
    
    // Calculate study duration in seconds
    const endTime = new Date();
    const startTime = new Date(session.startTime);
    const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    
    const updatedSession = await storage.updateStudySession(Number(id), {
      endTime,
      duration: durationSeconds,
      isActive: false
    });
    
    res.json(updatedSession);
  });
  
  app.delete("/api/study-sessions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;
    
    const session = await storage.getStudySessionById(Number(id));
    if (!session) return res.status(404).json({ message: "Study session not found" });
    
    if (session.userId !== req.user!.id) {
      return res.status(403).json({ message: "Not authorized to delete this study session" });
    }
    
    const success = await storage.deleteStudySession(Number(id));
    if (success) {
      res.sendStatus(204);
    } else {
      res.status(500).json({ message: "Failed to delete study session" });
    }
  });

  // Study Groups API
  app.get("/api/study-groups", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = req.user!.id;
    
    const myGroups = await storage.getStudyGroups(userId); // Groups created by the user
    const joinedGroups = await storage.getStudyGroupsForUser(userId); // Groups the user is a member of
    
    // Combine and remove duplicates
    const allGroups = [...myGroups];
    for (const group of joinedGroups) {
      if (!allGroups.some(g => g.id === group.id)) {
        allGroups.push(group);
      }
    }
    
    res.json(allGroups);
  });
  
  app.get("/api/study-groups/search", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { q } = req.query as { q?: string };
    
    if (!q) {
      return res.status(400).json({ message: "Search query is required" });
    }
    
    const groups = await storage.searchStudyGroups(q);
    res.json(groups);
  });
  
  app.get("/api/study-groups/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;
    
    const group = await storage.getStudyGroupById(Number(id));
    if (!group) return res.status(404).json({ message: "Study group not found" });
    
    res.json(group);
  });
  
  app.post("/api/study-groups", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const groupData = insertStudyGroupSchema.parse({ 
        ...req.body, 
        createdBy: req.user!.id 
      });
      
      const group = await storage.createStudyGroup(groupData);
      
      // Automatically add creator as an admin member of the group
      await storage.addUserToStudyGroup({
        userId: req.user!.id,
        groupId: group.id,
        status: 'admin'
      });
      
      res.status(201).json(group);
    } catch (error) {
      res.status(400).json({ message: "Invalid study group data", error });
    }
  });
  
  app.put("/api/study-groups/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;
    
    const group = await storage.getStudyGroupById(Number(id));
    if (!group) return res.status(404).json({ message: "Study group not found" });
    
    if (group.createdBy !== req.user!.id) {
      return res.status(403).json({ message: "Not authorized to update this study group" });
    }
    
    const updatedGroup = await storage.updateStudyGroup(Number(id), req.body);
    res.json(updatedGroup);
  });
  
  app.delete("/api/study-groups/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;
    
    const group = await storage.getStudyGroupById(Number(id));
    if (!group) return res.status(404).json({ message: "Study group not found" });
    
    if (group.createdBy !== req.user!.id) {
      return res.status(403).json({ message: "Not authorized to delete this study group" });
    }
    
    const success = await storage.deleteStudyGroup(Number(id));
    if (success) {
      res.sendStatus(204);
    } else {
      res.status(500).json({ message: "Failed to delete study group" });
    }
  });
  
  // Study Group Membership API
  app.get("/api/study-groups/:id/members", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;
    
    const group = await storage.getStudyGroupById(Number(id));
    if (!group) return res.status(404).json({ message: "Study group not found" });
    
    const members = await storage.getStudyGroupMembers(Number(id));
    res.json(members);
  });
  
  app.post("/api/study-groups/:id/join", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;
    const userId = req.user!.id;
    
    const group = await storage.getStudyGroupById(Number(id));
    if (!group) return res.status(404).json({ message: "Study group not found" });
    
    try {
      const memberData = insertStudyGroupMemberSchema.parse({
        groupId: Number(id),
        userId,
        status: "active"
      });
      
      const membership = await storage.addUserToStudyGroup(memberData);
      res.status(201).json(membership);
    } catch (error) {
      res.status(400).json({ message: "Failed to join study group", error });
    }
  });
  
  app.post("/api/study-groups/:id/leave", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;
    const userId = req.user!.id;
    
    const group = await storage.getStudyGroupById(Number(id));
    if (!group) return res.status(404).json({ message: "Study group not found" });
    
    // Don't allow the creator to leave their own group
    if (group.createdBy === userId) {
      return res.status(400).json({ 
        message: "As the creator, you cannot leave your own group. You may delete it instead." 
      });
    }
    
    const success = await storage.removeUserFromStudyGroup(Number(id), userId);
    if (success) {
      res.sendStatus(204);
    } else {
      res.status(400).json({ message: "Failed to leave study group" });
    }
  });
  
  app.get("/api/study-groups/:id/leaderboard", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;
    
    const group = await storage.getStudyGroupById(Number(id));
    if (!group) return res.status(404).json({ message: "Study group not found" });
    
    const leaderboard = await storage.getStudyGroupLeaderboard(Number(id));
    res.json(leaderboard);
  });
  
  // Get active study sessions for a group
  app.get("/api/study-groups/:id/active-sessions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;
    
    const group = await storage.getStudyGroupById(Number(id));
    if (!group) return res.status(404).json({ message: "Study group not found" });
    
    // Get active study sessions for the group
    const activeSessions = await storage.getActiveStudySessionsByGroupId(Number(id));
    res.json(activeSessions);
  });

  const httpServer = createServer(app);

  return httpServer;
}
