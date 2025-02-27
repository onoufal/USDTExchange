import { storage } from "../storage";
import { z } from "zod";
import { createNotification } from "./notification.service";
import { APIError } from "../middleware/error-handler";
import { logger } from "../utils/logger";

const mobileSchema = z.object({ 
  mobileNumber: z.string().regex(/^07[789]\d{7}$/, {
    message: "Invalid Jordanian mobile number format"
  })
});

export class KYCService {
  static async verifyMobileNumber(userId: number, mobileNumber: string): Promise<void> {
    try {
      const { mobileNumber: validatedNumber } = mobileSchema.parse({ mobileNumber });

      // Check if mobile number is already used by another user
      const users = await storage.getAllUsers();
      const existingUser = users.find(u => 
        u.id !== userId && u.mobileNumber === validatedNumber
      );

      if (existingUser) {
        throw new APIError(400, "This mobile number is already registered", "DUPLICATE_MOBILE");
      }

      await storage.updateUserMobile(userId, validatedNumber);
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      if (error instanceof z.ZodError) {
        throw new APIError(400, "Invalid mobile number format", "VALIDATION_ERROR", error.errors);
      }
      logger.error({ err: error, userId }, 'Failed to verify mobile number');
      throw new APIError(500, "Failed to verify mobile number", "MOBILE_VERIFY_ERROR");
    }
  }

  static async uploadKYCDocument(userId: number, document: string, userFullName: string): Promise<void> {
    try {
      await storage.updateUserKYC(userId, document);

      // Create notification for admin
      const admins = await storage.getAdminUsers();
      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          type: "kyc_submitted",
          message: `User ${userFullName} has submitted KYC documents for verification`,
          relatedId: userId
        });
      }
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to upload KYC document');
      throw new APIError(500, "Failed to upload KYC document", "KYC_UPLOAD_ERROR");
    }
  }

  static async approveKYC(userId: number): Promise<void> {
    try {
      await storage.approveKYC(userId);
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to approve KYC');
      throw new APIError(500, "Failed to approve KYC", "KYC_APPROVE_ERROR");
    }
  }

  static async validateDocument(file: Express.Multer.File): void {
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new APIError(400, "File size must be less than 5MB", "FILE_TOO_LARGE");
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
    const fileExtension = file.originalname.toLowerCase().match(/\.[^.]*$/)?.[0];

    if (!allowedTypes.includes(file.mimetype) || !allowedExtensions.includes(fileExtension)) {
      throw new APIError(400, "Invalid file type. Please upload a JPG, PNG, or PDF file", "INVALID_FILE_TYPE");
    }
  }
}