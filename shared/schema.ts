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

// List of Jordanian banks
export const JORDANIAN_BANKS = [
  "Arab Bank",
  "Housing Bank",
  "Jordan Islamic Bank",
  "Cairo Amman Bank",
  "Bank of Jordan",
  "Jordan Kuwait Bank",
  "Jordan Ahli Bank",
  "Arab Jordan Investment Bank",
  "Jordan Commercial Bank",
  "Societe Generale Jordan",
  "Capital Bank of Jordan",
  "Bank al Etihad",
  "Safwa Islamic Bank",
  "Arab Banking Corporation (Jordan)"
] as const;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username"),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  verificationToken: text("verification_token"),
  isVerified: boolean("is_verified").default(false),
  mobileNumber: text("mobile_number"),
  mobileVerified: boolean("mobile_verified").default(false),
  kycStatus: text("kyc_status").default("pending"),
  kycDocument: text("kyc_document"),
  loyaltyPoints: integer("loyalty_points").default(0),
  role: text("role").default("user"),
  createdAt: timestamp("created_at").defaultNow(),
  usdtAddress: text("usdt_address"), 
  usdtNetwork: text("usdt_network"),
  cliqType: text("cliq_type"),
  cliqAlias: text("cliq_alias"),
  cliqNumber: text("cliq_number"),
  accountHolderName: text("account_holder_name"),
  bankName: text("bank_name"),
  bankBranch: text("bank_branch"),
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
  fee: decimal("fee").default('0'),
  network: text("network"), 
  paymentMethod: text("payment_method"), 
});

export const insertUserSchema = createInsertSchema(users)
  .pick({
    email: true,
    password: true,
    fullName: true,
    username: true,
  })
  .extend({
    email: z.string()
      .email("Please enter a valid email address")
      .min(1, "Email is required"),
    password: z.string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character"),
    username: z.string()
      .min(3, "Username must be at least 3 characters")
      .max(20, "Username cannot exceed 20 characters")
      .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens")
      .transform(val => val.toLowerCase()),
    fullName: z.string()
      .min(1, "Full name is required")
      .max(50, "Full name cannot exceed 50 characters")
  });

export const updateUserWalletSchema = z.object({
  usdtAddress: z.string().min(1, "USDT address is required"),
  usdtNetwork: z.enum(["tron", "bep20"], {
    errorMap: () => ({ message: "Please select either Tron or BEP20 network" })
  })
});

export const updateUserCliqSchema = z.object({
  bankName: z.enum(JORDANIAN_BANKS, {
    errorMap: () => ({ message: "Please select a bank from the list" })
  }),
  cliqType: z.enum(["alias", "number"], {
    errorMap: () => ({ message: "Please select either Alias or CliQ number" })
  }),
  cliqAlias: z.string()
    .optional()
    .refine(val => !val || /^[A-Z0-9]{1,10}$/.test(val), {
      message: "CliQ alias must not exceed 10 characters and use uppercase letters/numbers"
    })
    .refine(val => !val || /.*[A-Z].*/.test(val), {
      message: "CliQ alias must contain at least one letter"
    }),
  cliqNumber: z.string()
    .optional()
    .refine(val => !val || /^009627[0-9]{8}$/.test(val), {
      message: "CliQ number must be in format 009627xxxxxxxx"
    }),
  accountHolderName: z.string().min(1, "Account holder name is required")
}).refine(
  data => {
    if (data.cliqType === "alias" && !data.cliqAlias) {
      return false;
    }
    if (data.cliqType === "number" && !data.cliqNumber) {
      return false;
    }
    return true;
  },
  {
    message: "Either CliQ alias or number must be provided based on selected type",
    path: ["cliqType"]
  }
);

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
    fee: z.number().default(0),
    network: z.enum(["trc20", "bep20"]).optional(),
    paymentMethod: z.enum(["cliq", "wallet"]).optional()
  });

export const updateUserBankSchema = z.object({
  bankName: z.enum(JORDANIAN_BANKS, {
    errorMap: () => ({ message: "Please select a bank from the list" })
  }),
  bankBranch: z.string().min(1, "Bank branch is required"),
  bankAccountNumber: z.string().min(1, "Account number is required"),
  bankIban: z.string()
    .min(1, "IBAN is required")
    .regex(/^JO\d{2}[A-Z]{4}\d{22}$/, "Invalid Jordanian IBAN format")
});

export type UpdateUserBank = z.infer<typeof updateUserBankSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type UpdateUserWallet = z.infer<typeof updateUserWalletSchema>;
export type UpdateUserCliq = z.infer<typeof updateUserCliqSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;