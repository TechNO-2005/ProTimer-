import { Habit } from "@shared/schema";

// Get habits from local storage
export function getGuestHabits(): Habit[] {
  const habits = localStorage.getItem('guestHabits');
  if (!habits) return [];
  
  try {
    return JSON.parse(habits) as Habit[];
  } catch (error) {
    console.error('Error parsing habits from localStorage:', error);
    return [];
  }
}

// Save a habit to local storage (for guest mode)
export function saveGuestHabit(habit: Omit<Habit, "id" | "userId">): Habit {
  const habits = getGuestHabits();
  
  const newHabit: Habit = {
    ...habit,
    id: habits.length + 1,
    userId: 0, // Guest user ID
  };
  
  habits.push(newHabit);
  localStorage.setItem('guestHabits', JSON.stringify(habits));
  
  return newHabit;
}

// Update a habit in local storage
export function updateGuestHabit(id: number, updates: Partial<Habit>): Habit | undefined {
  const habits = getGuestHabits();
  const habitIndex = habits.findIndex(h => h.id === id);
  
  if (habitIndex === -1) return undefined;
  
  const updatedHabit = { ...habits[habitIndex], ...updates };
  habits[habitIndex] = updatedHabit;
  
  localStorage.setItem('guestHabits', JSON.stringify(habits));
  return updatedHabit;
}

// Delete a habit from local storage
export function deleteGuestHabit(id: number): boolean {
  const habits = getGuestHabits();
  const filteredHabits = habits.filter(h => h.id !== id);
  
  if (filteredHabits.length === habits.length) return false;
  
  localStorage.setItem('guestHabits', JSON.stringify(filteredHabits));
  return true;
}

// Track a habit completion for today
export function trackGuestHabitCompletion(id: number): Habit | undefined {
  const habits = getGuestHabits();
  const habitIndex = habits.findIndex(h => h.id === id);
  
  if (habitIndex === -1) return undefined;
  
  const habit = habits[habitIndex];
  const today = new Date().toISOString().split('T')[0];
  
  // Parse completed days, add today if not already completed
  let completedDays: string[] = [];
  try {
    completedDays = JSON.parse(habit.completedDays);
  } catch (error) {
    completedDays = [];
  }
  
  if (!completedDays.includes(today)) {
    completedDays.push(today);
    
    // Calculate streak - check if yesterday was completed
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];
    
    let newStreak = habit.streak || 0;
    
    if (completedDays.includes(yesterdayString) || newStreak === 0) {
      newStreak++;
    }
    
    const updatedHabit: Habit = {
      ...habit,
      completedDays: JSON.stringify(completedDays),
      streak: newStreak
    };
    
    habits[habitIndex] = updatedHabit;
    localStorage.setItem('guestHabits', JSON.stringify(habits));
    
    return updatedHabit;
  }
  
  return habit;
}

// Clear all guest habits
export function clearGuestHabits(): void {
  localStorage.removeItem('guestHabits');
}
