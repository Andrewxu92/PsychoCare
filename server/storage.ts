import {
  users,
  therapists,
  appointments,
  reviews,
  availability,
  airwallexCustomers,
  therapistCredentials,
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

  // Airwallex customer operations
  getAirwallexCustomerByUserId(userId: string): Promise<AirwallexCustomer | undefined>;
  createAirwallexCustomer(customer: InsertAirwallexCustomer): Promise<AirwallexCustomer>;
  updateAirwallexCustomer(userId: string, airwallexCustomerId: string): Promise<AirwallexCustomer>;

  // Therapist credential operations
  getTherapistCredentials(therapistId: number): Promise<TherapistCredential[]>;
  createTherapistCredential(credential: InsertTherapistCredential): Promise<TherapistCredential>;
  updateTherapistCredential(id: number, updates: Partial<InsertTherapistCredential>): Promise<TherapistCredential>;
  deleteTherapistCredential(id: number): Promise<void>;
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
}

export const storage = new DatabaseStorage();
