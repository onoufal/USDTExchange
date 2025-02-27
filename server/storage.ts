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
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  verifyEmail(id: number): Promise<void>;
  updateUserMobile(id: number, mobile: string): Promise<void>;
  updateUserKYC(id: number, document: string): Promise<void>;
  approveKYC(id: number): Promise<void>;
  getAllUsers(): Promise<User[]>;
  createTransaction(transaction: Transaction): Promise<Transaction>;
  getUserTransactions(userId: number): Promise<Transaction[]>;
  getAllTransactions(): Promise<Transaction[]>;
  approveTransaction(id: number): Promise<Transaction>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  updateUserWallet(id: number, usdtAddress: string, usdtNetwork: string): Promise<void>;
  updateUserCliq(id: number, cliqDetails: {
    bankName: string,
    cliqType: string,
    cliqAlias?: string | null,
    cliqNumber?: string | null,
    accountHolderName: string
  }): Promise<void>;
  getPaymentSettings(): Promise<{ [key: string]: string }>;
  updatePaymentSettings(settings: { [key: string]: string }): Promise<void>;
  getAdminUsers(): Promise<User[]>;
  createNotification(notification: InsertNotification): Promise<void>;
  getUserNotifications(userId: number): Promise<Notification[]>;
  markNotificationAsRead(notificationId: number): Promise<void>;
  markAllNotificationsAsRead(userId: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private transactions: Map<number, Transaction>;
  private settings: Map<string, string>;
  private notifications: Map<number, Notification>;
  sessionStore: Store;
  private currentUserId: number;
  private currentTransactionId: number;
  private currentNotificationId: number;

  constructor() {
    this.users = new Map();
    this.transactions = new Map();
    this.settings = new Map();
    this.notifications = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24h
    });
    this.currentUserId = 1;
    this.currentTransactionId = 1;
    this.currentNotificationId = 1;

    // Create a default admin user
    this.createUser({
      email: "admin@exchangepro.com",
      username: "admin",
      password: "Admin@123", // Secure password meeting all requirements
      fullName: "Admin User"
    }).then(user => {
      const updatedUser = {
        ...user,
        isVerified: true,
        role: "admin"
      };
      this.users.set(user.id, updatedUser);
    });

    // Default payment settings
    this.settings.set("buyRate", "0.71");
    this.settings.set("buyCommissionPercentage", "1.00");
    this.settings.set("sellRate", "0.71");
    this.settings.set("sellCommissionPercentage", "1.00");
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      id,
      ...insertUser,
      verificationToken: null,
      isVerified: false,
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

  async verifyEmail(id: number): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      const updatedUser = {
        ...user,
        isVerified: true,
        verificationToken: null
      };
      this.users.set(id, updatedUser);
    }
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
    cliqAlias?: string | null,
    cliqNumber?: string | null,
    accountHolderName: string
  }): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      // Log the update request
      console.log('Updating CliQ details:', {
        userId: id,
        currentDetails: {
          cliqType: user.cliqType,
          cliqAlias: user.cliqAlias,
          cliqNumber: user.cliqNumber
        },
        newDetails: cliqDetails
      });

      const updatedUser = {
        ...user,
        bankName: cliqDetails.bankName,
        cliqType: cliqDetails.cliqType,
        cliqAlias: cliqDetails.cliqType === 'alias' ? cliqDetails.cliqAlias : null,
        cliqNumber: cliqDetails.cliqType === 'number' ? cliqDetails.cliqNumber : null,
        accountHolderName: cliqDetails.accountHolderName
      };

      // Log the updated user data
      console.log('Updated user data:', {
        userId: id,
        cliqType: updatedUser.cliqType,
        cliqAlias: updatedUser.cliqAlias,
        cliqNumber: updatedUser.cliqNumber
      });

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

    // Log the incoming transaction data
    console.log('Transaction data received:', {
      type: data.type,
      amount: data.amount,
      rate: data.rate,
      status: 'pending',
      createdAt: new Date(),
      commission: data.commission || '0',
      fee: data.fee || '0',
      network: data.type === 'sell' ? data.network : null,
      paymentMethod: data.type === 'buy' ? data.paymentMethod : null,
      // For sell orders, get CliQ info from the authenticated user
      cliqType: data.cliqType,
      cliqAlias: data.cliqAlias,
      cliqNumber: data.cliqNumber
    });

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
      fee: data.fee || '0',
      network: data.type === 'sell' ? data.network : null,
      paymentMethod: data.type === 'buy' ? data.paymentMethod : null,
      // Ensure CliQ fields are properly set
      cliqType: data.cliqType,
      cliqAlias: data.cliqAlias,
      cliqNumber: data.cliqNumber
    };

    // Debug log to verify the transaction object before saving
    console.log('Transaction object being saved:', {
      id: transaction.id,
      type: transaction.type,
      cliqDetails: {
        type: transaction.cliqType,
        alias: transaction.cliqAlias,
        number: transaction.cliqNumber
      }
    });

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

  async approveTransaction(id: number): Promise<Transaction> {
    const transaction = this.transactions.get(id);
    if (!transaction) {
      throw new Error("Transaction not found");
    }

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

    return updatedTransaction;
  }

  async getAdminUsers(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === "admin");
  }

  async createNotification(data: InsertNotification): Promise<void> {
    const id = this.currentNotificationId++;
    const notification: Notification = {
      id,
      ...data,
      read: false,
      createdAt: new Date()
    };
    this.notifications.set(id, notification);
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async markNotificationAsRead(notificationId: number): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      this.notifications.set(notificationId, {
        ...notification,
        read: true
      });
    }
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    const userNotifications = Array.from(this.notifications.values())
      .filter(n => n.userId === userId);

    for (const notification of userNotifications) {
      this.notifications.set(notification.id, {
        ...notification,
        read: true
      });
    }
  }
}

export const storage = new MemStorage();