import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import multer from "multer";
import { z } from "zod";
import { updateUserWalletSchema, updateUserCliqSchema } from "@shared/schema";
import { UserService } from "./services/user.service";
import { KYCService } from "./services/kyc.service";
import { TransactionService } from "./services/transaction.service";
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from "./services/notification.service";
import { insertUserSchema } from "@shared/schema"; // Assuming this schema is defined elsewhere


const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Add security headers middleware
  app.use((req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; img-src 'self' data: blob:; object-src 'self' blob:; frame-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; connect-src 'self' ws:; plugin-types application/pdf;"
    );
    next();
  });

  // Setup auth first
  setupAuth(app);

  // Email verification endpoint
  app.get("/api/auth/verify", async (req, res) => {
    const token = req.query.token as string;
    if (!token) {
      return res.status(400).json({ message: "Verification token is required" });
    }

    try {
      await UserService.verifyEmail(token);
      res.json({ success: true });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({ message: error.message || "Failed to verify email" });
    }
  });

  // Registration endpoint
  app.post("/api/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await UserService.createUser(validatedData);
      res.json({ 
        message: "Registration successful. Please check your email to verify your account." 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error('Registration error:', error);
      res.status(500).json({ message: error.message || "Failed to register" });
    }
  });

  app.post("/api/kyc/mobile", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      await KYCService.verifyMobileNumber(req.user.id, req.body.mobileNumber);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error('Mobile verification error:', error);
      res.status(500).json({ message: error.message || "Failed to verify mobile number" });
    }
  });

  app.post("/api/kyc/document", upload.single("document"), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.file) return res.status(400).json({ message: "No document uploaded" });

    try {
      await KYCService.validateDocument(req.file);
      await KYCService.uploadKYCDocument(
        req.user.id,
        req.file.buffer.toString("base64"),
        req.user.fullName
      );
      res.json({ success: true });
    } catch (error) {
      console.error('KYC document upload error:', error);
      res.status(500).json({ message: error.message || "Failed to process document upload" });
    }
  });

  // Admin routes
  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") return res.sendStatus(401);
    const users = await UserService.getAllUsers();
    res.json(users);
  });

  app.get("/api/admin/transactions", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") return res.sendStatus(401);
    const transactions = await TransactionService.getAllTransactions();
    res.json(transactions);
  });

  app.post("/api/admin/approve-kyc/:userId", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") return res.sendStatus(401);
    try {
      await KYCService.approveKYC(parseInt(req.params.userId));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: error.message || "Failed to approve KYC" });
    }
  });

  app.post("/api/admin/approve-transaction/:transactionId", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") return res.sendStatus(401);
    try {
      await TransactionService.approveTransaction(
        parseInt(req.params.transactionId),
        req.user.id
      );
      res.json({ success: true });
    } catch (error) {
      console.error('Transaction approval error:', error);
      res.status(500).json({ message: error.message || "Failed to approve transaction" });
    }
  });

  // User settings routes
  app.post("/api/user/settings/cliq", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const data = updateUserCliqSchema.parse(req.body);
      const updatedUser = await UserService.updateUserCliq(req.user.id, data);

      // Refresh session with updated user data
      await new Promise<void>((resolve, reject) => {
        req.login(updatedUser, (err) => {
          if (err) {
            console.error('Session refresh error:', err);
            reject(err);
            return;
          }
          resolve();
        });
      });

      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error('CliQ details update error:', error);
      res.status(500).json({ message: error.message || "Failed to update CliQ settings" });
    }
  });

  // Trade routes
  app.post("/api/trade", upload.single("proofOfPayment"), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (!req.file) return res.status(400).json({ message: "No payment proof uploaded" });

    try {
      const transaction = await TransactionService.createTransaction(
        req.user.id,
        req.body,
        req.file.buffer.toString("base64"),
        req.user
      );
      res.json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error('Trade submission error:', error);
      res.status(500).json({ message: error.message || "Failed to process trade" });
    }
  });

  // Notification routes
  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const notifications = await getUserNotifications(req.user.id);
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications/:notificationId/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      await markNotificationAsRead(parseInt(req.params.notificationId));
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/mark-all-read", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      await markAllNotificationsAsRead(req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.get("/api/admin/kyc-document/:userId", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") return res.sendStatus(401);

    try {
      const user = await UserService.getUser(parseInt(req.params.userId));
      if (!user || !user.kycDocument) {
        return res.status(404).json({ message: "Document not found" });
      }

      const buffer = Buffer.from(user.kycDocument, 'base64');

      // Check the file signature to determine the actual file type
      const isPdf = buffer.toString('ascii', 0, 5) === '%PDF-';
      const isPng = buffer.toString('hex', 0, 8) === '89504e470d0a1a0a';
      const isJpg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[buffer.length - 2] === 0xFF && buffer[buffer.length - 1] === 0xD9;

      let contentType = 'application/octet-stream';
      let extension = '.bin';

      if (isPdf) {
        contentType = 'application/pdf';
        extension = '.pdf';
      } else if (isPng) {
        contentType = 'image/png';
        extension = '.png';
      } else if (isJpg) {
        contentType = 'image/jpeg';
        extension = '.jpg';
      }

      // Set proper headers for preview and download
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      if (req.query.download) {
        res.setHeader('Content-Disposition', `attachment; filename="kyc-document-${user.username}${extension}"`);
      } else {
        res.setHeader('Content-Disposition', 'inline');
      }

      // Send the raw buffer data
      res.send(buffer);
    } catch (error) {
      console.error('Error fetching KYC document:', error);
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  app.get("/api/transactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const transactions = await TransactionService.getUserTransactions(req.user.id);
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching user transactions:', error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post("/api/settings/wallet", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const data = updateUserWalletSchema.parse(req.body);
      await UserService.updateUserWallet(req.user.id, data.usdtAddress, data.usdtNetwork);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error('Wallet update error:', error);
      res.status(500).json({ message: error.message || "Failed to update wallet settings" });
    }
  });

  // Get platform payment settings (public)
  app.get("/api/settings/payment", async (req, res) => {
    try {
      const settings = await TransactionService.getPaymentSettings();
      res.json(settings);
    } catch (error) {
      console.error('Error fetching payment settings:', error);
      res.status(500).json({ message: "Failed to fetch payment settings" });
    }
  });

  // Update platform payment settings (admin only)
  app.post("/api/admin/settings/payment", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") return res.sendStatus(401);

    try {
      const schema = z.object({
        // Exchange Rate Settings
        buyRate: z.number().min(0, "Buy rate must be positive"),
        buyCommissionPercentage: z.number().min(0, "Buy commission must be positive").max(100, "Buy commission cannot exceed 100%"),
        sellRate: z.number().min(0, "Sell rate must be positive"),
        sellCommissionPercentage: z.number().min(0, "Sell commission must be positive").max(100, "Sell commission cannot exceed 100%"),
        // USDT Addresses
        usdtAddressTRC20: z.string().min(30, "TRC20 address is too short").max(50, "TRC20 address is too long"),
        usdtAddressBEP20: z.string().min(30, "BEP20 address is too short").max(50, "BEP20 address is too long"),
        // CliQ Settings
        cliqAlias: z.string().min(1, "CliQ alias is required"),
        cliqBankName: z.string().min(1, "Bank name is required"),
        cliqAccountHolder: z.string().min(1, "Account holder name is required"),
        // Mobile Wallet Settings
        mobileWallet: z.string().regex(/^07[789]\d{7}$/, {
          message: "Invalid Jordanian mobile number format"
        }),
        walletType: z.string().min(1, "Wallet type is required"),
        walletHolderName: z.string().min(1, "Wallet holder name is required")
      });

      const settings = schema.parse(req.body);
      console.log('Saving payment settings:', settings); // Debug log
      await TransactionService.updatePaymentSettings(settings);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error('Payment settings update error:', error);
      res.status(500).json({ message: "Failed to update payment settings" });
    }
  });

  // Add this test route temporarily before the error handling middleware
  app.get("/api/test-error", (req, res) => {
    throw new Error("Test error to verify error handling");
  });

  // Global error handling middleware
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    // Log the error details for debugging (but don't expose to client)
    console.error('Unhandled error:', {
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      userId: req.user?.id
    });

    // Send standardized error response
    res.status(500).json({ 
      error: "An unexpected error occurred." 
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}