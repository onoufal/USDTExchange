import { storage } from "../storage";
import { Transaction } from "@shared/schema";
import { z } from "zod";
import { createNotification } from "./notification.service";

// Schema for trade validation
const tradeSchema = z.object({
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

export class TransactionService {
  static async validateSellOrderCliQSettings(userId: number, cliqType: string | null, cliqAlias: string | null, cliqNumber: string | null) {
    if (!cliqType || (!cliqAlias && !cliqNumber)) {
      console.error('Missing CliQ settings for sell order:', {
        userId,
        cliqType,
        hasAlias: !!cliqAlias,
        hasNumber: !!cliqNumber
      });
      throw new Error("CliQ settings must be configured for sell orders");
    }

    // Log validated CliQ settings
    console.log('Verified CliQ settings for sell order:', {
      userId,
      cliqType,
      cliqAlias,
      cliqNumber
    });
  }

  static async createTransaction(userId: number, data: any, proofOfPayment: string, user: Express.User): Promise<Transaction> {
    const validatedData = tradeSchema.parse(data);

    if (validatedData.type === "sell") {
      await this.validateSellOrderCliQSettings(userId, user.cliqType, user.cliqAlias, user.cliqNumber);
    }

    const transactionData = {
      userId,
      type: validatedData.type,
      amount: validatedData.amount.toString(),
      rate: validatedData.rate,
      status: "pending",
      proofOfPayment,
      createdAt: new Date(),
      network: validatedData.type === "sell" ? validatedData.network : null,
      paymentMethod: validatedData.type === "buy" ? validatedData.paymentMethod : null,
      cliqType: validatedData.type === "sell" ? user.cliqType : null,
      cliqAlias: validatedData.type === "sell" && user.cliqType === "alias" ? user.cliqAlias : null,
      cliqNumber: validatedData.type === "sell" && user.cliqType === "number" ? user.cliqNumber : null,
    };

    // Log transaction data before creation
    console.log('Creating transaction - Data preparation:', {
      ...transactionData,
      proofOfPayment: '[REDACTED]',
      cliqDetails: {
        type: transactionData.cliqType,
        alias: transactionData.cliqAlias,
        number: transactionData.cliqNumber
      }
    });

    const transaction = await storage.createTransaction(transactionData);

    // Log created transaction
    console.log('Transaction created - Final data:', {
      id: transaction.id,
      type: transaction.type,
      cliqDetails: {
        type: transaction.cliqType,
        alias: transaction.cliqAlias,
        number: transaction.cliqNumber
      }
    });

    return transaction;
  }

  static async approveTransaction(transactionId: number, userId: number): Promise<Transaction> {
    const transaction = await storage.approveTransaction(transactionId);
    await createNotification({
      userId: transaction.userId,
      type: "order_approved",
      message: `Your ${transaction.type} order for ${transaction.amount} USDT has been approved`,
      relatedId: transaction.id
    });
    return transaction;
  }

  static async getTransaction(id: number): Promise<Transaction | undefined> {
    return storage.getTransaction(id);
  }

  static async getUserTransactions(userId: number): Promise<Transaction[]> {
    return storage.getUserTransactions(userId);
  }

  static async getAllTransactions(): Promise<Transaction[]> {
    return storage.getAllTransactions();
  }
}