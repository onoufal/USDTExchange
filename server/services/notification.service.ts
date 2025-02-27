import { storage } from "../storage";
import { Notification } from "@shared/schema";

export interface CreateNotificationData {
  userId: number;
  type: string;
  message: string;
  relatedId: number;
}

export async function createNotification(data: CreateNotificationData): Promise<void> {
  await storage.createNotification(data);
}

export async function getUserNotifications(userId: number): Promise<Notification[]> {
  return storage.getUserNotifications(userId);
}

export async function markNotificationAsRead(notificationId: number): Promise<void> {
  await storage.markNotificationAsRead(notificationId);
}

export async function markAllNotificationsAsRead(userId: number): Promise<void> {
  await storage.markAllNotificationsAsRead(userId);
}
