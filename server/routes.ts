import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import multer from "multer";
import { z } from "zod";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup auth first, which includes session and passport middleware
  setupAuth(app);

  // KYC Routes
  app.post("/api/kyc/mobile", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

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

  app.post("/api/kyc/document", upload.single("document"), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.file) return res.status(400).json({ message: "No document uploaded" });

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (req.file.size > maxSize) {
      return res.status(400).json({ message: "File size must be less than 5MB" });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ 
        message: "Invalid file type. Please upload a JPG, PNG, or PDF file" 
      });
    }

    try {
      await storage.updateUserKYC(req.user.id, req.file.buffer.toString("base64"));
      res.json({ success: true });
    } catch (error) {
      console.error('KYC document upload error:', error);
      res.status(500).json({ message: "Failed to process document upload" });
    }
  });

  // Trading Routes
  app.post("/api/trade", upload.single("proofOfPayment"), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.user.mobileVerified) return res.status(403).send("Mobile verification required");
    if (req.user.kycStatus !== "approved") return res.status(403).send("KYC approval required");

    const transaction = await storage.createTransaction({
      userId: req.user.id,
      ...req.body,
      proofOfPayment: req.file?.buffer.toString("base64")
    });

    res.json(transaction);
  });

  app.get("/api/transactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const transactions = await storage.getUserTransactions(req.user.id);
    res.json(transactions);
  });

  // Admin Routes
  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") return res.sendStatus(401);
    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.get("/api/admin/transactions", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") return res.sendStatus(401);
    const transactions = await storage.getAllTransactions();
    res.json(transactions);
  });

  app.post("/api/admin/approve-kyc/:userId", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") return res.sendStatus(401);
    await storage.approveKYC(parseInt(req.params.userId));
    res.json({ success: true });
  });

  app.post("/api/admin/approve-transaction/:transactionId", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") return res.sendStatus(401);
    await storage.approveTransaction(parseInt(req.params.transactionId));
    res.json({ success: true });
  });

  const httpServer = createServer(app);
  return httpServer;
}