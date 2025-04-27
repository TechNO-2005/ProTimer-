import { users, tasks, habits, flashcardDecks, flashcards, meetings, studySessions, studyGroups, studyGroupMembers } from "@shared/schema";
import type { User, InsertUser, Task, InsertTask, Habit, InsertHabit, 
  FlashcardDeck, InsertFlashcardDeck, Flashcard, InsertFlashcard, 
  Meeting, InsertMeeting, StudySession, InsertStudySession,
  StudyGroup, InsertStudyGroup, StudyGroupMember, InsertStudyGroupMember } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { eq, and, sql, like, or, desc, asc } from "drizzle-orm";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

// Define SessionStore type
type SessionStore = session.Store;

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Task operations
  getTasks(userId: number): Promise<Task[]>;
  getTasksByDate(userId: number, date: string): Promise<Task[]>;
  getTaskById(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  
  // Habit operations
  getHabits(userId: number): Promise<Habit[]>;
  getHabitById(id: number): Promise<Habit | undefined>;
  createHabit(habit: InsertHabit): Promise<Habit>;
  updateHabit(id: number, habit: Partial<Habit>): Promise<Habit | undefined>;
  deleteHabit(id: number): Promise<boolean>;
  
  // Flashcard operations
  getFlashcardDecks(userId: number): Promise<FlashcardDeck[]>;
  getFlashcardDeckById(id: number): Promise<FlashcardDeck | undefined>;
  createFlashcardDeck(deck: InsertFlashcardDeck): Promise<FlashcardDeck>;
  updateFlashcardDeck(id: number, deck: Partial<FlashcardDeck>): Promise<FlashcardDeck | undefined>;
  deleteFlashcardDeck(id: number): Promise<boolean>;
  
  getFlashcards(deckId: number): Promise<Flashcard[]>;
  getFlashcardById(id: number): Promise<Flashcard | undefined>;
  createFlashcard(card: InsertFlashcard): Promise<Flashcard>;
  updateFlashcard(id: number, card: Partial<Flashcard>): Promise<Flashcard | undefined>;
  deleteFlashcard(id: number): Promise<boolean>;
  
  // Meeting operations
  getMeetings(userId: number): Promise<Meeting[]>;
  getMeetingById(id: number): Promise<Meeting | undefined>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeeting(id: number, meeting: Partial<Meeting>): Promise<Meeting | undefined>;
  deleteMeeting(id: number): Promise<boolean>;
  
  // Study Session operations
  getStudySessions(userId: number): Promise<StudySession[]>;
  getActiveStudySession(userId: number): Promise<StudySession | undefined>;
  getStudySessionById(id: number): Promise<StudySession | undefined>;
  createStudySession(session: InsertStudySession): Promise<StudySession>;
  updateStudySession(id: number, session: Partial<StudySession>): Promise<StudySession | undefined>;
  deleteStudySession(id: number): Promise<boolean>;
  getTotalStudyTimeBySubject(userId: number): Promise<{subject: string, duration: number}[]>;
  
  // Session store
  sessionStore: SessionStore;
}

