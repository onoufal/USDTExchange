import { users, transactions, type User, type InsertUser, type Transaction, platformSettings } from "@shared/schema";
import type { SessionData, Store } from "express-session";
import createMemoryStore from "memorystore";
import session from "express-session";
import { eq } from "drizzle-orm";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  sessionStore: Store;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserMobile(id: number, mobile: string): Promise<void>;
  updateUserKYC(id: number, document: string): Promise<void>;
  approveKYC(id: number): Promise<void>;
  getAllUsers(): Promise<User[]>;
  createTransaction(transaction: Transaction): Promise<Transaction>;
  getUserTransactions(userId: number): Promise<Transaction[]>;
  getAllTransactions(): Promise<Transaction[]>;
  approveTransaction(id: number): Promise<void>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  updateUserWallet(id: number, usdtAddress: string, usdtNetwork: string): Promise<void>;
  updateUserCliq(id: number, cliqDetails: {
    bankName: string,
    cliqType: string,
    cliqAlias?: string,
    cliqNumber?: string,
    accountHolderName: string
  }): Promise<void>;
  getPaymentSettings(): Promise<{ [key: string]: string }>;
  updatePaymentSettings(settings: { [key: string]: string }): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private transactions: Map<number, Transaction>;
  private settings: Map<string, string>;
  sessionStore: Store;
  private currentUserId: number;
  private currentTransactionId: number;

  constructor() {
    this.users = new Map();
    this.transactions = new Map();
    this.settings = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24h
    });
    this.currentUserId = 1;
    this.currentTransactionId = 1;

    // Create a default admin user
    this.createUser({
      username: "admin",
      password: "admin123", // In real app, this would be hashed
      fullName: "Admin User"
    }).then(user => {
      const updatedUser = {
        ...user,
        role: "admin"
      };
      this.users.set(user.id, updatedUser);
    });

    // Set default payment settings
    this.settings.set("cliqAlias", "");
    this.settings.set("cliqBankName", "Arab Bank");
    this.settings.set("cliqAccountHolder", "");
    this.settings.set("cliqNumber", "");
    this.settings.set("cliqBankNameForNumber", "Arab Bank");
    this.settings.set("cliqNumberAccountHolder", "");
    this.settings.set("mobileWallet", "");
    this.settings.set("walletType", "Orange Money");
    this.settings.set("walletHolderName", "");
    this.settings.set("usdtAddressTRC20", "");
    this.settings.set("usdtAddressBEP20", "");
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
      id,
      ...insertUser,
      mobileNumber: null,
      mobileVerified: false,
      kycStatus: "pending",
      kycDocument: null,
      loyaltyPoints: 0,
      role: "user",
      createdAt: new Date(),
      usdtAddress: null,
      usdtNetwork: null,
      cliqType: null,
      cliqAlias: null,
      cliqNumber: null,
      accountHolderName: insertUser.fullName,
      bankName: null,
      bankBranch: null,
      bankAccountNumber: null,
      bankIban: null
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserMobile(id: number, mobile: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      const updatedUser = {
        ...user,
        mobileNumber: mobile,
        mobileVerified: true
      };
      this.users.set(id, updatedUser);
    }
  }

  async updateUserKYC(id: number, document: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      const updatedUser = {
        ...user,
        kycDocument: document,
        kycStatus: "pending"
      };
      this.users.set(id, updatedUser);
    }
  }

  async updateUserWallet(id: number, usdtAddress: string, usdtNetwork: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      const updatedUser = {
        ...user,
        usdtAddress,
        usdtNetwork
      };
      this.users.set(id, updatedUser);
    }
  }

  async updateUserCliq(id: number, cliqDetails: {
    bankName: string,
    cliqType: string,
    cliqAlias?: string,
    cliqNumber?: string,
    accountHolderName: string
  }): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      const updatedUser = {
        ...user,
        bankName: cliqDetails.bankName,
        cliqType: cliqDetails.cliqType,
        cliqAlias: cliqDetails.cliqAlias || null,
        cliqNumber: cliqDetails.cliqNumber || null,
        accountHolderName: cliqDetails.accountHolderName
      };
      this.users.set(id, updatedUser);
    }
  }

  async getPaymentSettings(): Promise<{ [key: string]: string }> {
    return Object.fromEntries(this.settings.entries());
  }

  async updatePaymentSettings(settings: { [key: string]: string }): Promise<void> {
    Object.entries(settings).forEach(([key, value]) => {
      this.settings.set(key, value);
    });
  }

  async approveKYC(id: number): Promise<void> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error("User not found");
    }

    const updatedUser = {
      ...user,
      kycStatus: "approved"
    };

    this.users.set(id, updatedUser);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createTransaction(data: Transaction): Promise<Transaction> {
    const id = this.currentTransactionId++;
    const transaction: Transaction = {
      id,
      userId: data.userId,
      type: data.type,
      amount: data.amount,
      rate: data.rate,
      status: "pending",
      proofOfPayment: data.proofOfPayment || null,
      createdAt: new Date(),
      commission: data.commission || '0',
      fee: data.fee || '0'
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

  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async approveTransaction(id: number): Promise<void> {
    const transaction = this.transactions.get(id);
    if (transaction) {
      const updatedTransaction = {
        ...transaction,
        status: "approved"
      };
      this.transactions.set(id, updatedTransaction);

      // Update loyalty points
      const user = this.users.get(transaction.userId);
      if (user) {
        const updatedUser = {
          ...user,
          loyaltyPoints: (user.loyaltyPoints || 0) + Math.floor(Number(transaction.amount) / 100)
        };
        this.users.set(user.id, updatedUser);
      }
    }
  }
}

export const storage = new MemStorage();