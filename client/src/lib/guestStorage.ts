import { Task } from "@shared/schema";
import { v4 as uuidv4 } from 'uuid';

// Get tasks from local storage
export function getGuestTasks(): Task[] {
  const tasks = localStorage.getItem('guestTasks');
  if (!tasks) return [];
  
  try {
    return JSON.parse(tasks) as Task[];
  } catch (error) {
    console.error('Error parsing tasks from localStorage:', error);
    return [];
  }
}

// Save a task to local storage (for guest mode)
export function saveGuestTask(task: Omit<Task, "id" | "userId">): Task {
  const tasks = getGuestTasks();
  
  const newTask: Task = {
    ...task,
    id: tasks.length + 1,
    userId: 0, // Guest user ID
  };
  
  tasks.push(newTask);
  localStorage.setItem('guestTasks', JSON.stringify(tasks));
  
  return newTask;
}

// Update a task in local storage
export function updateGuestTask(id: number, updates: Partial<Task>): Task | undefined {
  const tasks = getGuestTasks();
  const taskIndex = tasks.findIndex(t => t.id === id);
  
  if (taskIndex === -1) return undefined;
  
  const updatedTask = { ...tasks[taskIndex], ...updates };
  tasks[taskIndex] = updatedTask;
  
  localStorage.setItem('guestTasks', JSON.stringify(tasks));
  return updatedTask;
}

// Delete a task from local storage
export function deleteGuestTask(id: number): boolean {
  const tasks = getGuestTasks();
  const filteredTasks = tasks.filter(t => t.id !== id);
  
  if (filteredTasks.length === tasks.length) return false;
  
  localStorage.setItem('guestTasks', JSON.stringify(filteredTasks));
  return true;
}

// Get tasks for a specific date
export function getGuestTasksByDate(date: string): Task[] {
  const tasks = getGuestTasks();
  return tasks.filter(task => task.date === date);
}

// Clear all guest tasks
export function clearGuestTasks(): void {
  localStorage.removeItem('guestTasks');
}
