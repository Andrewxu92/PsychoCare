/**
 * 数据存储层接口和实现
 * 
 * 提供了完整的数据访问层，包括：
 * - 用户管理（认证必需）
 * - 咨询师管理
 * - 预约系统
 * - 支付和收益管理
 * - 评价系统
 */

import {
  users,
  therapists,
  appointments,
  reviews,
  availability,
  airwallexCustomers,
  therapistCredentials,
  therapistEarnings,
  therapistBeneficiaries,
  withdrawalRequests,
  type User,
  type UpsertUser,
  type Therapist,
  type InsertTherapist,
  type TherapistWithUser,
  type Appointment,
  type InsertAppointment,
  type AppointmentWithDetails,
  type Review,
  type InsertReview,
  type ReviewWithDetails,
  type InsertAvailability,
  type Availability,
  type AirwallexCustomer,
  type InsertAirwallexCustomer,
  type TherapistCredential,
  type InsertTherapistCredential,
  type TherapistEarnings,
  type InsertTherapistEarnings,
  type TherapistBeneficiary,
  type InsertTherapistBeneficiary,
  type WithdrawalRequest,
  type InsertWithdrawalRequest,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, avg, count } from "drizzle-orm";

/**
 * 存储接口定义
 * 定义了所有数据访问操作的标准接口
 */
export interface IStorage {
  // 用户操作（认证系统必需）
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Therapist operations
  getTherapists(filters?: {
    specialty?: string;
    consultationType?: string;
    priceMin?: number;
    priceMax?: number;
  }): Promise<TherapistWithUser[]>;
  getTherapistById(id: number): Promise<TherapistWithUser | undefined>;
  getTherapistByUserId(userId: string): Promise<TherapistWithUser | undefined>;
  createTherapist(therapist: InsertTherapist): Promise<Therapist>;
  updateTherapist(id: number, updates: Partial<InsertTherapist>): Promise<Therapist>;

  // Availability operations
  getAvailability(therapistId: number): Promise<Availability[]>;
  createAvailability(availability: InsertAvailability): Promise<Availability>;
  updateAvailability(id: number, updates: Partial<InsertAvailability>): Promise<Availability>;

