/**
 * Storage layer implementation for the Exchange Platform.
 * Current implementation uses in-memory storage (Map objects) for development.
 * 
 * For production deployment, consider implementing this interface with a persistent database:
 * 
 * PostgreSQL Implementation Steps:
 * 1. Use create_postgresql_database_tool to provision the database
 * 2. Define schema using Drizzle ORM in shared/schema.ts
 * 3. Create DatabaseStorage class implementing IStorage interface
 * 4. Use Drizzle's query builder for CRUD operations
 * 
 * Example PostgreSQL implementation:
 * ```typescript
 * export class DatabaseStorage implements IStorage {
 *   private db: PostgreSQLDatabase;
 * 
 *   constructor() {
 *     this.db = drizzle(process.env.DATABASE_URL);
 *     this.sessionStore = new PostgresSessionStore({
 *       conString: process.env.DATABASE_URL,
 *       createTableIfMissing: true
 *     });
 *   }
 * 
 *   async getUser(id: number): Promise<User | undefined> {
 *     const [user] = await this.db
 *       .select()
 *       .from(users)
 *       .where(eq(users.id, id));
 *     return user;
 *   }
 *   // Implement other interface methods...
 * }
 * ```
 */

import { users, transactions, type User, type InsertUser, type Transaction, platformSettings } from "@shared/schema";
import type { SessionData, Store } from "express-session";
import createMemoryStore from "memorystore";
import session from "express-session";
import { eq } from "drizzle-orm";

const MemoryStore = createMemoryStore(session);

/**
 * Interface defining the storage operations for the application.
 * This interface is implemented by both in-memory and database storage classes.
 */
export interface IStorage {
  /** Express session store for maintaining user sessions */
  sessionStore: Store;

  /** 
   * Retrieves a user by their ID
   * @param id The user's unique identifier
   * @returns Promise resolving to the user or undefined if not found
   */
  getUser(id: number): Promise<User | undefined>;

  /** 
   * Retrieves a user by their username
   * @param username The username to search for
   * @returns Promise resolving to the user or undefined if not found
   */
  getUserByUsername(username: string): Promise<User | undefined>;

  /** 
   * Retrieves a user by their email address
   * @param email The email address to search for
   * @returns Promise resolving to the user or undefined if not found
   */
  getUserByEmail(email: string): Promise<User | undefined>;

  /** 
   * Creates a new user in the storage
   * @param user User data to insert
   * @returns Promise resolving to the created user
   */
  createUser(user: InsertUser): Promise<User>;

  /** 
   * Verifies a user's email address
   * @param id The user's ID
   */
  verifyEmail(id: number): Promise<void>;

  /** 
   * Updates a user's mobile number
   * @param id The user's ID
   * @param mobile The mobile number to set
   */
  updateUserMobile(id: number, mobile: string): Promise<void>;

  /** 
   * Updates a user's KYC document
   * @param id The user's ID
   * @param document Base64 encoded document data
   */
  updateUserKYC(id: number, document: string): Promise<void>;

  /** 
   * Approves a user's KYC verification
   * @param id The user's ID
   */
  approveKYC(id: number): Promise<void>;

  /** 
   * Retrieves all users in the system
   * @returns Promise resolving to an array of all users
   */
  getAllUsers(): Promise<User[]>;

  /** 
   * Creates a new transaction
   * @param transaction Transaction data to insert
   * @returns Promise resolving to the created transaction
   */
  createTransaction(transaction: Transaction): Promise<Transaction>;

  /** 
   * Retrieves all transactions for a specific user
   * @param userId The user's ID
   * @returns Promise resolving to an array of transactions
   */
  getUserTransactions(userId: number): Promise<Transaction[]>;

  /** 
   * Retrieves all transactions in the system
   * @returns Promise resolving to an array of all transactions
   */
  getAllTransactions(): Promise<Transaction[]>;

  /** 
   * Approves a transaction
   * @param id The transaction ID
   * @returns Promise resolving to the updated transaction
   */
  approveTransaction(id: number): Promise<Transaction>;

  /** 
   * Retrieves a specific transaction
   * @param id The transaction ID
   * @returns Promise resolving to the transaction or undefined if not found
   */
  getTransaction(id: number): Promise<Transaction | undefined>;

  /** 
   * Updates a user's USDT wallet settings
   * @param id The user's ID
   * @param usdtAddress The USDT wallet address
   * @param usdtNetwork The USDT network (e.g., TRC20, BEP20)
   */
  updateUserWallet(id: number, usdtAddress: string, usdtNetwork: string): Promise<void>;

  /** 
   * Updates a user's CliQ payment settings
   * @param id The user's ID
   * @param cliqDetails Object containing CliQ-related settings
   */
  updateUserCliq(id: number, cliqDetails: {
    bankName: string,
    cliqType: string,
    cliqAlias?: string | null,
    cliqNumber?: string | null,
    accountHolderName: string
  }): Promise<void>;

  /** 
   * Retrieves platform payment settings
   * @returns Promise resolving to key-value pairs of payment settings
   */
  getPaymentSettings(): Promise<{ [key: string]: string }>;

  /** 
   * Updates platform payment settings
   * @param settings Key-value pairs of payment settings to update
   */
  updatePaymentSettings(settings: { [key: string]: string }): Promise<void>;

  /** 
   * Retrieves all users with admin role
   * @returns Promise resolving to an array of admin users
   */
  getAdminUsers(): Promise<User[]>;

  /** 
   * Creates a new notification
   * @param notification Notification data to insert
   */
  createNotification(notification: InsertNotification): Promise<void>;

  /** 
   * Retrieves all notifications for a specific user
   * @param userId The user's ID
   * @returns Promise resolving to an array of notifications
   */
  getUserNotifications(userId: number): Promise<Notification[]>;

  /** 
   * Marks a notification as read
   * @param notificationId The notification ID
   */
  markNotificationAsRead(notificationId: number): Promise<void>;

  /** 
   * Marks all notifications as read for a user
   * @param userId The user's ID
   */
  markAllNotificationsAsRead(userId: number): Promise<void>;
}

/**
 * In-memory implementation of the storage interface.
 * Uses Map objects to store data in memory for development and testing.
 */
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

    this.createUser({
      email: "admin@exchangepro.com",
      username: "admin",
      password: "Admin@123",
      fullName: "Admin User"
    }).then(user => {
      const updatedUser = {
        ...user,
        isVerified: true,
        role: "admin"
      };
      this.users.set(user.id, updatedUser);
    });

    this.initializeDefaultSettings();
  }

  /**
   * Initializes default platform payment settings
   * @private
   */
  private initializeDefaultSettings(): void {
    const defaults = {
      buyRate: "0.71",
      buyCommissionPercentage: "1.00",
      sellRate: "0.71",
      sellCommissionPercentage: "1.00",
      cliqAlias: "",
      cliqBankName: "Arab Bank",
      cliqAccountHolder: "",
      cliqNumber: "",
      cliqBankNameForNumber: "Arab Bank",
      cliqNumberAccountHolder: "",
      mobileWallet: "",
      walletType: "Orange Money",
      walletHolderName: "",
      usdtAddressTRC20: "",
      usdtAddressBEP20: ""
    };

    Object.entries(defaults).forEach(([key, value]) => {
      this.settings.set(key, value);
    });
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
      cliqType: data.cliqType,
      cliqAlias: data.cliqAlias,
      cliqNumber: data.cliqNumber
    };

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