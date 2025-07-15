import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { z } from "zod";
import { insertTherapistSchema, insertAppointmentSchema, insertReviewSchema, insertAvailabilitySchema, insertTherapistCredentialSchema, insertTherapistEarningsSchema, insertTherapistBeneficiarySchema, insertWithdrawalRequestSchema } from "@shared/schema";
import { airwallexConfig, frontendAirwallexConfig, getAirwallexAccessToken, makeAirwallexRequest } from "./airwallex-config";

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
      const { makeAirwallexRequest } = await import('./airwallex-config.js');
      
      // Generate code_verifier and code_challenge for PKCE
      const crypto = require('crypto');
      const codeVerifier = crypto.randomBytes(32).toString('base64url');
      const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
      
      const response = await makeAirwallexRequest('/api/v1/authentication/authorize', {
        method: 'POST',
        body: JSON.stringify({
          scope: 'w:awx_action:transfers_edit',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256'
        })
      });
      
      const authData = await response.json();
      
      if (!response.ok) {
        console.error('Airwallex auth error:', authData);
        return res.status(400).json({ message: 'Failed to get authorization code' });
      }
      
      res.json({
        authCode: authData.authorization_code,
        codeVerifier: codeVerifier
      });
    } catch (error) {
      console.error('Error generating Airwallex auth:', error);
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
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency,
        customer_id: customer_id,
        merchant_order_id: `order_${Date.now()}_${userId}`,
        order: {
          products: [{
            name: '心理咨询服务',
            desc: '专业心理咨询师一对一咨询服务',
            sku: 'counseling-session',
            type: 'service',
            unit_price: Math.round(amount * 100),
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
          amount: Math.round(amount * 100),
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

  app.post('/api/payments/confirm', customAuth, async (req: any, res) => {
    try {
      const { payment_intent_id, appointment_data } = req.body;
      
      // In a real implementation, confirm payment with Airwallex API
      // For development, simulate successful payment
      const paymentResult = {
        id: payment_intent_id,
        status: 'succeeded',
        amount_received: appointment_data?.price ? Math.round(appointment_data.price * 100) : 0,
        currency: 'CNY'
      };

      // If payment successful and appointment data provided, create appointment
      if (paymentResult.status === 'succeeded' && appointment_data) {
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
          price: appointment_data.price || 0
        });
        
        const appointment = await storage.createAppointment(appointmentData);
        
        res.json({
          payment: paymentResult,
          appointment: appointment
        });
      } else {
        res.json({ payment: paymentResult });
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
      
      // Demo users
      const demoUsers = [
        {
          id: "demo_client_001",
          email: "client@demo.com",
          phone: "13800138001",
          password: "demo123",
          firstName: "张",
          lastName: "三",
          profileImageUrl: null,
          role: "client"
        },
        {
          id: "demo_therapist_001", 
          email: "therapist@demo.com",
          phone: "13800138002",
          password: "demo123",
          firstName: "李",
          lastName: "医生",
          profileImageUrl: null,
          role: "therapist"
        }
      ];

      // Find user by email or phone
      const user = demoUsers.find(u => 
        u.email === emailOrPhone || u.phone === emailOrPhone
      );

      if (!user) {
        return res.status(401).json({ message: "用户不存在" });
      }

      // Validate password or verification code
      if (password && user.password !== password) {
        return res.status(401).json({ message: "密码错误" });
      }

      if (verificationCode && verificationCode !== "123456") {
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

      const beneficiaryData = insertTherapistBeneficiarySchema.parse({
        ...req.body,
        therapistId
      });

      const beneficiary = await storage.createTherapistBeneficiary(beneficiaryData);
      res.json(beneficiary);
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

      const withdrawalData = insertWithdrawalRequestSchema.parse({
        ...req.body,
        therapistId
      });

      const withdrawal = await storage.createWithdrawalRequest(withdrawalData);
      res.json(withdrawal);
    } catch (error) {
      console.error("Error creating withdrawal:", error);
      res.status(500).json({ message: "Failed to create withdrawal" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
