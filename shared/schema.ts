/**
 * 心理咨询平台 - 数据库模式定义
 * 
 * 包含以下主要数据表：
 * 1. 用户系统（users, sessions）
 * 2. 咨询师管理（therapists, therapistCredentials, availability）
 * 3. 预约系统（appointments, reviews）
 * 4. 支付集成（airwallexCustomers, therapistEarnings, therapistBeneficiaries, withdrawalRequests）
 */

import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
  time,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * 会话存储表
 * 用于存储用户登录会话信息（Replit Auth必需）
 */
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

/**
 * 用户基础信息表
 * 存储所有用户（客户和咨询师）的基本信息
 */
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("client"), // 角色：client（客户）或 therapist（咨询师）
  phone: varchar("phone"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Airwallex customer mapping table
export const airwallexCustomers = pgTable("airwallex_customers", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  merchantCustomerId: varchar("merchant_customer_id").notNull(),
  airwallexCustomerId: varchar("airwallex_customer_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Therapist profiles
export const therapists = pgTable("therapists", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title").notNull(), // e.g., "临床心理学博士"
  specialties: text("specialties").array(), // JSON array of specialties
  description: text("description"),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  experience: integer("experience"), // years of experience
  education: text("education"),
  certifications: text("certifications").array(),
  consultationMethods: text("consultation_methods").array(), // ["online", "in-person"]
  isVerified: boolean("is_verified").default(false),
  verificationStatus: varchar("verification_status").default("pending"), // "pending", "approved", "rejected"
  verificationNotes: text("verification_notes"), // Admin notes for verification
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  totalReviews: integer("total_reviews").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Therapist credentials/certificates
export const therapistCredentials = pgTable("therapist_credentials", {
  id: serial("id").primaryKey(),
  therapistId: integer("therapist_id").notNull().references(() => therapists.id),
  credentialType: varchar("credential_type").notNull(), // "license", "certificate", "degree"
  credentialName: varchar("credential_name").notNull(),
  issuingOrganization: varchar("issuing_organization").notNull(),
  issueDate: timestamp("issue_date"),
  expiryDate: timestamp("expiry_date"),
  credentialNumber: varchar("credential_number"),
  documentUrl: varchar("document_url"), // URL to uploaded document
  verificationStatus: varchar("verification_status").default("pending"), // "pending", "approved", "rejected"
  verificationNotes: text("verification_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Therapist availability
export const availability = pgTable("availability", {
  id: serial("id").primaryKey(),
  therapistId: integer("therapist_id").notNull().references(() => therapists.id),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 (Sunday-Saturday)
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  isActive: boolean("is_active").default(true),
});

// Appointments
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  clientId: varchar("client_id").notNull().references(() => users.id),
  therapistId: integer("therapist_id").notNull().references(() => therapists.id),
  appointmentDate: timestamp("appointment_date").notNull(),
  duration: integer("duration").default(60), // minutes
  consultationType: varchar("consultation_type").notNull(), // "online" or "in-person"
  status: varchar("status").notNull().default("pending"), // "pending", "confirmed", "completed", "cancelled"
  clientNotes: text("client_notes"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  paymentStatus: varchar("payment_status").default("pending"), // "pending", "paid", "refunded"
  paymentIntentId: varchar("payment_intent_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reviews
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").notNull().references(() => appointments.id),
  clientId: varchar("client_id").notNull().references(() => users.id),
  therapistId: integer("therapist_id").notNull().references(() => therapists.id),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  isAnonymous: boolean("is_anonymous").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Therapist earnings and wallet
export const therapistEarnings = pgTable("therapist_earnings", {
  id: serial("id").primaryKey(),
  therapistId: integer("therapist_id").notNull().references(() => therapists.id),
  appointmentId: integer("appointment_id").notNull().references(() => appointments.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  commission: decimal("commission", { precision: 10, scale: 2 }).notNull().default("0"),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status").notNull().default("pending"), // pending, available, withdrawn
  earnedAt: timestamp("earned_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Beneficiary accounts for payouts
export const therapistBeneficiaries = pgTable("therapist_beneficiaries", {
  id: serial("id").primaryKey(),
  therapistId: integer("therapist_id").notNull().references(() => therapists.id),
  airwallexBeneficiaryId: varchar("airwallex_beneficiary_id").notNull(),
  accountType: varchar("account_type").notNull(), // bank, card, etc.
  accountHolderName: varchar("account_holder_name").notNull(),
  accountNumber: varchar("account_number").notNull(), // masked
  bankName: varchar("bank_name"),
  currency: varchar("currency").notNull().default("CNY"),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  airwallexRawData: text("airwallex_raw_data"), // Store complete Airwallex SDK result
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Withdrawal requests
export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: serial("id").primaryKey(),
  therapistId: integer("therapist_id").notNull().references(() => therapists.id),
  beneficiaryId: integer("beneficiary_id").notNull().references(() => therapistBeneficiaries.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").notNull().default("CNY"),
  status: varchar("status").notNull().default("pending"), // pending, processing, completed, failed
  airwallexTransferRequestId: varchar("airwallex_transfer_request_id"),
  airwallexTransferId: varchar("airwallex_transfer_id"),
  failureReason: text("failure_reason"),
  requestedAt: timestamp("requested_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const userRelations = relations(users, ({ one, many }) => ({
  therapistProfile: one(therapists, {
    fields: [users.id],
    references: [therapists.userId],
  }),
  clientAppointments: many(appointments, {
    relationName: "clientAppointments",
  }),
  reviews: many(reviews),
}));

export const therapistRelations = relations(therapists, ({ one, many }) => ({
  user: one(users, {
    fields: [therapists.userId],
    references: [users.id],
  }),
  availability: many(availability),
  appointments: many(appointments),
  reviews: many(reviews),
  credentials: many(therapistCredentials),
  earnings: many(therapistEarnings),
  beneficiaries: many(therapistBeneficiaries),
  withdrawalRequests: many(withdrawalRequests),
}));

export const therapistCredentialRelations = relations(therapistCredentials, ({ one }) => ({
  therapist: one(therapists, {
    fields: [therapistCredentials.therapistId],
    references: [therapists.id],
  }),
}));

export const appointmentRelations = relations(appointments, ({ one }) => ({
  client: one(users, {
    fields: [appointments.clientId],
    references: [users.id],
    relationName: "clientAppointments",
  }),
  therapist: one(therapists, {
    fields: [appointments.therapistId],
    references: [therapists.id],
  }),
  review: one(reviews, {
    fields: [appointments.id],
    references: [reviews.appointmentId],
  }),
}));

export const reviewRelations = relations(reviews, ({ one }) => ({
  appointment: one(appointments, {
    fields: [reviews.appointmentId],
    references: [appointments.id],
  }),
  client: one(users, {
    fields: [reviews.clientId],
    references: [users.id],
  }),
  therapist: one(therapists, {
    fields: [reviews.therapistId],
    references: [therapists.id],
  }),
}));

export const therapistEarningsRelations = relations(therapistEarnings, ({ one }) => ({
  therapist: one(therapists, {
    fields: [therapistEarnings.therapistId],
    references: [therapists.id],
  }),
  appointment: one(appointments, {
    fields: [therapistEarnings.appointmentId],
    references: [appointments.id],
  }),
}));

export const therapistBeneficiariesRelations = relations(therapistBeneficiaries, ({ one, many }) => ({
  therapist: one(therapists, {
    fields: [therapistBeneficiaries.therapistId],
    references: [therapists.id],
  }),
  withdrawalRequests: many(withdrawalRequests),
}));

export const withdrawalRequestsRelations = relations(withdrawalRequests, ({ one }) => ({
  therapist: one(therapists, {
    fields: [withdrawalRequests.therapistId],
    references: [therapists.id],
  }),
  beneficiary: one(therapistBeneficiaries, {
    fields: [withdrawalRequests.beneficiaryId],
    references: [therapistBeneficiaries.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertTherapistSchema = createInsertSchema(therapists).omit({
  id: true,
  rating: true,
  totalReviews: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

export const insertAvailabilitySchema = createInsertSchema(availability).omit({
  id: true,
});

export const insertAirwallexCustomerSchema = createInsertSchema(airwallexCustomers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTherapistCredentialSchema = createInsertSchema(therapistCredentials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTherapistEarningsSchema = createInsertSchema(therapistEarnings).omit({
  id: true,
  earnedAt: true,
  createdAt: true,
});

export const insertTherapistBeneficiarySchema = createInsertSchema(therapistBeneficiaries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWithdrawalRequestSchema = createInsertSchema(withdrawalRequests).omit({
  id: true,
  requestedAt: true,
  processedAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTherapist = z.infer<typeof insertTherapistSchema>;
export type Therapist = typeof therapists.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;
export type Availability = typeof availability.$inferSelect;
export type InsertAirwallexCustomer = z.infer<typeof insertAirwallexCustomerSchema>;
export type AirwallexCustomer = typeof airwallexCustomers.$inferSelect;
export type InsertTherapistCredential = z.infer<typeof insertTherapistCredentialSchema>;
export type TherapistCredential = typeof therapistCredentials.$inferSelect;
export type InsertTherapistEarnings = z.infer<typeof insertTherapistEarningsSchema>;
export type TherapistEarnings = typeof therapistEarnings.$inferSelect;
export type InsertTherapistBeneficiary = z.infer<typeof insertTherapistBeneficiarySchema>;
export type TherapistBeneficiary = typeof therapistBeneficiaries.$inferSelect;
export type InsertWithdrawalRequest = z.infer<typeof insertWithdrawalRequestSchema>;
export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;

// Extended types with relations
export type TherapistWithUser = Therapist & { user: User };
export type AppointmentWithDetails = Appointment & {
  client: User;
  therapist: TherapistWithUser;
};
export type ReviewWithDetails = Review & {
  client: User;
  therapist: TherapistWithUser;
};