// Database storage implementation using Drizzle ORM
export class DatabaseStorage implements IStorage {
  sessionStore: SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Task methods
  async getTasks(userId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.userId, userId));
  }

  async getTasksByDate(userId: number, date: string): Promise<Task[]> {
    return await db.select().from(tasks).where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.date, date)
      )
    );
  }

  async getTaskById(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: number, taskUpdate: Partial<Task>): Promise<Task | undefined> {
    const [updatedTask] = await db
      .update(tasks)
      .set(taskUpdate)
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask;
  }

  async deleteTask(id: number): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return true; // In a real database, we'd check the result
  }

  // Habit methods
  async getHabits(userId: number): Promise<Habit[]> {
    return await db.select().from(habits).where(eq(habits.userId, userId));
  }

  async getHabitById(id: number): Promise<Habit | undefined> {
    const [habit] = await db.select().from(habits).where(eq(habits.id, id));
    return habit;
  }

  async createHabit(habit: InsertHabit): Promise<Habit> {
    const [newHabit] = await db.insert(habits).values(habit).returning();
    return newHabit;
  }

  async updateHabit(id: number, habitUpdate: Partial<Habit>): Promise<Habit | undefined> {
    const [updatedHabit] = await db
      .update(habits)
      .set(habitUpdate)
      .where(eq(habits.id, id))
      .returning();
    return updatedHabit;
  }

  async deleteHabit(id: number): Promise<boolean> {
    await db.delete(habits).where(eq(habits.id, id));
    return true;
  }

  // Flashcard deck methods
  async getFlashcardDecks(userId: number): Promise<FlashcardDeck[]> {
    return await db.select().from(flashcardDecks).where(eq(flashcardDecks.userId, userId));
  }

  async getFlashcardDeckById(id: number): Promise<FlashcardDeck | undefined> {
    const [deck] = await db.select().from(flashcardDecks).where(eq(flashcardDecks.id, id));
    return deck;
  }

  async createFlashcardDeck(deck: InsertFlashcardDeck): Promise<FlashcardDeck> {
    const [newDeck] = await db.insert(flashcardDecks).values(deck).returning();
    return newDeck;
  }

  async updateFlashcardDeck(id: number, deckUpdate: Partial<FlashcardDeck>): Promise<FlashcardDeck | undefined> {
    const [updatedDeck] = await db
      .update(flashcardDecks)
      .set(deckUpdate)
      .where(eq(flashcardDecks.id, id))
      .returning();
    return updatedDeck;
  }

  async deleteFlashcardDeck(id: number): Promise<boolean> {
    await db.delete(flashcardDecks).where(eq(flashcardDecks.id, id));
    return true;
  }

  // Flashcard methods
  async getFlashcards(deckId: number): Promise<Flashcard[]> {
    return await db.select().from(flashcards).where(eq(flashcards.deckId, deckId));
  }

  async getFlashcardById(id: number): Promise<Flashcard | undefined> {
    const [card] = await db.select().from(flashcards).where(eq(flashcards.id, id));
    return card;
  }

  async createFlashcard(card: InsertFlashcard): Promise<Flashcard> {
    const [newCard] = await db.insert(flashcards).values(card).returning();
    return newCard;
  }

  async updateFlashcard(id: number, cardUpdate: Partial<Flashcard>): Promise<Flashcard | undefined> {
    const [updatedCard] = await db
      .update(flashcards)
      .set(cardUpdate)
      .where(eq(flashcards.id, id))
      .returning();
    return updatedCard;
  }

  async deleteFlashcard(id: number): Promise<boolean> {
    await db.delete(flashcards).where(eq(flashcards.id, id));
    return true;
  }

  // Meeting methods
  async getMeetings(userId: number): Promise<Meeting[]> {
    return await db.select().from(meetings).where(eq(meetings.userId, userId));
  }

  async getMeetingById(id: number): Promise<Meeting | undefined> {
    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
    return meeting;
  }

  async createMeeting(meeting: InsertMeeting): Promise<Meeting> {
    const [newMeeting] = await db.insert(meetings).values(meeting).returning();
    return newMeeting;
  }

  async updateMeeting(id: number, meetingUpdate: Partial<Meeting>): Promise<Meeting | undefined> {
    const [updatedMeeting] = await db
      .update(meetings)
      .set(meetingUpdate)
      .where(eq(meetings.id, id))
      .returning();
    return updatedMeeting;
  }

  async deleteMeeting(id: number): Promise<boolean> {
    await db.delete(meetings).where(eq(meetings.id, id));
    return true;
  }

  // Study Session methods
  async getStudySessions(userId: number): Promise<StudySession[]> {
    return await db.select().from(studySessions).where(eq(studySessions.userId, userId));
  }

  async getActiveStudySession(userId: number): Promise<StudySession | undefined> {
    const [session] = await db.select().from(studySessions).where(
      and(
        eq(studySessions.userId, userId),
        eq(studySessions.isActive, true)
      )
    );
    return session;
  }

  async getStudySessionById(id: number): Promise<StudySession | undefined> {
    const [session] = await db.select().from(studySessions).where(eq(studySessions.id, id));
    return session;
  }

  async createStudySession(session: InsertStudySession): Promise<StudySession> {
    // First deactivate any active sessions for this user
    await db.update(studySessions)
      .set({ isActive: false })
      .where(
        and(
          eq(studySessions.userId, session.userId),
          eq(studySessions.isActive, true)
        )
      );
    
    const [newSession] = await db.insert(studySessions).values(session).returning();
    return newSession;
  }

  async updateStudySession(id: number, sessionUpdate: Partial<StudySession>): Promise<StudySession | undefined> {
    const [updatedSession] = await db
      .update(studySessions)
      .set(sessionUpdate)
      .where(eq(studySessions.id, id))
      .returning();
    return updatedSession;
  }

  async deleteStudySession(id: number): Promise<boolean> {
    await db.delete(studySessions).where(eq(studySessions.id, id));
    return true;
  }

  async getTotalStudyTimeBySubject(userId: number): Promise<{subject: string, duration: number}[]> {
    // This performs the aggregation by subject
    const result = await db.select({
      subject: studySessions.subject,
      duration: sql`sum(${studySessions.duration})`.mapWith(Number)
    })
    .from(studySessions)
    .where(eq(studySessions.userId, userId))
    .groupBy(studySessions.subject);
    
    return result;
  }
}

