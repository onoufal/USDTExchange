import type { Express } from "express";
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
import { insertUserSchema } from "@shared/schema";
import cookie from "cookie";
import { WebSocketServer, WebSocket } from "ws";
import { logger } from "./utils/logger";
import { initializeNotifier } from "./utils/notifier";
import { storage } from "./storage";

// WebSocket client set with authentication info
interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  isAlive: boolean;
}

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  app.use((req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; img-src 'self' data: blob:; object-src 'self' blob:; frame-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; connect-src 'self' ws:; plugin-types application/pdf;"
    );
    next();
  });

  setupAuth(app);

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

  app.post("/api/user/settings/cliq", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const data = updateUserCliqSchema.parse(req.body);
      const updatedUser = await UserService.updateUserCliq(req.user.id, data);

      logger.debug('User CliQ settings updated', {
        userId: req.user.id,
        hasCliqNumber: !!updatedUser.cliqNumber
      });

      // Refresh session with updated user data
      await new Promise<void>((resolve, reject) => {
        req.login(updatedUser, (err) => {
          if (err) {
            logger.error('Session refresh error:', err);
            reject(err);
            return;
          }
          logger.debug('Session refreshed with updated user data', {
            userId: updatedUser.id,
            hasCliqNumber: !!updatedUser.cliqNumber
          });
          resolve();
        });
      });

      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      logger.error('CliQ details update error:', error);
      res.status(500).json({ message: error.message || "Failed to update CliQ settings" });
    }
  });

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

  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const notifications = await getUserNotifications(req.user.id);
      res.json({
        success: true,
        message: "Notifications retrieved successfully",
        data: {
          notifications,
          count: notifications.length
        }
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch notifications",
        error: error.message
      });
    }
  });

  app.post("/api/notifications/:notificationId/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      await markNotificationAsRead(parseInt(req.params.notificationId));
      res.json({
        success: true,
        message: "Notification marked as read",
        data: { notificationId: parseInt(req.params.notificationId) }
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        message: "Failed to mark notification as read",
        error: error.message
      });
    }
  });

  app.post("/api/notifications/mark-all-read", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      await markAllNotificationsAsRead(req.user.id);
      res.json({
        success: true,
        message: "All notifications marked as read"
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({
        success: false,
        message: "Failed to mark all notifications as read",
        error: error.message
      });
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

  app.get("/api/settings/payment", async (req, res) => {
    try {
      const settings = await TransactionService.getPaymentSettings();
      res.json(settings);
    } catch (error) {
      console.error('Error fetching payment settings:', error);
      res.status(500).json({ message: "Failed to fetch payment settings" });
    }
  });

  app.post("/api/admin/settings/payment", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") return res.sendStatus(401);

    try {
      const schema = z.object({
        buyRate: z.number().min(0, "Buy rate must be positive"),
        buyCommissionPercentage: z.number().min(0, "Buy commission must be positive").max(100, "Buy commission cannot exceed 100%"),
        sellRate: z.number().min(0, "Sell rate must be positive"),
        sellCommissionPercentage: z.number().min(0, "Sell commission must be positive").max(100, "Sell commission cannot exceed 100%"),
        usdtAddressTRC20: z.string().min(30, "TRC20 address is too short").max(50, "TRC20 address is too long"),
        usdtAddressBEP20: z.string().min(30, "BEP20 address is too short").max(50, "BEP20 address is too long"),
        cliqAlias: z.string().min(1, "CliQ alias is required"),
        cliqBankName: z.string().min(1, "Bank name is required"),
        cliqAccountHolder: z.string().min(1, "Account holder name is required"),
        mobileWallet: z.string().regex(/^07[789]\d{7}$/, {
          message: "Invalid Jordanian mobile number format"
        }),
        walletType: z.string().min(1, "Wallet type is required"),
        walletHolderName: z.string().min(1, "Wallet holder name is required")
      });

      const settings = schema.parse(req.body);
      console.log('Saving payment settings:', settings);
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

  const httpServer = createServer(app);

  // Initialize WebSocket server with proper path
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/ws'
  });

  // Ping interval to keep connections alive
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws: AuthenticatedWebSocket) => {
      if (!ws.isAlive) {
        logger.warn('Terminating inactive WebSocket connection');
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(pingInterval);
  });

  // Handle new WebSocket connections
  wss.on('connection', async (ws: AuthenticatedWebSocket, req) => {
    try {
      ws.isAlive = true;

      // Enhanced connection logging
      logger.debug('WebSocket connection attempt', {
        headers: req.headers,
        cookies: req.headers.cookie,
        origin: req.headers.origin,
        path: req.url,
        remoteAddress: req.socket.remoteAddress
      });

      // Parse cookies from request headers
      const cookieHeader = req.headers.cookie;
      if (!cookieHeader) {
        logger.warn('WebSocket connection attempt without cookies', {
          headers: req.headers,
          remoteAddress: req.socket.remoteAddress
        });
        ws.send(JSON.stringify({
          type: 'error',
          error: 'authentication_required',
          message: 'No session cookie found'
        }));
        ws.close(1008, 'No session cookie found');
        return;
      }

      const cookies = cookie.parse(cookieHeader);
      const sessionId = cookies['sessionId'];

      if (!sessionId) {
        logger.warn('WebSocket connection attempt without session ID', {
          cookies,
          remoteAddress: req.socket.remoteAddress
        });
        ws.send(JSON.stringify({
          type: 'error',
          error: 'authentication_required',
          message: 'No session ID found'
        }));
        ws.close(1008, 'No session ID found');
        return;
      }

      // Enhanced session retrieval logging and handling
      const session = await new Promise((resolve) => {
        storage.sessionStore.get(sessionId, (err, session) => {
          if (err) {
            logger.error({ err }, 'Error retrieving session', {
              sessionId,
              remoteAddress: req.socket.remoteAddress
            });
            resolve(null);
            return;
          }
          logger.debug('Session retrieved', {
            sessionId,
            hasSession: !!session,
            hasPassport: !!session?.passport,
            userId: session?.passport?.user
          });
          resolve(session);
        });
      });

      if (!session?.passport?.user) {
        logger.warn('WebSocket connection attempt with invalid session', {
          sessionId,
          hasSession: !!session,
          remoteAddress: req.socket.remoteAddress
        });
        ws.send(JSON.stringify({
          type: 'error',
          error: 'authentication_required',
          message: 'Invalid or expired session'
        }));
        ws.close(1008, 'Authentication required');
        return;
      }

      // Store user ID and authenticate WebSocket
      ws.userId = session.passport.user;
      logger.info('Authenticated WebSocket connection established', {
        userId: ws.userId,
        sessionId,
        remoteAddress: req.socket.remoteAddress
      });

      // Handle pong responses
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle client messages
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          logger.debug('Received WebSocket message', { userId: ws.userId, message });

          switch (message.type) {
            case 'ping':
              ws.send(JSON.stringify({ type: 'pong' }));
              break;
            default:
              logger.warn('Unknown message type received', { type: message.type });
              ws.send(JSON.stringify({
                type: 'error',
                error: 'invalid_message',
                message: 'Unknown message type'
              }));
          }
        } catch (error) {
          logger.error({ err: error }, 'Error processing WebSocket message');
        }
      });

      // Handle connection close
      ws.on('close', () => {
        logger.info('WebSocket client disconnected', { userId: ws.userId });
      });

    } catch (error) {
      logger.error({ err: error }, 'Error during WebSocket connection setup');
      ws.close(1011, 'Internal server error during connection setup');
    }
  });

  initializeNotifier(wss.clients);

  return httpServer;
}