import { storage } from "../storage";
import { Notification } from "@shared/schema";
import { broadcastNotification } from "../utils/notifier";
import { logger } from "../utils/logger";

export interface CreateNotificationData {
  userId: number;
  type: string;
  message: string;
  relatedId: number;
}

/**
 * Creates a new notification and broadcasts it in real-time
 * @param data The notification data to create
 */
export async function createNotification(data: CreateNotificationData): Promise<void> {
  try {
    await storage.createNotification(data);

    // Broadcast the notification in real-time
    broadcastNotification({
      type: data.type as any,
      message: data.message,
      data: {
        userId: data.userId,
        relatedId: data.relatedId
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to create notification');
    throw error;
  }
}

/**
 * Retrieves notifications for a specific user
 * @param userId The user's ID
 * @returns Promise resolving to an array of notifications
 */
export async function getUserNotifications(userId: number): Promise<Notification[]> {
  try {
    return await storage.getUserNotifications(userId);
  } catch (error) {
    logger.error({ err: error, userId }, 'Failed to fetch user notifications');
    throw error;
  }
}

/**
 * Marks a notification as read
 * @param notificationId The ID of the notification to mark as read
 */
export async function markNotificationAsRead(notificationId: number): Promise<void> {
  try {
    await storage.markNotificationAsRead(notificationId);
  } catch (error) {
    logger.error({ err: error, notificationId }, 'Failed to mark notification as read');
    throw error;
  }
}

/**
 * Marks all notifications as read for a specific user
 * @param userId The user's ID
 */
export async function markAllNotificationsAsRead(userId: number): Promise<void> {
  try {
    await storage.markAllNotificationsAsRead(userId);
  } catch (error) {
    logger.error({ err: error, userId }, 'Failed to mark all notifications as read');
    throw error;
  }
}