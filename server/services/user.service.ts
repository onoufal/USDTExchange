import { storage } from "../storage";
import { createNotification } from "./notification.service";
import { User, InsertUser } from "@shared/schema";
import { hashPassword } from "../services/password";
import { randomBytes } from "crypto";
import { sendVerificationEmail } from "./email";

export class UserService {
  static async createUser(userData: InsertUser): Promise<User> {
    const existingUser = await storage.getUserByEmail(userData.email);
    if (existingUser) {
      throw new Error("Email already registered");
    }

    const token = randomBytes(20).toString('hex');
    const hashedPassword = await hashPassword(userData.password);

    const user = await storage.createUser({
      ...userData,
      verificationToken: token,
      password: hashedPassword
    });

    // Create notification for admin
    const admins = await storage.getAdminUsers();
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        type: "new_user",
        message: `New user registration: ${user.fullName} (${user.email})`,
        relatedId: user.id
      });
    }

    // Send verification email
    const emailSuccess = await sendVerificationEmail({
      to: userData.email,
      verificationToken: token
    });

    if (!emailSuccess) {
      console.log('Failed to send verification email to:', userData.email);
      throw new Error("Account created but verification email could not be sent");
    }

    return user;
  }

  static async verifyEmail(token: string): Promise<void> {
    const users = await storage.getAllUsers();
    const user = users.find(u => u.verificationToken === token);

    if (!user) {
      throw new Error("Invalid verification token");
    }

    if (user.isVerified) {
      throw new Error("Email is already verified");
    }

    await storage.verifyEmail(user.id);
  }

  static async updateUserCliq(userId: number, cliqDetails: {
    bankName: string,
    cliqType: string,
    cliqAlias?: string | null,
    cliqNumber?: string | null,
    accountHolderName: string
  }): Promise<User> {
    // Log the update request
    console.log('Updating CliQ details:', {
      userId,
      newDetails: cliqDetails
    });

    await storage.updateUserCliq(userId, cliqDetails);
    
    const updatedUser = await storage.getUser(userId);
    if (!updatedUser) {
      throw new Error("Failed to fetch updated user data");
    }

    // Log the updated user data
    console.log('Updated user data:', {
      userId: updatedUser.id,
      cliqType: updatedUser.cliqType,
      cliqAlias: updatedUser.cliqAlias,
      cliqNumber: updatedUser.cliqNumber
    });

    return updatedUser;
  }

  static async updateUserWallet(userId: number, usdtAddress: string, usdtNetwork: string): Promise<void> {
    await storage.updateUserWallet(userId, usdtAddress, usdtNetwork);
  }

  static async getUser(id: number): Promise<User | undefined> {
    return storage.getUser(id);
  }

  static async getAllUsers(): Promise<User[]> {
    return storage.getAllUsers();
  }

  static async getAdminUsers(): Promise<User[]> {
    return storage.getAdminUsers();
  }
}
