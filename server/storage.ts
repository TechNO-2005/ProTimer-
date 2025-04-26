import { users, tasks, habits, flashcardDecks, flashcards, meetings } from "@shared/schema";
import type { User, InsertUser, Task, InsertTask, Habit, InsertHabit, 
  FlashcardDeck, InsertFlashcardDeck, Flashcard, InsertFlashcard, 
  Meeting, InsertMeeting } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tasks: Map<number, Task>;
  private habits: Map<number, Habit>;
  private flashcardDecks: Map<number, FlashcardDeck>;
  private flashcards: Map<number, Flashcard>;
  private meetings: Map<number, Meeting>;
  sessionStore: session.SessionStore;
  currentId: {
    users: number;
    tasks: number;
    habits: number;
    flashcardDecks: number;
    flashcards: number;
    meetings: number;
  };

  constructor() {
    this.users = new Map();
    this.tasks = new Map();
    this.habits = new Map();
    this.flashcardDecks = new Map();
    this.flashcards = new Map();
    this.meetings = new Map();
    this.currentId = {
      users: 1,
      tasks: 1,
      habits: 1,
      flashcardDecks: 1,
      flashcards: 1,
      meetings: 1,
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
}

export const storage = new MemStorage();
