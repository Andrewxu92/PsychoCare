import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { findDemoUser, validatePassword, validateVerificationCode } from "./demo-users";
import { makeAirwallexRequest } from "./airwallex-config";
import { z } from "zod";
import { insertTherapistSchema, insertAppointmentSchema, insertReviewSchema, insertAvailabilitySchema, insertTherapistCredentialSchema, insertTherapistEarningsSchema, insertTherapistBeneficiarySchema, insertWithdrawalRequestSchema } from "@shared/schema";
import { airwallexConfig, frontendAirwallexConfig, getAirwallexAccessToken } from "./airwallex-config";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Custom authentication middleware that supports both OAuth and demo login
  const customAuth = async (req: any, res: any, next: any) => {
    // Check for demo login session first
    if (req.session && req.session.userId) {
      const user = await storage.getUser(req.session.userId);
      if (user) {
        req.user = { claims: { sub: user.id } };
        return next();
      }
    }
    
    // Fall back to OAuth authentication
    return isAuthenticated(req, res, next);
  };

  // Auth routes
  app.get('/api/auth/user', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Logout route
  app.get('/api/logout', (req: any, res) => {
    if (req.session) {
      req.session.destroy((err: any) => {
        if (err) {
          console.error('Session destroy error:', err);
          return res.status(500).json({ message: 'Failed to logout' });
        }
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.redirect('/');
      });
    } else {
      res.redirect('/');
    }
  });

  // Therapist routes
  app.get('/api/therapists/by-user/:userId', customAuth, async (req: any, res) => {
    try {
      const userId = req.params.userId;
      const therapist = await storage.getTherapistByUserId(userId);
      
      if (!therapist) {
        return res.status(404).json({ message: "Therapist not found" });
      }
      
      res.json(therapist);
    } catch (error) {
      console.error("Error fetching therapist by user ID:", error);
      res.status(500).json({ message: "Failed to fetch therapist" });
    }
  });

  app.get('/api/therapists', async (req, res) => {
    try {
      const { specialty, consultationType, priceMin, priceMax } = req.query;
      const filters = {
        specialty: specialty as string,
        consultationType: consultationType as string,
        priceMin: priceMin ? Number(priceMin) : undefined,
        priceMax: priceMax ? Number(priceMax) : undefined,
      };
      
      const therapists = await storage.getTherapists(filters);
      res.json(therapists);
    } catch (error) {
      console.error("Error fetching therapists:", error);
      res.status(500).json({ message: "Failed to fetch therapists" });
    }
  });

  app.get('/api/therapists/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const therapist = await storage.getTherapistById(id);
      if (!therapist) {
        return res.status(404).json({ message: "Therapist not found" });
      }
      res.json(therapist);
    } catch (error) {
      console.error("Error fetching therapist:", error);
      res.status(500).json({ message: "Failed to fetch therapist" });
    }
  });

  app.post('/api/therapists', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if user already has a therapist profile
      const existingTherapist = await storage.getTherapistByUserId(userId);
      if (existingTherapist) {
        return res.status(400).json({ message: "User already has a therapist profile" });
      }

      const therapistData = insertTherapistSchema.parse({
        ...req.body,
        userId
      });
      
      const therapist = await storage.createTherapist(therapistData);
      res.status(201).json(therapist);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating therapist:", error);
      res.status(500).json({ message: "Failed to create therapist profile" });
    }
  });

  app.put('/api/therapists/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Check if therapist belongs to user
      const therapist = await storage.getTherapistById(id);
      if (!therapist || therapist.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const updates = insertTherapistSchema.partial().parse(req.body);
      const updatedTherapist = await storage.updateTherapist(id, updates);
      res.json(updatedTherapist);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating therapist:", error);
      res.status(500).json({ message: "Failed to update therapist profile" });
    }
  });

  // Therapist credential routes
  app.get('/api/therapists/:id/credentials', isAuthenticated, async (req: any, res) => {
    try {
      const therapistId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Check if therapist belongs to user
      const therapist = await storage.getTherapistById(therapistId);
      if (!therapist || therapist.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const credentials = await storage.getTherapistCredentials(therapistId);
      res.json(credentials);
    } catch (error) {
      console.error("Error fetching credentials:", error);
      res.status(500).json({ message: "Failed to fetch credentials" });
    }
  });

  app.post('/api/therapists/:id/credentials', isAuthenticated, async (req: any, res) => {
    try {
      const therapistId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Check if therapist belongs to user
      const therapist = await storage.getTherapistById(therapistId);
      if (!therapist || therapist.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const credentialData = insertTherapistCredentialSchema.parse({
        ...req.body,
        therapistId
      });
      
      const credential = await storage.createTherapistCredential(credentialData);
      res.status(201).json(credential);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating credential:", error);
      res.status(500).json({ message: "Failed to create credential" });
    }
  });

  app.put('/api/therapists/:id/credentials/:credentialId', isAuthenticated, async (req: any, res) => {
    try {
      const therapistId = parseInt(req.params.id);
      const credentialId = parseInt(req.params.credentialId);
      const userId = req.user.claims.sub;
      
      // Check if therapist belongs to user
      const therapist = await storage.getTherapistById(therapistId);
      if (!therapist || therapist.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const updates = insertTherapistCredentialSchema.partial().parse(req.body);
      const updatedCredential = await storage.updateTherapistCredential(credentialId, updates);
      res.json(updatedCredential);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating credential:", error);
      res.status(500).json({ message: "Failed to update credential" });
    }
  });

  app.delete('/api/therapists/:id/credentials/:credentialId', isAuthenticated, async (req: any, res) => {
    try {
      const therapistId = parseInt(req.params.id);
      const credentialId = parseInt(req.params.credentialId);
      const userId = req.user.claims.sub;
      
      // Check if therapist belongs to user
      const therapist = await storage.getTherapistById(therapistId);
      if (!therapist || therapist.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.deleteTherapistCredential(credentialId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting credential:", error);
      res.status(500).json({ message: "Failed to delete credential" });
    }
  });

  // Availability routes
  app.get('/api/therapists/:id/availability', async (req, res) => {
    try {
      const therapistId = parseInt(req.params.id);
      const availability = await storage.getAvailability(therapistId);
      res.json(availability);
    } catch (error) {
      console.error("Error fetching availability:", error);
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  app.post('/api/therapists/:id/availability', customAuth, async (req: any, res) => {
    try {
      const therapistId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Check if therapist belongs to user
      const therapist = await storage.getTherapistById(therapistId);
      if (!therapist || therapist.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const availabilityData = insertAvailabilitySchema.parse({
        ...req.body,
        therapistId
      });
      
      const availability = await storage.createAvailability(availabilityData);
      res.status(201).json(availability);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating availability:", error);
      res.status(500).json({ message: "Failed to create availability" });
    }
  });

  // Appointment routes
  app.get('/api/appointments', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { status, dateFrom, dateTo, therapistId } = req.query;
      
      const filters: any = {};
      
      // If user has therapist profile, get appointments for that therapist
      const therapist = await storage.getTherapistByUserId(userId);
      if (therapist) {
        filters.therapistId = therapist.id;
      } else {
        // Otherwise get appointments as client
        filters.clientId = userId;
      }

      if (status) filters.status = status as string;
      if (therapistId) filters.therapistId = parseInt(therapistId as string);
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
      
      const appointments = await storage.getAppointments(filters);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  app.get('/api/appointments/:id', customAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const appointment = await storage.getAppointmentById(id);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      // Check if user is client or therapist for this appointment
      const therapist = await storage.getTherapistByUserId(userId);
      const isTherapist = therapist && therapist.id === appointment.therapistId;
      const isClient = appointment.clientId === userId;

      if (!isTherapist && !isClient) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      res.json(appointment);
    } catch (error) {
      console.error("Error fetching appointment:", error);
      res.status(500).json({ message: "Failed to fetch appointment" });
    }
  });

  app.post('/api/appointments', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Convert appointmentDate string to Date object if needed
      const requestData = { ...req.body };
      if (requestData.appointmentDate && typeof requestData.appointmentDate === 'string') {
        requestData.appointmentDate = new Date(requestData.appointmentDate);
      }
      
      const appointmentData = insertAppointmentSchema.parse({
        ...requestData,
        clientId: userId
      });
      
      const appointment = await storage.createAppointment(appointmentData);
      res.status(201).json(appointment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating appointment:", error);
      res.status(500).json({ message: "Failed to create appointment" });
    }
  });

  app.put('/api/appointments/:id', customAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const appointment = await storage.getAppointmentById(id);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      // Check if user is client or therapist for this appointment
      const therapist = await storage.getTherapistByUserId(userId);
      const isTherapist = therapist && therapist.id === appointment.therapistId;
      const isClient = appointment.clientId === userId;

      if (!isTherapist && !isClient) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const updates = insertAppointmentSchema.partial().parse(req.body);
      delete updates.clientId; // Prevent changing client
      
      const updatedAppointment = await storage.updateAppointment(id, updates);

      // If payment status changed to "paid", create earnings record
      if (updates.paymentStatus === "paid" && appointment.paymentStatus !== "paid") {
        const appointmentPrice = parseFloat(appointment.price);
        const commission = appointmentPrice * 0.5; // 50% platform commission
        const netAmount = appointmentPrice - commission;

        await storage.createTherapistEarnings({
          therapistId: appointment.therapistId.toString(),
          appointmentId: appointment.id.toString(),
          amount: appointmentPrice.toString(),
          commission: commission.toString(),
          netAmount: netAmount.toString(),
          status: "pending", // Will be "available" after session completion
        });
      }

      // If status changed to "completed", create earnings if not exists and make available
      if (updates.status === "completed" && appointment.status !== "completed") {
        let earnings = await storage.getTherapistEarningsByAppointment(appointment.id);
        
        // Create earnings record if it doesn't exist (for cases where payment status is still pending)
        if (!earnings && appointment.price && parseFloat(appointment.price) > 0) {
          const appointmentPrice = parseFloat(appointment.price);
          const commission = appointmentPrice * 0.5; // 50% platform commission
          const netAmount = appointmentPrice - commission;

          earnings = await storage.createTherapistEarnings({
            therapistId: appointment.therapistId.toString(),
            appointmentId: appointment.id.toString(),
            amount: appointmentPrice.toString(),
            commission: commission.toString(),
            netAmount: netAmount.toString(),
            status: "available", // Directly available since session is completed
          });
        } else if (earnings) {
          // Update existing earnings to available
          await storage.updateTherapistEarnings(earnings.id, { status: "available" });
        }
      }

      res.json(updatedAppointment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating appointment:", error);
      res.status(500).json({ message: "Failed to update appointment" });
    }
  });

  // Review routes
  app.get('/api/reviews', async (req, res) => {
    try {
      const { therapistId } = req.query;
      const reviews = await storage.getReviews(
        therapistId ? parseInt(therapistId as string) : undefined
      );
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.post('/api/reviews', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const reviewData = insertReviewSchema.parse({
        ...req.body,
        clientId: userId
      });
      
      const review = await storage.createReview(reviewData);
      res.status(201).json(review);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating review:", error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  // User profile routes
  app.put('/api/auth/user', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { role, phone } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = await storage.upsertUser({
        ...user,
        role,
        phone
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Airwallex configuration endpoint
  app.get('/api/airwallex/config', (req, res) => {
    res.json(frontendAirwallexConfig);
  });

  // Test Airwallex authentication
  app.get('/api/airwallex/test-auth', async (req, res) => {
    try {
      const accessToken = await getAirwallexAccessToken();
      res.json({ 
        success: true, 
        message: 'Authentication successful',
        hasToken: !!accessToken
      });
    } catch (error: any) {
      console.error('Airwallex auth test failed:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Authentication failed',
        error: error.message
      });
    }
  });

  // Airwallex authentication for embedded components
  app.post('/api/airwallex/auth', customAuth, async (req: any, res) => {
    try {
      const { makeAirwallexRequest, airwallexConfig } = await import('./airwallex-config.js');
      const crypto = await import('crypto');
      
      // Generate code_verifier and code_challenge for PKCE
      const codeVerifier = crypto.randomBytes(32).toString('base64url');
      const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
      
      console.log('Attempting Airwallex authorize with payload:', {
        scope: ['w:awx_action:transfers_edit'],
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
      });
      
      // Call authorize endpoint to get authorization_code
      const response = await makeAirwallexRequest('/api/v1/authentication/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scope: ['w:awx_action:transfers_edit'],
          code_challenge: codeChallenge,
          code_challenge_method: 'S256'
        })
      });
      
      const authData = await response.json();
      
      if (!response.ok) {
        console.error('Airwallex authorize error:', authData);
        return res.status(400).json({ 
          message: 'Failed to get authorization code',
          error: authData 
        });
      }
      
      console.log('Airwallex authorize success:', authData);
      
      res.json({
        authCode: authData.authorization_code,
        clientId: airwallexConfig.clientId,
        codeVerifier: codeVerifier,
        environment: airwallexConfig.environment
      });
    } catch (error) {
      console.error('Error in Airwallex auth:', error);
      res.status(500).json({ message: 'Failed to generate authorization' });
    }
  });

  // Payment routes for Airwallex integration
  app.post('/api/payments/customer', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if we already have customer mapping in database
      const existingMapping = await storage.getAirwallexCustomerByUserId(userId);
      if (existingMapping) {
        console.log('Found existing customer mapping in database:', existingMapping.airwallexCustomerId);
        return res.json({
          id: existingMapping.airwallexCustomerId,
          merchant_customer_id: existingMapping.merchantCustomerId,
          email: user.email,
          first_name: user.firstName || 'Client',
          last_name: user.lastName || 'User'
        });
      }

      // Create customer using Airwallex API with all required fields
      const customerData = {
        request_id: `req_${Date.now()}_${userId}`,
        merchant_customer_id: userId,
        first_name: user.firstName || 'Client',
        last_name: user.lastName || 'User',
        email: user.email
      };

      console.log('Creating Airwallex customer with data:', customerData);

      let customer;
      try {
        // Use the new secure API call method
        const response = await makeAirwallexRequest('/api/v1/pa/customers/create', {
          method: 'POST',
          body: JSON.stringify(customerData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          
          // If customer already exists, retrieve the existing customer using merchant_customer_id
          if (response.status === 400 && errorData.code === 'resource_already_exists') {
            console.log('Customer already exists, retrieving existing customer...');
            
            // Use GET /api/v1/pa/customers with merchant_customer_id query to get the existing customer
            const getCustomerResponse = await makeAirwallexRequest(`/api/v1/pa/customers?merchant_customer_id=${userId}`, {
              method: 'GET'
            });

            if (!getCustomerResponse.ok) {
              const getErrorText = await getCustomerResponse.text();
              console.error('Failed to retrieve existing customer:', getCustomerResponse.status, getErrorText);
              throw new Error(`Failed to retrieve existing customer: ${getCustomerResponse.status}`);
            }

            const queryResult = await getCustomerResponse.json();
            if (queryResult.items && queryResult.items.length > 0) {
              customer = queryResult.items[0];
              console.log('Found existing customer:', customer.id);
              
              // Store the customer mapping in database for future use
              try {
                await storage.createAirwallexCustomer({
                  userId,
                  merchantCustomerId: userId,
                  airwallexCustomerId: customer.id
                });
                console.log('Stored existing customer mapping in database');
              } catch (dbError) {
                console.warn('Failed to store existing customer mapping:', dbError);
              }
            } else {
              throw new Error('Customer exists but not found in query results');
            }
          } else {
            console.error('Airwallex customer creation error:', response.status, JSON.stringify(errorData));
            throw new Error(`Airwallex API error: ${response.status}`);
          }
        } else {
          customer = await response.json();
          console.log('Successfully created new customer:', customer.id);
          
          // Store the customer mapping in database for future use
          try {
            await storage.createAirwallexCustomer({
              userId,
              merchantCustomerId: userId,
              airwallexCustomerId: customer.id
            });
            console.log('Stored new customer mapping in database');
          } catch (dbError) {
            console.warn('Failed to store new customer mapping:', dbError);
          }
        }
      } catch (airwallexError) {
        console.warn('Airwallex API failed, using mock customer data:', airwallexError);
        // Fallback to mock customer data
        customer = {
          id: `cus_mock_${userId}`,
          client_secret: `cs_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          email: user.email,
          first_name: user.firstName || 'Client',
          last_name: user.lastName || 'User'
        };
      }

      res.json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  app.post('/api/payments/intent', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { amount, currency = 'HKD', customer_id } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      // Create payment intent using Airwallex demo API
      const intentData = {
        request_id: `req_${Date.now()}_${userId}`,
        amount: amount, // Amount in currency units (e.g., 200 for HK$200)
        currency: currency,
        customer_id: customer_id,
        merchant_order_id: `order_${Date.now()}_${userId}`,
        order: {
          products: [{
            name: '心理咨询服务',
            desc: '专业心理咨询师一对一咨询服务',
            sku: 'counseling-session',
            type: 'service',
            unit_price: amount,
            quantity: 1
          }]
        }
      };

      let paymentIntent;
      try {
        // Use the new secure API call method
        const response = await makeAirwallexRequest('/api/v1/pa/payment_intents/create', {
          method: 'POST',
          body: JSON.stringify(intentData)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Airwallex payment intent creation error:', response.status, errorText);
          throw new Error(`Airwallex API error: ${response.status}`);
        }

        paymentIntent = await response.json();
      } catch (airwallexError) {
        console.warn('Airwallex API failed, using mock payment intent:', airwallexError);
        // Fallback to mock payment intent data
        paymentIntent = {
          id: `pi_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          client_secret: `pi_cs_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          amount: amount,
          currency: currency,
          customer_id: customer_id,
          status: 'requires_payment_method'
        };
      }

      res.json(paymentIntent);
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Failed to create payment intent" });
    }
  });

  // Payment intent status check endpoint
  app.get('/api/payments/intent/:id/status', customAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Query Airwallex API for payment intent status
      const response = await makeAirwallexRequest(`/api/v1/pa/payment_intents/${id}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error fetching payment intent status:", response.status, errorText);
        return res.status(response.status).json({ message: "Failed to fetch payment status" });
      }
      
      const paymentIntent = await response.json();
      
      res.json({
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        last_payment_error: paymentIntent.last_payment_error
      });
    } catch (error) {
      console.error("Error checking payment intent status:", error);
      res.status(500).json({ message: "Failed to check payment status" });
    }
  });

  app.post('/api/payments/confirm', customAuth, async (req: any, res) => {
    try {
      const { payment_intent_id, appointment_data } = req.body;
      
      // Query Airwallex API for actual payment intent status
      const statusResponse = await makeAirwallexRequest(`/api/v1/pa/payment_intents/${payment_intent_id}`);
      
      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error("Error fetching payment intent status:", statusResponse.status, errorText);
        return res.status(statusResponse.status).json({ message: "Failed to verify payment status" });
      }
      
      const paymentIntent = await statusResponse.json();
      console.log("Payment intent status:", paymentIntent.status);
      
      // Only proceed if payment status is SUCCEEDED
      if (paymentIntent.status === 'SUCCEEDED' && appointment_data) {
        const userId = req.user.claims.sub;
        const appointmentData = insertAppointmentSchema.parse({
          clientId: userId,
          therapistId: appointment_data.therapistId,
          appointmentDate: new Date(appointment_data.appointmentDate),
          duration: appointment_data.duration || 60,
          consultationType: appointment_data.consultationType,
          status: 'confirmed',
          clientNotes: appointment_data.clientNotes || '',
          paymentStatus: 'paid',
          paymentIntentId: payment_intent_id,
          price: appointment_data.price || 0
        });
        
        const appointment = await storage.createAppointment(appointmentData);
        
        // Create earnings record when payment is confirmed
        const appointmentPrice = parseFloat(appointment_data.price);
        const commission = appointmentPrice * 0.5; // 50% platform commission
        const netAmount = appointmentPrice - commission;

        await storage.createTherapistEarnings({
          therapistId: appointment_data.therapistId.toString(),
          appointmentId: appointment.id.toString(),
          amount: appointmentPrice.toString(),
          commission: commission.toString(),
          netAmount: netAmount.toString(),
          status: "pending", // Will be "available" after session completion
        });
        
        res.json({
          payment: {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency
          },
          appointment: appointment
        });
      } else if (paymentIntent.status !== 'SUCCEEDED') {
        res.status(400).json({ 
          message: "Payment not successful", 
          status: paymentIntent.status,
          error: paymentIntent.last_payment_error
        });
      } else {
        res.json({ 
          payment: {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency
          }
        });
      }
    } catch (error) {
      console.error("Error confirming payment:", error);
      res.status(500).json({ message: "Failed to confirm payment" });
    }
  });

  // Demo login endpoints
  app.post("/api/auth/demo-login", async (req, res) => {
    try {
      const { emailOrPhone, password, verificationCode } = req.body;
      
      // Find user by email or phone
      const user = findDemoUser(emailOrPhone);

      if (!user) {
        return res.status(401).json({ message: "用户不存在" });
      }

      // Validate password or verification code
      if (password && !validatePassword(user, password)) {
        return res.status(401).json({ message: "密码错误" });
      }

      if (verificationCode && !validateVerificationCode(verificationCode)) {
        return res.status(401).json({ message: "验证码错误" });
      }

      // Create or update user in database
      const dbUser = await storage.upsertUser({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      });

      // Set session
      (req.session as any).userId = user.id;
      req.session.save();

      res.json({ user: dbUser, message: "登录成功" });
    } catch (error) {
      console.error("Demo login error:", error);
      res.status(500).json({ message: "登录失败" });
    }
  });

  app.post("/api/auth/send-code", async (req, res) => {
    try {
      const { emailOrPhone } = req.body;
      
      // Mock sending verification code
      console.log(`Sending verification code to ${emailOrPhone}: 123456`);
      
      res.json({ message: "验证码已发送", code: "123456" }); // In production, don't send actual code
    } catch (error) {
      console.error("Send code error:", error);
      res.status(500).json({ message: "发送验证码失败" });
    }
  });

  // Wallet and earnings routes
  app.get('/api/therapists/:therapistId/wallet/summary', customAuth, async (req: any, res) => {
    try {
      const therapistId = parseInt(req.params.therapistId);
      const userId = req.user.claims.sub;
      
      // Verify therapist ownership
      const therapist = await storage.getTherapistByUserId(userId);
      if (!therapist || therapist.id !== therapistId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const summary = await storage.getTherapistWalletSummary(therapistId);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching wallet summary:", error);
      res.status(500).json({ message: "Failed to fetch wallet summary" });
    }
  });

  app.get('/api/therapists/:therapistId/earnings', customAuth, async (req: any, res) => {
    try {
      const therapistId = parseInt(req.params.therapistId);
      const userId = req.user.claims.sub;
      const { status, dateFrom, dateTo } = req.query;
      
      // Verify therapist ownership
      const therapist = await storage.getTherapistByUserId(userId);
      if (!therapist || therapist.id !== therapistId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const filters = {
        status: status as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
      };

      const earnings = await storage.getTherapistEarnings(therapistId, filters);
      res.json(earnings);
    } catch (error) {
      console.error("Error fetching earnings:", error);
      res.status(500).json({ message: "Failed to fetch earnings" });
    }
  });

  app.post('/api/therapists/:therapistId/earnings', customAuth, async (req: any, res) => {
    try {
      const therapistId = parseInt(req.params.therapistId);
      const userId = req.user.claims.sub;
      
      // Verify therapist ownership
      const therapist = await storage.getTherapistByUserId(userId);
      if (!therapist || therapist.id !== therapistId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const earningsData = insertTherapistEarningsSchema.parse({
        ...req.body,
        therapistId
      });

      const earnings = await storage.createTherapistEarnings(earningsData);
      res.json(earnings);
    } catch (error) {
      console.error("Error creating earnings:", error);
      res.status(500).json({ message: "Failed to create earnings" });
    }
  });

  // Beneficiary routes
  app.get('/api/therapists/:therapistId/beneficiaries', customAuth, async (req: any, res) => {
    try {
      const therapistId = parseInt(req.params.therapistId);
      const userId = req.user.claims.sub;
      
      // Verify therapist ownership
      const therapist = await storage.getTherapistByUserId(userId);
      if (!therapist || therapist.id !== therapistId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const beneficiaries = await storage.getTherapistBeneficiaries(therapistId);
      res.json(beneficiaries);
    } catch (error) {
      console.error("Error fetching beneficiaries:", error);
      res.status(500).json({ message: "Failed to fetch beneficiaries" });
    }
  });

  app.post('/api/therapists/:therapistId/beneficiaries', customAuth, async (req: any, res) => {
    try {
      const therapistId = parseInt(req.params.therapistId);
      const userId = req.user.claims.sub;
      
      // Verify therapist ownership
      const therapist = await storage.getTherapistByUserId(userId);
      if (!therapist || therapist.id !== therapistId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Accept complete Airwallex SDK raw result
      const airwallexRawData = req.body;
      console.log('Received Airwallex raw data:', JSON.stringify(airwallexRawData, null, 2));
      
      // Extract beneficiary information from Airwallex data
      const beneficiary = airwallexRawData.values?.beneficiary;
      const bankDetails = beneficiary?.bank_details;
      
      if (!beneficiary || !bankDetails) {
        return res.status(400).json({ message: "Invalid Airwallex beneficiary data" });
      }

      const beneficiaryData = insertTherapistBeneficiarySchema.parse({
        therapistId,
        accountType: 'bank',
        bankName: bankDetails.bank_name || '',
        accountNumber: bankDetails.account_number || '',
        accountHolderName: bankDetails.account_name || '',
        currency: bankDetails.account_currency || 'USD',
        airwallexBeneficiaryId: beneficiary.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        isDefault: false,
        // Store complete Airwallex data as JSON for future reference
        airwallexRawData: JSON.stringify(airwallexRawData)
      });

      const createdBeneficiary = await storage.createTherapistBeneficiary(beneficiaryData);
      res.json(createdBeneficiary);
    } catch (error) {
      console.error("Error creating beneficiary:", error);
      res.status(500).json({ message: "Failed to create beneficiary" });
    }
  });

  app.put('/api/therapists/:therapistId/beneficiaries/:beneficiaryId', customAuth, async (req: any, res) => {
    try {
      const therapistId = parseInt(req.params.therapistId);
      const beneficiaryId = parseInt(req.params.beneficiaryId);
      const userId = req.user.claims.sub;
      
      // Verify therapist ownership
      const therapist = await storage.getTherapistByUserId(userId);
      if (!therapist || therapist.id !== therapistId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const beneficiary = await storage.updateTherapistBeneficiary(beneficiaryId, req.body);
      res.json(beneficiary);
    } catch (error) {
      console.error("Error updating beneficiary:", error);
      res.status(500).json({ message: "Failed to update beneficiary" });
    }
  });

  app.delete('/api/therapists/:therapistId/beneficiaries/:beneficiaryId', customAuth, async (req: any, res) => {
    try {
      const therapistId = parseInt(req.params.therapistId);
      const beneficiaryId = parseInt(req.params.beneficiaryId);
      const userId = req.user.claims.sub;
      
      // Verify therapist ownership
      const therapist = await storage.getTherapistByUserId(userId);
      if (!therapist || therapist.id !== therapistId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteTherapistBeneficiary(beneficiaryId);
      res.json({ message: "Beneficiary deleted successfully" });
    } catch (error) {
      console.error("Error deleting beneficiary:", error);
      res.status(500).json({ message: "Failed to delete beneficiary" });
    }
  });

  app.put('/api/therapists/:therapistId/beneficiaries/:beneficiaryId/set-default', customAuth, async (req: any, res) => {
    try {
      const therapistId = parseInt(req.params.therapistId);
      const beneficiaryId = parseInt(req.params.beneficiaryId);
      const userId = req.user.claims.sub;
      
      // Verify therapist ownership
      const therapist = await storage.getTherapistByUserId(userId);
      if (!therapist || therapist.id !== therapistId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.setDefaultBeneficiary(therapistId, beneficiaryId);
      res.json({ message: "Default beneficiary set successfully" });
    } catch (error) {
      console.error("Error setting default beneficiary:", error);
      res.status(500).json({ message: "Failed to set default beneficiary" });
    }
  });

  // Withdrawal routes
  app.get('/api/therapists/:therapistId/withdrawals', customAuth, async (req: any, res) => {
    try {
      const therapistId = parseInt(req.params.therapistId);
      const userId = req.user.claims.sub;
      
      // Verify therapist ownership
      const therapist = await storage.getTherapistByUserId(userId);
      if (!therapist || therapist.id !== therapistId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const withdrawals = await storage.getWithdrawalRequests(therapistId);
      res.json(withdrawals);
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
      res.status(500).json({ message: "Failed to fetch withdrawals" });
    }
  });

  app.post('/api/therapists/:therapistId/withdrawals', customAuth, async (req: any, res) => {
    try {
      const therapistId = parseInt(req.params.therapistId);
      const userId = req.user.claims.sub;
      
      // Verify therapist ownership
      const therapist = await storage.getTherapistByUserId(userId);
      if (!therapist || therapist.id !== therapistId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { amount, beneficiaryId } = req.body;

      // Validate amount
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "提现金额无效" });
      }

      // Check available balance
      const walletSummary = await storage.getTherapistWalletSummary(therapistId);
      if (walletSummary.availableBalance < amount) {
        return res.status(400).json({ 
          message: "可提现余额不足", 
          availableBalance: walletSummary.availableBalance,
          requestedAmount: amount
        });
      }

      // Get beneficiary details
      const beneficiaries = await storage.getTherapistBeneficiaries(therapistId);
      const beneficiary = beneficiaries.find(b => b.id === beneficiaryId);
      if (!beneficiary) {
        return res.status(404).json({ message: "收款账户未找到" });
      }

      // Create withdrawal request
      const withdrawal = await storage.createWithdrawalRequest({
        therapistId,
        beneficiaryId,
        amount: amount.toString(),
        currency: beneficiary.currency,
        status: "pending",
      });

      // Mark corresponding earnings as withdrawn
      const availableEarnings = await storage.getTherapistEarnings(therapistId, { status: "available" });
      let remainingAmount = amount;
      
      for (const earning of availableEarnings) {
        if (remainingAmount <= 0) break;
        
        const earningAmount = parseFloat(earning.netAmount);
        if (earningAmount <= remainingAmount) {
          await storage.updateTherapistEarnings(earning.id, { status: "withdrawn" });
          remainingAmount -= earningAmount;
        }
      }

      res.status(201).json({
        ...withdrawal,
        beneficiary: {
          accountHolderName: beneficiary.accountHolderName,
          currency: beneficiary.currency,
          accountNumber: beneficiary.accountNumber
        }
      });
    } catch (error) {
      console.error("Error creating withdrawal:", error);
      res.status(500).json({ message: "提现申请失败" });
    }
  });

  // Demo API for testing - add sample earnings
  app.post('/api/demo/add-earnings', customAuth, async (req: any, res) => {
    try {
      const sampleEarnings = [
        {
          therapistId: 7, // therapist@demo.com
          appointmentId: 1,
          amount: "200.00",
          commission: "30.00", 
          netAmount: "170.00",
          currency: "CNY",
          status: "available" as const,
          earnedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        {
          therapistId: 7,
          appointmentId: 2,
          amount: "150.00",
          commission: "22.50",
          netAmount: "127.50",
          currency: "CNY", 
          status: "available" as const,
          earnedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
        {
          therapistId: 7,
          appointmentId: 3,
          amount: "180.00",
          commission: "27.00",
          netAmount: "153.00",
          currency: "CNY",
          status: "pending" as const,
          earnedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
        {
          therapistId: 7,
          appointmentId: 4,
          amount: "220.00",
          commission: "33.00",
          netAmount: "187.00",
          currency: "CNY",
          status: "available" as const,
          earnedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        }
      ];

      for (const earning of sampleEarnings) {
        await storage.createTherapistEarnings(earning);
      }

      res.json({ message: "Sample earnings added", count: sampleEarnings.length });
    } catch (error) {
      console.error("Error adding sample earnings:", error);
      res.status(500).json({ message: "Failed to add sample earnings" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
