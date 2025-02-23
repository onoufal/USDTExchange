import { users, transactions, type User, type InsertUser, type Transaction } from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";
import { eq } from "drizzle-orm";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  sessionStore: session.SessionStore;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserMobile(id: number, mobile: string): Promise<void>;
  updateUserKYC(id: number, document: string): Promise<void>;
  approveKYC(id: number): Promise<void>;
  getAllUsers(): Promise<User[]>;
  createTransaction(transaction: any): Promise<Transaction>;
  getUserTransactions(userId: number): Promise<Transaction[]>;
  getAllTransactions(): Promise<Transaction[]>;
  approveTransaction(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private transactions: Map<number, Transaction>;
  sessionStore: session.SessionStore;
  private currentUserId: number;
  private currentTransactionId: number;

  constructor() {
    this.users = new Map();
    this.transactions = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24h
    });
    this.currentUserId = 1;
    this.currentTransactionId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      ...insertUser,
      id,
      mobileNumber: null,
      mobileVerified: false,
      kycStatus: "pending",
      kycDocument: null,
      loyaltyPoints: 0,
      role: "user",
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserMobile(id: number, mobile: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.mobileNumber = mobile;
      user.mobileVerified = true;
      this.users.set(id, user);
    }
  }

  async updateUserKYC(id: number, document: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.kycDocument = document;
      user.kycStatus = "pending";
      this.users.set(id, user);
    }
  }

  async approveKYC(id: number): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.kycStatus = "approved";
      this.users.set(id, user);
    }
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createTransaction(data: any): Promise<Transaction> {
    const id = this.currentTransactionId++;
    const transaction: Transaction = {
      id,
      userId: data.userId,
      type: data.type,
      amount: data.amount,
      rate: data.rate,
      status: "pending",
      proofOfPayment: data.proofOfPayment || null,
      createdAt: new Date()
    };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async getUserTransactions(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      (t) => t.userId === userId
    );
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values());
  }

  async approveTransaction(id: number): Promise<void> {
    const transaction = this.transactions.get(id);
    if (transaction) {
      transaction.status = "approved";
      this.transactions.set(id, transaction);

      // Update loyalty points
      const user = this.users.get(transaction.userId);
      if (user) {
        user.loyaltyPoints += Math.floor(Number(transaction.amount) / 100);
        this.users.set(user.id, user);
      }
    }
  }
}

export const storage = new MemStorage();
