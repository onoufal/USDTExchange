import { storage } from "../storage";
import { z } from "zod";
import { createNotification } from "./notification.service";

const mobileSchema = z.object({ 
  mobileNumber: z.string().regex(/^07[789]\d{7}$/, {
    message: "Invalid Jordanian mobile number format"
  })
});

export class KYCService {
  static async verifyMobileNumber(userId: number, mobileNumber: string): Promise<void> {
    const { mobileNumber: validatedNumber } = mobileSchema.parse({ mobileNumber });

    // Check if mobile number is already used by another user
    const users = await storage.getAllUsers();
    const existingUser = users.find(u => 
      u.id !== userId && u.mobileNumber === validatedNumber
    );

    if (existingUser) {
      throw new Error("This mobile number is already registered");
    }

    await storage.updateUserMobile(userId, validatedNumber);
  }

  static async uploadKYCDocument(userId: number, document: string, userFullName: string): Promise<void> {
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
  }

  static async approveKYC(userId: number): Promise<void> {
    await storage.approveKYC(userId);
  }

  static async validateDocument(file: Express.Multer.File): void {
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error("File size must be less than 5MB");
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
    const fileExtension = file.originalname.toLowerCase().match(/\.[^.]*$/)?.[0];

    if (!allowedTypes.includes(file.mimetype) || !allowedExtensions.includes(fileExtension)) {
      throw new Error("Invalid file type. Please upload a JPG, PNG, or PDF file");
    }
  }
}
