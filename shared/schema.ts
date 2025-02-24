import { 
  pgTable, 
  text, 
  serial, 
  integer,
  boolean,
  timestamp,
  decimal
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  mobileNumber: text("mobile_number"),
  mobileVerified: boolean("mobile_verified").default(false),
  kycStatus: text("kyc_status").default("pending"),
  kycDocument: text("kyc_document"),
  loyaltyPoints: integer("loyalty_points").default(0),
  role: text("role").default("user"),
  createdAt: timestamp("created_at").defaultNow(),
  usdtAddress: text("usdt_address"), 
  usdtNetwork: text("usdt_network"),
  bankName: text("bank_name"),
  bankBranch: text("bank_branch"),
  bankAccountName: text("bank_account_name"),
  bankAccountNumber: text("bank_account_number"),
  bankIban: text("bank_iban")
});

export const platformSettings = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  settingKey: text("setting_key").notNull().unique(),
  settingValue: text("setting_value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), 
  amount: decimal("amount").notNull(),
  rate: decimal("rate").notNull(),
  status: text("status").default("pending"),
  proofOfPayment: text("proof_of_payment"),
  createdAt: timestamp("created_at").defaultNow(),
  commission: decimal("commission").default('0'),
  fee: decimal("fee").default('0')
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true
});

export const updateUserWalletSchema = z.object({
  usdtAddress: z.string().min(1, "USDT address is required"),
  usdtNetwork: z.enum(["tron", "bep20"], {
    errorMap: () => ({ message: "Please select either Tron or BEP20 network" })
  })
});

export const updateUserBankSchema = z.object({
  bankName: z.string().min(1, "Bank name is required"),
  bankBranch: z.string().min(1, "Bank branch is required"),
  bankAccountName: z.string().min(1, "Account name is required"),
  bankAccountNumber: z.string().min(1, "Account number is required"),
  bankIban: z.string().min(1, "IBAN is required")
});

export const insertTransactionSchema = createInsertSchema(transactions)
  .pick({
    type: true,
    amount: true,
    rate: true,
    commission: true,
    fee: true
  })
  .extend({
    type: z.enum(["buy", "sell"]),
    amount: z.string()
      .min(1, "Amount is required")
      .regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid number with up to 2 decimal places")
      .transform(Number),
    rate: z.string()
      .regex(/^\d+(\.\d{1,2})?$/, "Rate must be a valid number with up to 2 decimal places")
      .transform(Number),
    commission: z.number().default(0),
    fee: z.number().default(0)
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type UpdateUserWallet = z.infer<typeof updateUserWalletSchema>;
export type UpdateUserBank = z.infer<typeof updateUserBankSchema>;