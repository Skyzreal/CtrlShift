import {
  addTask,
  getPendingTasks,
  getTasks,
  getTaskByIndex,
  markTaskDone,
  removeTask,
  linkTaskToJira,
} from '../../state/repositories/tasks';
import { Task } from '../../types';

export function opAdd(userId: string, title: string, jiraKey?: string): Task {
  return addTask(userId, title, jiraKey);
}

export function opList(userId: string): Task[] {
  return getPendingTasks(userId);
}

export function opAll(userId: string): Task[] {
  return getTasks(userId);
}

export interface DoneResult {
  success: boolean;
  task: Task | null;
  message: string;
}

export function opDone(userId: string, index: number): DoneResult {
  const task = getTaskByIndex(userId, index);
  if (!task) {
    return { success: false, task: null, message: `No task #${index} found.` };
  }
  markTaskDone(task.id);
  return { success: true, task, message: `Marked done: "${task.title}"` };
}

export function opRemove(userId: string, index: number): DoneResult {
  const task = getTaskByIndex(userId, index);
  if (!task) {
    return { success: false, task: null, message: `No task #${index} found.` };
  }
  removeTask(task.id);
  return { success: true, task, message: `Removed: "${task.title}"` };
}

export function opLink(userId: string, index: number, jiraKey: string): DoneResult {
  const task = getTaskByIndex(userId, index);
  if (!task) {
    return { success: false, task: null, message: `No task #${index} found.` };
  }
  linkTaskToJira(task.id, jiraKey);
  return { success: true, task, message: `Linked task #${index} to ${jiraKey}` };
}
