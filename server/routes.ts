import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, isAuthenticated } from "./auth"; // Import isAuthenticated from auth.ts
import { storage } from "./storage";
import multer from "multer";
import { z } from "zod";
import { updateUserWalletSchema } from "@shared/schema";
import { updateUserCliqSchema } from "@shared/schema";
import { randomBytes } from "crypto";
import { sendVerificationEmail } from "./services/email";
import { insertUserSchema } from "@shared/schema";
import { hashPassword } from "./services/password";

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
      const users = await storage.getAllUsers();
      const user = users.find(u => u.verificationToken === token);

      if (!user) {
        return res.status(400).json({ message: "Invalid verification token" });
      }

      if (user.isVerified) {
        return res.status(400).json({ message: "Email is already verified" });
      }

      await storage.verifyEmail(user.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({ message: "Failed to verify email" });
    }
  });

  // Registration endpoint (updated)
  app.post("/api/register", async (req, res) => {
    try {
      console.log('Registration request received:', req.body);

      const validatedData = insertUserSchema.parse(req.body);
      console.log('Validation passed, data:', validatedData);

      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        console.log('Email already registered:', validatedData.email);
        return res.status(400).json({ message: "Email already registered" });
      }

      const token = randomBytes(20).toString('hex');

      const user = await storage.createUser({
        ...validatedData,
        verificationToken: token,
        password: await hashPassword(validatedData.password)
      });
      console.log('User created successfully:', { id: user.id, email: user.email });

      // Create notification for admin
      const admins = await storage.getAdminUsers();
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          type: "new_user",
          message: `New user registration: ${user.fullName} (${user.email})`,
          relatedId: user.id
        });
      }

      const success = await sendVerificationEmail({
        to: validatedData.email,
        verificationToken: token
      });

      if (!success) {
        console.log('Failed to send verification email to:', validatedData.email);
        return res.status(200).json({
          message: "Account created but verification email could not be sent. Please contact support."
        });
      }

      console.log('Registration completed successfully for:', validatedData.email);
      res.json({
        message: "Registration successful. Please check your email to verify your account."
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log('Validation error:', error.errors);
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error('Registration error:', error);
      res.status(500).json({ message: "Failed to register" });
    }
  });


  app.post("/api/kyc/mobile", isAuthenticated, async (req, res) => {
    try {
      const schema = z.object({
        mobileNumber: z.string().regex(/^07[789]\d{7}$/, {
          message: "Invalid Jordanian mobile number format"
        })
      });

      const { mobileNumber } = schema.parse(req.body);

      // Check if mobile number is already used by another user
      const users = await storage.getAllUsers();
      const existingUser = users.find(u =>
        u.id !== req.user.id && u.mobileNumber === mobileNumber
      );

      if (existingUser) {
        return res.status(400).json({
          message: "This mobile number is already registered"
        });
      }

      await storage.updateUserMobile(req.user.id, mobileNumber);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: error.errors[0].message
        });
      }
      console.error('Mobile verification error:', error);
      res.status(500).json({
        message: "Failed to verify mobile number"
      });
    }
  });

  app.post("/api/kyc/document", upload.single("document"), isAuthenticated, async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No document uploaded" });

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (req.file.size > maxSize) {
      return res.status(400).json({ message: "File size must be less than 5MB" });
    }

    // Validate file type using both mimetype and original filename extension
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];

    const fileExtension = req.file.originalname.toLowerCase().match(/\.[^.]*$/)?.[0];

    if (!allowedTypes.includes(req.file.mimetype) || !allowedExtensions.includes(fileExtension)) {
      return res.status(400).json({
        message: "Invalid file type. Please upload a JPG, PNG, or PDF file"
      });
    }

    try {
      await storage.updateUserKYC(req.user.id, req.file.buffer.toString("base64"));

      // Create notification for admin
      const admins = await storage.getAdminUsers();
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          type: "kyc_submitted",
          message: `User ${req.user.fullName} has submitted KYC documents for verification`,
          relatedId: req.user.id
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('KYC document upload error:', error);
      res.status(500).json({ message: "Failed to process document upload" });
    }
  });

  app.get("/api/admin/users", isAuthenticated, async (req, res) => {
    if (req.user.role !== "admin") return res.sendStatus(401);
    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.get("/api/admin/transactions", isAuthenticated, async (req, res) => {
    if (req.user.role !== "admin") return res.sendStatus(401);
    const transactions = await storage.getAllTransactions();
    res.json(transactions);
  });

  app.post("/api/admin/approve-kyc/:userId", isAuthenticated, async (req, res) => {
    if (req.user.role !== "admin") return res.sendStatus(401);
    await storage.approveKYC(parseInt(req.params.userId));
    res.json({ success: true });
  });

  app.post("/api/admin/approve-transaction/:transactionId", isAuthenticated, async (req, res) => {
    if (req.user.role !== "admin") return res.sendStatus(401);

    try {
      const transaction = await storage.approveTransaction(parseInt(req.params.transactionId));

      // Create notification for user
      await storage.createNotification({
        userId: transaction.userId,
        type: "order_approved",
        message: `Your ${transaction.type} order for ${transaction.amount} USDT has been approved`,
        relatedId: transaction.id
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Transaction approval error:', error);
      res.status(500).json({ message: "Failed to approve transaction" });
    }
  });

  app.get("/api/admin/kyc-document/:userId", isAuthenticated, async (req, res) => {
    if (req.user.role !== "admin") return res.sendStatus(401);

    try {
      const user = await storage.getUser(parseInt(req.params.userId));
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

  app.get("/api/transactions", isAuthenticated, async (req, res) => {
    try {
      const transactions = await storage.getUserTransactions(req.user.id);
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching user transactions:', error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post("/api/trade", upload.single("proofOfPayment"), isAuthenticated, async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No payment proof uploaded" });

    try {
      // Debug logging for request body
      console.log('Trade request body:', {
        type: req.body.type,
        amount: req.body.amount,
        network: req.body.network,
        paymentMethod: req.body.paymentMethod,
        rate: req.body.rate
      });

      const schema = z.object({
        type: z.enum(["buy", "sell"]),
        amount: z.string()
          .min(1, "Amount is required")
          .regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid number with up to 2 decimal places")
          .transform(Number),
        rate: z.string()
          .regex(/^\d+(\.\d{1,2})?$/, "Rate must be a valid number with up to 2 decimal places")
          .transform(Number),
        network: z.enum(["trc20", "bep20"]).optional(),
        paymentMethod: z.enum(["cliq", "wallet"]).optional(),
      }).refine((data) => {
        if (data.type === "sell" && !data.network) {
          return false;
        }
        return true;
      }, {
        message: "Network is required for sell orders",
        path: ["network"]
      });

      const data = schema.parse(req.body);

      // Debug logging for parsed data
      console.log('Parsed trade data:', {
        ...data,
        network: data.network
      });

      const transactionData = {
        userId: req.user.id,
        type: data.type,
        amount: data.amount.toString(),
        rate: data.rate,
        status: "pending",
        proofOfPayment: req.file.buffer.toString("base64"),
        createdAt: new Date(),
        network: data.type === "sell" ? data.network : null,
        paymentMethod: data.type === "buy" ? data.paymentMethod : null,
      };

      // Debug logging for transaction data before storage
      console.log('Transaction data before storage:', {
        ...transactionData,
        network: transactionData.network
      });

      const transaction = await storage.createTransaction(transactionData);

      // Create notification for admin
      const admins = await storage.getAdminUsers();
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          type: "order_submitted",
          message: `New ${data.type} order submitted by ${req.user.fullName} for ${data.amount} USDT`,
          relatedId: transaction.id
        });
      }

      // Debug logging for created transaction
      console.log('Created transaction:', {
        ...transaction,
        network: transaction.network
      });

      res.json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error('Trade submission error:', error);
      res.status(500).json({ message: "Failed to process trade" });
    }
  });

  app.get("/api/admin/payment-proof/:transactionId", isAuthenticated, async (req, res) => {
    if (req.user.role !== "admin") return res.sendStatus(401);

    try {
      const transaction = await storage.getTransaction(parseInt(req.params.transactionId));
      if (!transaction || !transaction.proofOfPayment) {
        return res.status(404).json({ message: "Document not found" });
      }

      const buffer = Buffer.from(transaction.proofOfPayment, 'base64');

      // Check the file signature to determine the actual file type
      const isPng = buffer.toString('hex', 0, 8) === '89504e470d0a1a0a';
      const isJpg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[buffer.length - 2] === 0xFF && buffer[buffer.length - 1] === 0xD9;

      let contentType = 'application/octet-stream';
      let extension = '.bin';

      if (isPng) {
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
        res.setHeader('Content-Disposition', `attachment; filename="payment-proof-${transaction.id}${extension}"`);
      } else {
        res.setHeader('Content-Disposition', 'inline');
      }

      // Send the raw buffer data
      res.send(buffer);
    } catch (error) {
      console.error('Error fetching payment proof:', error);
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  // User wallet settings
  app.post("/api/settings/wallet", isAuthenticated, async (req, res) => {
    try {
      const data = updateUserWalletSchema.parse(req.body);
      await storage.updateUserWallet(req.user.id, data.usdtAddress, data.usdtNetwork);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error('Wallet update error:', error);
      res.status(500).json({ message: "Failed to update wallet settings" });
    }
  });

  // Update the CliQ settings route to use proper auth and error handling
  app.post("/api/user/settings/cliq", isAuthenticated, async (req, res) => {
    try {
      const data = updateUserCliqSchema.parse(req.body);
      await storage.updateUserCliq(req.user.id, data);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error('CliQ details update error:', error);
      res.status(500).json({ message: "Failed to update CliQ settings" });
    }
  });


  // Get platform payment settings (public)
  app.get("/api/settings/payment", async (req, res) => {
    try {
      const settings = await storage.getPaymentSettings();
      res.json(settings);
    } catch (error) {
      console.error('Error fetching payment settings:', error);
      res.status(500).json({ message: "Failed to fetch payment settings" });
    }
  });

  // Update platform payment settings (admin only)
  app.post("/api/admin/settings/payment", isAuthenticated, async (req, res) => {
    if (req.user.role !== "admin") return res.sendStatus(401);

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
      await storage.updatePaymentSettings(settings);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error('Payment settings update error:', error);
      res.status(500).json({ message: "Failed to update payment settings" });
    }
  });

  // Add the following routes to handle notifications
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const userNotifications = await storage.getUserNotifications(req.user.id);
      res.json(userNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications/:notificationId/read", isAuthenticated, async (req, res) => {
    try {
      await storage.markNotificationAsRead(parseInt(req.params.notificationId));
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/mark-all-read", isAuthenticated, async (req, res) => {
    try {
      await storage.markAllNotificationsAsRead(req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}