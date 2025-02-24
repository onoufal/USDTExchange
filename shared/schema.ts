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
  cliqType: text("cliq_type"), // 'alias' or 'number'
  cliqAlias: text("cliq_alias"),
  cliqNumber: text("cliq_number"),
  accountHolderName: text("account_holder_name"),
  bankName: text("bank_name")
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

export const updateUserCliqSchema = z.object({
  bankName: z.string().min(1, "Bank name is required"),
  cliqType: z.enum(["alias", "number"], {
    errorMap: () => ({ message: "Please select either Alias or CliQ number" })
  }),
  cliqAlias: z.string().optional(),
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
    fee: z.number().default(0)
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type UpdateUserWallet = z.infer<typeof updateUserWalletSchema>;
export type UpdateUserCliq = z.infer<typeof updateUserCliqSchema>;