// In-memory storage for development/testing if needed
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tasks: Map<number, Task>;
  private habits: Map<number, Habit>;
  private flashcardDecks: Map<number, FlashcardDeck>;
  private flashcards: Map<number, Flashcard>;
  private meetings: Map<number, Meeting>;
  private studySessions: Map<number, StudySession>;
  sessionStore: SessionStore;
  currentId: {
    users: number;
    tasks: number;
    habits: number;
    flashcardDecks: number;
    flashcards: number;
    meetings: number;
    studySessions: number;
  };

  constructor() {
    this.users = new Map();
    this.tasks = new Map();
    this.habits = new Map();
    this.flashcardDecks = new Map();
    this.flashcards = new Map();
    this.meetings = new Map();
    this.studySessions = new Map();
    this.currentId = {
      users: 1,
      tasks: 1,
      habits: 1,
      flashcardDecks: 1,
      flashcards: 1,
      meetings: 1,
      studySessions: 1
    };
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId.users++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Task methods
  async getTasks(userId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.userId === userId,
    );
  }

  async getTasksByDate(userId: number, date: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.userId === userId && task.date === date,
    );
  }

  async getTaskById(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(task: InsertTask): Promise<Task> {
    const id = this.currentId.tasks++;
    const newTask: Task = { ...task, id };
    this.tasks.set(id, newTask);
    return newTask;
  }

  async updateTask(id: number, taskUpdate: Partial<Task>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { ...task, ...taskUpdate };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: number): Promise<boolean> {
    return this.tasks.delete(id);
  }

  // Habit methods
  async getHabits(userId: number): Promise<Habit[]> {
    return Array.from(this.habits.values()).filter(
      (habit) => habit.userId === userId,
    );
  }

  async getHabitById(id: number): Promise<Habit | undefined> {
    return this.habits.get(id);
  }

  async createHabit(habit: InsertHabit): Promise<Habit> {
    const id = this.currentId.habits++;
    const newHabit: Habit = { ...habit, id };
    this.habits.set(id, newHabit);
    return newHabit;
  }

  async updateHabit(id: number, habitUpdate: Partial<Habit>): Promise<Habit | undefined> {
    const habit = this.habits.get(id);
    if (!habit) return undefined;
    
    const updatedHabit = { ...habit, ...habitUpdate };
    this.habits.set(id, updatedHabit);
    return updatedHabit;
  }

  async deleteHabit(id: number): Promise<boolean> {
    return this.habits.delete(id);
  }

  // Flashcard deck methods
  async getFlashcardDecks(userId: number): Promise<FlashcardDeck[]> {
    return Array.from(this.flashcardDecks.values()).filter(
      (deck) => deck.userId === userId,
    );
  }

  async getFlashcardDeckById(id: number): Promise<FlashcardDeck | undefined> {
    return this.flashcardDecks.get(id);
  }

  async createFlashcardDeck(deck: InsertFlashcardDeck): Promise<FlashcardDeck> {
    const id = this.currentId.flashcardDecks++;
    const newDeck: FlashcardDeck = { ...deck, id };
    this.flashcardDecks.set(id, newDeck);
    return newDeck;
  }

  async updateFlashcardDeck(id: number, deckUpdate: Partial<FlashcardDeck>): Promise<FlashcardDeck | undefined> {
    const deck = this.flashcardDecks.get(id);
    if (!deck) return undefined;
    
    const updatedDeck = { ...deck, ...deckUpdate };
    this.flashcardDecks.set(id, updatedDeck);
    return updatedDeck;
  }

  async deleteFlashcardDeck(id: number): Promise<boolean> {
    return this.flashcardDecks.delete(id);
  }

  // Flashcard methods
  async getFlashcards(deckId: number): Promise<Flashcard[]> {
    return Array.from(this.flashcards.values()).filter(
      (card) => card.deckId === deckId,
    );
  }

  async getFlashcardById(id: number): Promise<Flashcard | undefined> {
    return this.flashcards.get(id);
  }

  async createFlashcard(card: InsertFlashcard): Promise<Flashcard> {
    const id = this.currentId.flashcards++;
    const newCard: Flashcard = { ...card, id };
    this.flashcards.set(id, newCard);
    return newCard;
  }

  async updateFlashcard(id: number, cardUpdate: Partial<Flashcard>): Promise<Flashcard | undefined> {
    const card = this.flashcards.get(id);
    if (!card) return undefined;
    
    const updatedCard = { ...card, ...cardUpdate };
    this.flashcards.set(id, updatedCard);
    return updatedCard;
  }

  async deleteFlashcard(id: number): Promise<boolean> {
    return this.flashcards.delete(id);
  }

  // Meeting methods
  async getMeetings(userId: number): Promise<Meeting[]> {
    return Array.from(this.meetings.values()).filter(
      (meeting) => meeting.userId === userId,
    );
  }

  async getMeetingById(id: number): Promise<Meeting | undefined> {
    return this.meetings.get(id);
  }

  async createMeeting(meeting: InsertMeeting): Promise<Meeting> {
    const id = this.currentId.meetings++;
    const newMeeting: Meeting = { ...meeting, id };
    this.meetings.set(id, newMeeting);
    return newMeeting;
  }

  async updateMeeting(id: number, meetingUpdate: Partial<Meeting>): Promise<Meeting | undefined> {
    const meeting = this.meetings.get(id);
    if (!meeting) return undefined;
    
    const updatedMeeting = { ...meeting, ...meetingUpdate };
    this.meetings.set(id, updatedMeeting);
    return updatedMeeting;
  }

  async deleteMeeting(id: number): Promise<boolean> {
    return this.meetings.delete(id);
  }

  // Study Session methods
  async getStudySessions(userId: number): Promise<StudySession[]> {
    return Array.from(this.studySessions.values()).filter(
      (session) => session.userId === userId
    );
  }

  async getActiveStudySession(userId: number): Promise<StudySession | undefined> {
    return Array.from(this.studySessions.values()).find(
      (session) => session.userId === userId && session.isActive
    );
  }

  async getStudySessionById(id: number): Promise<StudySession | undefined> {
    return this.studySessions.get(id);
  }

  async createStudySession(session: InsertStudySession): Promise<StudySession> {
    // First deactivate any active sessions for this user
    const activeSessions = Array.from(this.studySessions.values()).filter(
      (s) => s.userId === session.userId && s.isActive
    );
    
    for (const activeSession of activeSessions) {
      this.studySessions.set(activeSession.id, { ...activeSession, isActive: false });
    }
    
    const id = this.currentId.studySessions++;
    const newSession: StudySession = { ...session, id };
    this.studySessions.set(id, newSession);
    return newSession;
  }

  async updateStudySession(id: number, sessionUpdate: Partial<StudySession>): Promise<StudySession | undefined> {
    const session = this.studySessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...sessionUpdate };
    this.studySessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteStudySession(id: number): Promise<boolean> {
    return this.studySessions.delete(id);
  }

  async getTotalStudyTimeBySubject(userId: number): Promise<{subject: string, duration: number}[]> {
    const sessions = Array.from(this.studySessions.values()).filter(
      (session) => session.userId === userId
    );
    
    // Group sessions by subject and sum durations
    const subjectMap = new Map<string, number>();
    
    for (const session of sessions) {
      const currentDuration = subjectMap.get(session.subject) || 0;
      subjectMap.set(session.subject, currentDuration + (session.duration || 0));
    }
    
    return Array.from(subjectMap.entries()).map(([subject, duration]) => ({
      subject,
      duration
    }));
  }
}

// Use the database storage by default
export const storage = new DatabaseStorage();
