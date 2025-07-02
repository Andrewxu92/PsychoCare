import {
  users,
  therapists,
  appointments,
  reviews,
  availability,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, avg, count } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
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
    let query = db
      .select()
      .from(therapists)
      .innerJoin(users, eq(therapists.userId, users.id))
      .where(eq(therapists.isVerified, true));

    if (filters?.specialty) {
      query = query.where(sql`${therapists.specialties} @> ${[filters.specialty]}`);
    }

    if (filters?.consultationType) {
      query = query.where(sql`${therapists.consultationMethods} @> ${[filters.consultationType]}`);
    }

    if (filters?.priceMin) {
      query = query.where(gte(therapists.hourlyRate, filters.priceMin.toString()));
    }

    if (filters?.priceMax) {
      query = query.where(lte(therapists.hourlyRate, filters.priceMax.toString()));
    }

    const results = await query.orderBy(desc(therapists.rating));
    
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
    let query = db
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

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.orderBy(desc(appointments.appointmentDate));
    
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
    const [result] = await db
      .select()
      .from(appointments)
      .innerJoin(users, eq(appointments.clientId, users.id))
      .innerJoin(therapists, eq(appointments.therapistId, therapists.id))
      .where(eq(appointments.id, id));

    if (!result) return undefined;

    return {
      ...result.appointments,
      client: result.users,
      therapist: {
        ...result.therapists,
        user: result.users
      }
    };
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
    let query = db
      .select()
      .from(reviews)
      .innerJoin(users, eq(reviews.clientId, users.id))
      .innerJoin(therapists, eq(reviews.therapistId, therapists.id));

    if (therapistId) {
      query = query.where(eq(reviews.therapistId, therapistId));
    }

    const results = await query.orderBy(desc(reviews.createdAt));
    
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
}

export const storage = new DatabaseStorage();