  // Appointment operations
  getAppointments(filters?: {
    clientId?: string;
    therapistId?: number;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<AppointmentWithDetails[]>;
  getAppointmentById(id: number): Promise<AppointmentWithDetails | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, updates: Partial<InsertAppointment>): Promise<Appointment>;

  // Review operations
  getReviews(therapistId?: number): Promise<ReviewWithDetails[]>;
  createReview(review: InsertReview): Promise<Review>;
  updateTherapistRating(therapistId: number): Promise<void>;

  // Airwallex customer operations
  getAirwallexCustomerByUserId(userId: string): Promise<AirwallexCustomer | undefined>;
  createAirwallexCustomer(customer: InsertAirwallexCustomer): Promise<AirwallexCustomer>;
  updateAirwallexCustomer(userId: string, airwallexCustomerId: string): Promise<AirwallexCustomer>;

  // Therapist credential operations
  getTherapistCredentials(therapistId: number): Promise<TherapistCredential[]>;
  createTherapistCredential(credential: InsertTherapistCredential): Promise<TherapistCredential>;
  updateTherapistCredential(id: number, updates: Partial<InsertTherapistCredential>): Promise<TherapistCredential>;
  deleteTherapistCredential(id: number): Promise<void>;

  // Wallet and earnings operations
  getTherapistEarnings(therapistId: number, filters?: {
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<TherapistEarnings[]>;
  createTherapistEarnings(earnings: InsertTherapistEarnings): Promise<TherapistEarnings>;
  updateTherapistEarnings(id: number, updates: Partial<InsertTherapistEarnings>): Promise<TherapistEarnings>;
  getTherapistWalletSummary(therapistId: number): Promise<{
    totalEarnings: number;
    availableBalance: number;
    pendingAmount: number;
    withdrawnAmount: number;
  }>;

  // Beneficiary operations
  getTherapistBeneficiaries(therapistId: number): Promise<TherapistBeneficiary[]>;
  createTherapistBeneficiary(beneficiary: InsertTherapistBeneficiary): Promise<TherapistBeneficiary>;
  updateTherapistBeneficiary(id: number, updates: Partial<InsertTherapistBeneficiary>): Promise<TherapistBeneficiary>;
  deleteTherapistBeneficiary(id: number): Promise<void>;
  setDefaultBeneficiary(therapistId: number, beneficiaryId: number): Promise<void>;

  // Withdrawal operations
  getWithdrawalRequests(therapistId: number): Promise<WithdrawalRequest[]>;
  createWithdrawalRequest(request: InsertWithdrawalRequest): Promise<WithdrawalRequest>;
  updateWithdrawalRequest(id: number, updates: Partial<InsertWithdrawalRequest>): Promise<WithdrawalRequest>;
  updateWithdrawalByTransferId(transferId: string, updates: Partial<InsertWithdrawalRequest>): Promise<WithdrawalRequest | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Therapist operations
  async getTherapists(filters?: {
    specialty?: string;
    consultationType?: string;
    priceMin?: number;
    priceMax?: number;
  }): Promise<TherapistWithUser[]> {
    const conditions = [eq(therapists.isVerified, true)];
    
    if (filters?.specialty) {
      conditions.push(sql`${therapists.specialties} @> ${[filters.specialty]}`);
    }

    if (filters?.consultationType) {
      conditions.push(sql`${therapists.consultationMethods} @> ${[filters.consultationType]}`);
    }

    if (filters?.priceMin) {
      conditions.push(gte(therapists.hourlyRate, filters.priceMin.toString()));
    }

    if (filters?.priceMax) {
      conditions.push(lte(therapists.hourlyRate, filters.priceMax.toString()));
    }

    const results = await db
      .select()
      .from(therapists)
      .innerJoin(users, eq(therapists.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(therapists.rating));
    
    return results.map(result => ({
      ...result.therapists,
      user: result.users
    }));
  }

  async getTherapistById(id: number): Promise<TherapistWithUser | undefined> {
    const [result] = await db
      .select()
      .from(therapists)
      .innerJoin(users, eq(therapists.userId, users.id))
      .where(eq(therapists.id, id));

    if (!result) return undefined;

    return {
      ...result.therapists,
      user: result.users
    };
  }

  async getTherapistByUserId(userId: string): Promise<TherapistWithUser | undefined> {
    const [result] = await db
      .select()
      .from(therapists)
      .innerJoin(users, eq(therapists.userId, users.id))
      .where(eq(therapists.userId, userId));

    if (!result) return undefined;

    return {
      ...result.therapists,
      user: result.users
    };
  }

  async createTherapist(therapist: InsertTherapist): Promise<Therapist> {
    const [result] = await db
      .insert(therapists)
      .values(therapist)
      .returning();
    return result;
  }

  async updateTherapist(id: number, updates: Partial<InsertTherapist>): Promise<Therapist> {
    const [result] = await db
      .update(therapists)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(therapists.id, id))
      .returning();
    return result;
  }

  // Availability operations
  async getAvailability(therapistId: number): Promise<Availability[]> {
    return await db
      .select()
      .from(availability)
      .where(and(eq(availability.therapistId, therapistId), eq(availability.isActive, true)));
  }

  async createAvailability(availabilityData: InsertAvailability): Promise<Availability> {
    const [result] = await db
      .insert(availability)
      .values(availabilityData)
      .returning();
    return result;
  }

  async updateAvailability(id: number, updates: Partial<InsertAvailability>): Promise<Availability> {
    const [result] = await db
      .update(availability)
      .set(updates)
      .where(eq(availability.id, id))
      .returning();
    return result;
  }

  // Appointment operations
  async getAppointments(filters?: {
    clientId?: string;
    therapistId?: number;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<AppointmentWithDetails[]> {
    const baseQuery = db
      .select()
      .from(appointments)
      .innerJoin(users, eq(appointments.clientId, users.id))
      .innerJoin(therapists, eq(appointments.therapistId, therapists.id));

    const conditions = [];

    if (filters?.clientId) {
      conditions.push(eq(appointments.clientId, filters.clientId));
    }

    if (filters?.therapistId) {
      conditions.push(eq(appointments.therapistId, filters.therapistId));
    }

    if (filters?.status) {
      conditions.push(eq(appointments.status, filters.status));
    }

    if (filters?.dateFrom) {
      conditions.push(gte(appointments.appointmentDate, filters.dateFrom));
    }

    if (filters?.dateTo) {
      conditions.push(lte(appointments.appointmentDate, filters.dateTo));
    }

    const results = conditions.length > 0 
      ? await baseQuery.where(and(...conditions)).orderBy(desc(appointments.appointmentDate))
      : await baseQuery.orderBy(desc(appointments.appointmentDate));
    
    return results.map(result => ({
      ...result.appointments,
      client: result.users,
      therapist: {
        ...result.therapists,
        user: result.users
      }
    }));
  }

  async getAppointmentById(id: number): Promise<AppointmentWithDetails | undefined> {
    const appointment = await db.query.appointments.findFirst({
      where: eq(appointments.id, id),
      with: {
        client: true,
        therapist: {
          with: {
            user: true
          }
        }
      }
    });

    return appointment as AppointmentWithDetails | undefined;
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [result] = await db
      .insert(appointments)
      .values(appointment)
      .returning();
    return result;
  }

  async updateAppointment(id: number, updates: Partial<InsertAppointment>): Promise<Appointment> {
    const [result] = await db
      .update(appointments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    return result;
  }

  // Review operations
  async getReviews(therapistId?: number): Promise<ReviewWithDetails[]> {
    const baseQuery = db
      .select()
      .from(reviews)
      .innerJoin(users, eq(reviews.clientId, users.id))
      .innerJoin(therapists, eq(reviews.therapistId, therapists.id));

    const results = therapistId 
      ? await baseQuery.where(eq(reviews.therapistId, therapistId)).orderBy(desc(reviews.createdAt))
      : await baseQuery.orderBy(desc(reviews.createdAt));
    
    return results.map(result => ({
      ...result.reviews,
      client: result.users,
      therapist: {
        ...result.therapists,
        user: result.users
      }
    }));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [result] = await db
      .insert(reviews)
      .values(review)
      .returning();

    // Update therapist rating
    await this.updateTherapistRating(review.therapistId);

    return result;
  }

  async updateTherapistRating(therapistId: number): Promise<void> {
    const [stats] = await db
      .select({
        avgRating: avg(reviews.rating),
        totalReviews: count(reviews.id)
      })
      .from(reviews)
      .where(eq(reviews.therapistId, therapistId));

    if (stats) {
      await db
        .update(therapists)
        .set({
          rating: stats.avgRating ? Number(stats.avgRating).toFixed(2) : "0.00",
          totalReviews: stats.totalReviews,
          updatedAt: new Date()
        })
        .where(eq(therapists.id, therapistId));
    }
  }

  // Airwallex customer operations
  async getAirwallexCustomerByUserId(userId: string): Promise<AirwallexCustomer | undefined> {
    const [customer] = await db
      .select()
      .from(airwallexCustomers)
      .where(eq(airwallexCustomers.userId, userId));
    return customer;
  }

  async createAirwallexCustomer(customer: InsertAirwallexCustomer): Promise<AirwallexCustomer> {
    const [result] = await db
      .insert(airwallexCustomers)
      .values(customer)
      .returning();
    return result;
  }

  async updateAirwallexCustomer(userId: string, airwallexCustomerId: string): Promise<AirwallexCustomer> {
    const [result] = await db
      .update(airwallexCustomers)
      .set({
        airwallexCustomerId,
        updatedAt: new Date()
      })
      .where(eq(airwallexCustomers.userId, userId))
      .returning();
    return result;
  }

  // Therapist credential operations
  async getTherapistCredentials(therapistId: number): Promise<TherapistCredential[]> {
    return await db.select()
      .from(therapistCredentials)
      .where(eq(therapistCredentials.therapistId, therapistId))
      .orderBy(desc(therapistCredentials.createdAt));
  }

  async createTherapistCredential(credentialData: InsertTherapistCredential): Promise<TherapistCredential> {
    const [credential] = await db.insert(therapistCredentials)
      .values(credentialData)
      .returning();
    return credential;
  }

  async updateTherapistCredential(id: number, updates: Partial<InsertTherapistCredential>): Promise<TherapistCredential> {
    const [credential] = await db.update(therapistCredentials)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(therapistCredentials.id, id))
      .returning();
    return credential;
  }

  async deleteTherapistCredential(id: number): Promise<void> {
    await db.delete(therapistCredentials)
      .where(eq(therapistCredentials.id, id));
  }

  // Wallet and earnings operations
  async getTherapistEarnings(therapistId: number, filters?: {
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<TherapistEarnings[]> {
    let query;

    const earningsConditions = [eq(therapistEarnings.therapistId, therapistId)];
    
    if (filters?.status) {
      earningsConditions.push(eq(therapistEarnings.status, filters.status));
    }

    if (filters?.dateFrom && filters?.dateTo) {
      earningsConditions.push(
        gte(therapistEarnings.earnedAt, filters.dateFrom),
        lte(therapistEarnings.earnedAt, filters.dateTo)
      );
    }

    return await db.select()
      .from(therapistEarnings)
      .where(and(...earningsConditions))
      .orderBy(desc(therapistEarnings.earnedAt));
  }

  async createTherapistEarnings(earnings: InsertTherapistEarnings): Promise<TherapistEarnings> {
    const [result] = await db.insert(therapistEarnings)
      .values(earnings)
      .returning();
    return result;
  }

  async updateTherapistEarnings(id: number, updates: Partial<InsertTherapistEarnings>): Promise<TherapistEarnings> {
    const [result] = await db.update(therapistEarnings)
      .set(updates)
      .where(eq(therapistEarnings.id, id))
      .returning();
    return result;
  }

  async getTherapistEarningsByAppointment(appointmentId: number): Promise<TherapistEarnings | undefined> {
    const [earning] = await db.select()
      .from(therapistEarnings)
      .where(eq(therapistEarnings.appointmentId, appointmentId));
    return earning;
  }

  async getTherapistWalletSummary(therapistId: number): Promise<{
    totalEarnings: number;
    availableBalance: number;
    pendingAmount: number;
    withdrawnAmount: number;
  }> {
    const earnings = await db.select({
      total: sql<number>`sum(${therapistEarnings.netAmount})`,
      available: sql<number>`sum(case when ${therapistEarnings.status} = 'available' then ${therapistEarnings.netAmount} else 0 end)`,
      pending: sql<number>`sum(case when ${therapistEarnings.status} = 'pending' then ${therapistEarnings.netAmount} else 0 end)`,
      withdrawn: sql<number>`sum(case when ${therapistEarnings.status} = 'withdrawn' then ${therapistEarnings.netAmount} else 0 end)`
    })
    .from(therapistEarnings)
    .where(eq(therapistEarnings.therapistId, therapistId));

    const result = earnings[0];
    return {
      totalEarnings: Number(result.total) || 0,
      availableBalance: Number(result.available) || 0,
      pendingAmount: Number(result.pending) || 0,
      withdrawnAmount: Number(result.withdrawn) || 0
    };
  }

  // Beneficiary operations
  async getTherapistBeneficiaries(therapistId: number): Promise<TherapistBeneficiary[]> {
    return await db.select()
      .from(therapistBeneficiaries)
      .where(and(
        eq(therapistBeneficiaries.therapistId, therapistId),
        eq(therapistBeneficiaries.isActive, true)
      ))
      .orderBy(desc(therapistBeneficiaries.isDefault), desc(therapistBeneficiaries.createdAt));
  }

  async createTherapistBeneficiary(beneficiary: InsertTherapistBeneficiary): Promise<TherapistBeneficiary> {
    const [result] = await db.insert(therapistBeneficiaries)
      .values(beneficiary)
      .returning();
    return result;
  }

  async updateTherapistBeneficiary(id: number, updates: Partial<InsertTherapistBeneficiary>): Promise<TherapistBeneficiary> {
    const [result] = await db.update(therapistBeneficiaries)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(therapistBeneficiaries.id, id))
      .returning();
    return result;
  }

  async deleteTherapistBeneficiary(id: number): Promise<void> {
    await db.update(therapistBeneficiaries)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(therapistBeneficiaries.id, id));
  }

  async setDefaultBeneficiary(therapistId: number, beneficiaryId: number): Promise<void> {
    // First, unset all default flags for this therapist
    await db.update(therapistBeneficiaries)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(therapistBeneficiaries.therapistId, therapistId));

    // Then set the specified beneficiary as default
    await db.update(therapistBeneficiaries)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(and(
        eq(therapistBeneficiaries.id, beneficiaryId),
        eq(therapistBeneficiaries.therapistId, therapistId)
      ));
  }

  // Withdrawal operations
  async getWithdrawalRequests(therapistId: number): Promise<WithdrawalRequest[]> {
    return await db.select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.therapistId, therapistId))
      .orderBy(desc(withdrawalRequests.createdAt));
  }

  async createWithdrawalRequest(request: InsertWithdrawalRequest): Promise<WithdrawalRequest> {
    const [result] = await db.insert(withdrawalRequests)
      .values(request)
      .returning();
    return result;
  }

  async updateWithdrawalRequest(id: number, updates: Partial<InsertWithdrawalRequest>): Promise<WithdrawalRequest> {
    const [result] = await db.update(withdrawalRequests)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(withdrawalRequests.id, id))
      .returning();
    return result;
  }

  async updateWithdrawalByTransferId(transferId: string, updates: Partial<WithdrawalRequest>): Promise<WithdrawalRequest | undefined> {
    const [result] = await db.update(withdrawalRequests)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(withdrawalRequests.airwallexTransferId, transferId))
      .returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
