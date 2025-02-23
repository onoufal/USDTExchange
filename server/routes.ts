import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import multer from "multer";
import { z } from "zod";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // KYC Routes
  app.post("/api/kyc/mobile", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const schema = z.object({ mobileNumber: z.string() });
    const { mobileNumber } = schema.parse(req.body);
    
    // Mock OTP verification - always succeeds
    await storage.updateUserMobile(req.user.id, mobileNumber);
    res.json({ success: true });
  });

  app.post("/api/kyc/document", upload.single("document"), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.file) return res.status(400).send("No document uploaded");

    await storage.updateUserKYC(req.user.id, req.file.buffer.toString("base64"));
    res.json({ success: true });
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
