/**
 * 心理咨询平台 - 后端路由配置
 * 
 * 主要功能模块：
 * 1. 用户认证（Demo登录系统 + Replit OAuth）
 * 2. 咨询师管理（注册、认证、钱包）
 * 3. 预约系统（创建、确认、支付）
 * 4. 支付集成（Airwallex支付网关）
 * 5. 收入管理（咨询师收益、提现）
 * 6. 评价系统（客户反馈）
 */

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { findDemoUser, validatePassword, validateVerificationCode } from "./demo-users";
import { makeAirwallexRequest } from "./airwallex-config";
import { z } from "zod";
import { 
  insertTherapistSchema, 
  insertAppointmentSchema, 
  insertReviewSchema, 
  insertAvailabilitySchema, 
  insertTherapistCredentialSchema, 
  insertTherapistEarningsSchema, 
  insertTherapistBeneficiarySchema, 
  insertWithdrawalRequestSchema 
} from "@shared/schema";
import { airwallexConfig, frontendAirwallexConfig, getAirwallexAccessToken } from "./airwallex-config";

export async function registerRoutes(app: Express): Promise<Server> {
  // 初始化认证中间件
  await setupAuth(app);

  /**
   * 自定义认证中间件
   * 支持两种认证方式：
   * 1. Demo登录（基于session的简单认证）
   * 2. Replit OAuth（生产环境认证）
   */
  const customAuth = async (req: any, res: any, next: any) => {
    // 优先检查Demo登录会话
    if (req.session && req.session.userId) {
      const user = await storage.getUser(req.session.userId);
      if (user) {
        req.user = { claims: { sub: user.id } };
        return next();
      }
    }
    
    // 回退到OAuth认证
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
          therapistId: appointment.therapistId,
          appointmentId: appointment.id,
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
            therapistId: appointment.therapistId,
            appointmentId: appointment.id,
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

  // Get Airwallex access token for API calls
  app.get('/api/airwallex/token', async (req, res) => {
    try {
      const accessToken = await getAirwallexAccessToken();
      res.json({ accessToken });
    } catch (error) {
      console.error('Error getting Airwallex access token:', error);
      res.status(500).json({ error: 'Failed to get access token' });
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
          therapistId: appointment_data.therapistId,
          appointmentId: appointment.id,
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

      // Check if this is Airwallex SDK data or manual form data
      if (req.body.values?.beneficiary) {
        // This is Airwallex SDK raw result
        const airwallexRawData = req.body;
        console.log('Received Airwallex raw data:', JSON.stringify(airwallexRawData, null, 2));
        
        // Check for validation errors first
        if (airwallexRawData.errors && airwallexRawData.errors.code === 'VALIDATION_FAILED') {
          console.error('Airwallex validation failed:', airwallexRawData.errors);
          return res.status(400).json({ 
            message: "收款人信息验证失败", 
            details: "请检查表单信息并填写正确的值"
          });
        }
        
        // Extract beneficiary information from Airwallex data
        const beneficiary = airwallexRawData.values?.beneficiary;
        const bankDetails = beneficiary?.bank_details;
        
        if (!beneficiary || !bankDetails) {
          return res.status(400).json({ message: "Invalid Airwallex beneficiary data" });
        }

        // Smart mapping for different types of Airwallex beneficiaries
        let finalAccountNumber = bankDetails.account_number || '';
        
        // If no traditional account number, try to use routing value as identifier
        if (!finalAccountNumber && bankDetails.account_routing_value1) {
          // For email addresses, phone numbers, etc., keep as routing info only
          // Don't put them in accountNumber field for security reasons
          finalAccountNumber = '';
        }

        const beneficiaryData = insertTherapistBeneficiarySchema.parse({
          therapistId,
          accountType: 'bank',
          bankName: bankDetails.bank_name || '',
          accountNumber: finalAccountNumber,
          accountHolderName: bankDetails.account_name || '',
          currency: bankDetails.account_currency || 'USD',
          // Map Airwallex routing information to our schema
          accountRoutingType1: bankDetails.account_routing_type1 || null,
          accountRoutingValue1: bankDetails.account_routing_value1 || null,
          accountRoutingType2: bankDetails.account_routing_type2 || null,
          accountRoutingValue2: bankDetails.account_routing_value2 || null,
          airwallexBeneficiaryId: beneficiary.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          isDefault: false,
          // Store complete Airwallex data as JSON for future reference
          airwallexRawData: JSON.stringify(airwallexRawData)
        });

        const createdBeneficiary = await storage.createTherapistBeneficiary(beneficiaryData);
        res.json(createdBeneficiary);
      } else {
        // This is manual form data
        const { 
          accountType, 
          accountHolderName, 
          accountNumber, 
          bankName, 
          walletId, 
          walletEmail, 
          currency = "HKD",
          accountRoutingType1,
          accountRoutingValue1,
          accountRoutingType2,
          accountRoutingValue2
        } = req.body;
        
        // Validate required fields based on account type
        if (!accountType || !accountHolderName) {
          return res.status(400).json({ message: "缺少必填字段" });
        }

        let beneficiaryData: any = {
          therapistId,
          accountType,
          accountHolderName,
          currency,
          isDefault: false,
        };

        // Add type-specific fields
        if (accountType === "airwallex") {
          if (!walletId && !walletEmail) {
            return res.status(400).json({ message: "Airwallex钱包需要提供钱包ID或邮箱" });
          }
          beneficiaryData.walletId = walletId;
          beneficiaryData.walletEmail = walletEmail;
        } else {
          if (!accountNumber) {
            return res.status(400).json({ message: "账户号码为必填项" });
          }
          beneficiaryData.accountNumber = accountNumber;
          if (accountType === "bank" && bankName) {
            beneficiaryData.bankName = bankName;
          }
          
          // Add routing information for bank accounts
          if (accountRoutingType1) {
            beneficiaryData.accountRoutingType1 = accountRoutingType1;
          }
          if (accountRoutingValue1) {
            beneficiaryData.accountRoutingValue1 = accountRoutingValue1;
          }
          if (accountRoutingType2) {
            beneficiaryData.accountRoutingType2 = accountRoutingType2;
          }
          if (accountRoutingValue2) {
            beneficiaryData.accountRoutingValue2 = accountRoutingValue2;
          }
        }

        const createdBeneficiary = await storage.createTherapistBeneficiary(beneficiaryData);
        res.json(createdBeneficiary);
      }
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
      
      console.log('=== WITHDRAWAL REQUEST RECEIVED ===');
      console.log('TherapistId from params:', therapistId);
      console.log('UserId from auth:', userId);
      console.log('Request body:', req.body);
      
      // Verify therapist ownership
      const therapist = await storage.getTherapistByUserId(userId);
      if (!therapist || therapist.id !== therapistId) {
        console.log('Access denied - therapist mismatch:', { therapist, therapistId });
        return res.status(403).json({ message: "Access denied" });
      }

      const { amount, beneficiaryId } = req.body;
      console.log('Extracted values:', { amount, beneficiaryId });

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

      let withdrawalStatus = "pending";
      let airwallexTransferId = null;

      // Process transfer via Airwallex API for both wallet and bank accounts
      if (beneficiary.accountType === 'airwallex') {
        console.log('Processing Airwallex wallet withdrawal for beneficiary:', beneficiary);
        try {
          // Create transfer request to Airwallex using the reusable function
          const transferData = {
            beneficiary: {
              digital_wallet: {
                account_name: beneficiary.accountHolderName,
                id_type: beneficiary.walletId ? "account_number" : "email", 
                id_value: beneficiary.walletId || beneficiary.walletEmail,
                provider: "AIRWALLEX"
              },
              type: "DIGITAL_WALLET"
            },
            currency: "HKD", // Add required currency field at top level
            fee_paid_by:"payer",
            metadata: {
              therapist_id: therapistId.toString(),
              withdrawal_id: Date.now().toString()
            },
            reason: "withdrawal",
            reference: `WD-${Date.now()}`,
            request_id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            source_currency: "HKD",
            transfer_amount: amount.toFixed(2),
            transfer_currency: "HKD", 
            transfer_method: "LOCAL"
          };

          const transferResponse = await makeAirwallexRequest('/api/v1/transfers/create', {
            method: 'POST',
            body: JSON.stringify(transferData)
          });
           console.log('Airwallex wallet transfer request body:', JSON.stringify(transferData));
          if (transferResponse.ok) {
            const transferResult = await transferResponse.json();
            airwallexTransferId = transferResult.id;
          } else {
            throw new Error(`Transfer failed: ${transferResponse.status}`);
          }
          withdrawalStatus = "processing"; // Set to processing if Airwallex transfer initiated
          console.log('Airwallex wallet transfer created successfully with ID:', airwallexTransferId);
          
          // Start polling for transfer status
          if (airwallexTransferId) {
            pollTransferStatus(airwallexTransferId);
          }
        } catch (error) {
          console.error('Error processing Airwallex wallet transfer:', error);
          withdrawalStatus = "failed";
        }
      } else if (beneficiary.accountType === 'bank') {
        console.log('Processing Airwallex bank transfer for beneficiary:', beneficiary);
        try {
          // Use airwallex_raw_data for bank transfer if available
          let transferData;
          
          if (beneficiary.airwallexRawData) {
            try {
              const rawData = JSON.parse(beneficiary.airwallexRawData);
              console.log('Using airwallex_raw_data for bank transfer:', rawData);
              
              // Build transfer request using the values object from airwallex_raw_data
              transferData = {
                "transfer_method": "LOCAL",
                "reference": `${beneficiary.currency}测试PRE${Date.now()}`,
                "reason": "business_expenses",
                "fee_paid_by":"payer",
                "source_currency": "HKD",
                "transfer_currency": beneficiary.currency || "HKD",
                "beneficiary": rawData.values?.beneficiary || rawData.beneficiary || rawData, // Use beneficiary from values object
                "source_amount": amount.toFixed(2),
                "request_id": `${Date.now()}-${beneficiary.currency || 'HKD'}-${Math.random().toString(36).substr(2, 6)}`
              };
            } catch (parseError) {
              console.error('Error parsing airwallex_raw_data:', parseError);
              throw new Error('Invalid airwallex_raw_data format');
            }
          } else {
            // No airwallex_raw_data available for bank account
            console.log('No airwallex_raw_data found for bank account');
            throw new Error('未找到绑定的收款帐号信息，请联系您的客户经理');
          }

          console.log('Airwallex bank transfer request body:', JSON.stringify(transferData, null, 2));
          
          const transferResponse = await makeAirwallexRequest('/api/v1/transfers/create', {
            method: 'POST',
            body: JSON.stringify(transferData)
          });
          
          if (transferResponse.ok) {
            const transferResult = await transferResponse.json();
            airwallexTransferId = transferResult.id;
            withdrawalStatus = "processing"; // Set to processing if Airwallex transfer initiated
            console.log('Airwallex bank transfer created successfully with ID:', airwallexTransferId);
            
            // Start polling for transfer status
            if (airwallexTransferId) {
              pollTransferStatus(airwallexTransferId);
            }
          } else {
            const errorData = await transferResponse.text();
            console.error('Airwallex bank transfer failed:', errorData);
            throw new Error(`Bank transfer failed: ${transferResponse.status} - ${errorData}`);
          }
        } catch (error) {
          console.error('Error processing Airwallex bank transfer:', error);
          withdrawalStatus = "failed";
        }
      }


      // Create withdrawal request with updated status
      const withdrawal = await storage.createWithdrawalRequest({
        therapistId,
        beneficiaryId,
        amount: amount.toString(),
        currency: beneficiary.currency,
        status: withdrawalStatus,
        airwallexTransferId: airwallexTransferId || undefined,
      });

      // Only mark earnings as withdrawn if transfer was successful or for non-Airwallex accounts
      if (withdrawalStatus !== "failed") {
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

  // Function to poll transfer status
  async function pollTransferStatus(transferId: string, attempts: number = 0): Promise<void> {
    const MAX_ATTEMPTS = 10; // 10 attempts * 3 seconds = 30 seconds
    
    if (attempts >= MAX_ATTEMPTS) {
      console.log(`Polling stopped for transfer ${transferId} after ${MAX_ATTEMPTS} attempts`);
      return;
    }

    try {
      console.log(`Polling transfer status (attempt ${attempts + 1}/${MAX_ATTEMPTS}): ${transferId}`);
      
      const statusResponse = await makeAirwallexRequest(`/api/v1/transfers/${transferId}`, {
        method: 'GET'
      });

      if (statusResponse.ok) {
        const transferData = await statusResponse.json();
        console.log(`Transfer ${transferId} status: ${transferData.status}`);
        
        if (transferData.status === 'PAID') {
          // Update withdrawal status to completed
          await storage.updateWithdrawalByTransferId(transferId, {
            status: 'completed',
            processedAt: new Date()
          });
          console.log(`Transfer ${transferId} completed successfully!`);
          return;
        } else if (transferData.status === 'FAILED' || transferData.status === 'CANCELLED') {
          // Update withdrawal status to failed
          await storage.updateWithdrawalByTransferId(transferId, {
            status: 'failed',
            failureReason: `Transfer ${transferData.status.toLowerCase()}`
          });
          console.log(`Transfer ${transferId} failed with status: ${transferData.status}`);
          return;
        }
      } else {
        console.error(`Failed to check transfer status: ${statusResponse.status}`);
      }
    } catch (error) {
      console.error(`Error polling transfer status for ${transferId}:`, error);
    }

    // Schedule next poll in 3 seconds
    setTimeout(() => {
      pollTransferStatus(transferId, attempts + 1);
    }, 3000);
  }

  // Demo API for manual transfer status check
  app.post('/api/demo/check-transfer-status', async (req, res) => {
    try {
      const { transferId } = req.body;
      if (!transferId) {
        return res.status(400).json({ message: "Transfer ID required" });
      }

      console.log(`Manual status check for transfer: ${transferId}`);
      const statusResponse = await makeAirwallexRequest(`/api/v1/transfers/${transferId}`, {
        method: 'GET'
      });

      if (statusResponse.ok) {
        const transferData = await statusResponse.json();
        console.log(`Transfer ${transferId} manual check - status: ${transferData.status}`);
        
        if (transferData.status === 'PAID') {
          await storage.updateWithdrawalByTransferId(transferId, {
            status: 'completed',
            processedAt: new Date()
          });
          res.json({ message: "Transfer completed and updated", status: transferData.status });
        } else if (transferData.status === 'FAILED' || transferData.status === 'CANCELLED') {
          await storage.updateWithdrawalByTransferId(transferId, {
            status: 'failed',
            failureReason: `Transfer ${transferData.status.toLowerCase()}`
          });
          res.json({ message: "Transfer failed and updated", status: transferData.status });
        } else {
          res.json({ message: "Transfer still processing", status: transferData.status });
        }
      } else {
        res.status(500).json({ message: "Failed to check transfer status" });
      }
    } catch (error) {
      console.error("Error checking transfer status:", error);
      res.status(500).json({ message: "Error checking transfer status" });
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
