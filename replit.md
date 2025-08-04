# Psychology Counseling Platform

## Overview

This is a full-stack web application for a psychology counseling platform built using modern web technologies. The platform connects clients with professional therapists, enabling online appointment booking, session management, and review systems. The application features a React frontend with TypeScript, Express.js backend, and PostgreSQL database with Drizzle ORM.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing
- **UI Components**: Radix UI primitives with custom styling

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful endpoints with structured error handling
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Replit Auth with OpenID Connect integration
- **Session Management**: Express sessions with PostgreSQL storage

### Database Architecture
- **Database**: PostgreSQL (configured for Neon serverless)
- **Schema Management**: Drizzle migrations with shared schema definitions
- **Connection**: Connection pooling with @neondatabase/serverless

## Key Components

### Authentication System
- **Provider**: Replit Authentication with OIDC
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **User Management**: Centralized user profile management with role-based access (client/therapist)
- **Security**: HTTP-only cookies with secure flag for production

### Therapist Management
- **Profile System**: Comprehensive therapist profiles with specialties, hourly rates, and descriptions
- **Availability Scheduling**: Flexible availability system with day-of-week and time slot management
- **Search & Filtering**: Advanced filtering by specialty, consultation type, and price range

### Appointment System
- **Booking Flow**: Multi-step booking process (therapist selection → datetime → details → payment → confirmation)
- **Calendar Integration**: Custom calendar component for availability visualization
- **Session Types**: Support for both online and in-person consultations
- **Status Management**: Appointment lifecycle management (pending, confirmed, completed, cancelled)

### Payment Integration
- **Payment Processor**: Airwallex integration for secure payment processing
- **Payment Flow**: Client-side payment form with real-time validation
- **Transaction Management**: Secure payment confirmation and error handling

### Review System
- **Rating System**: 5-star rating system with detailed feedback
- **Privacy Options**: Anonymous review capability
- **Moderation**: Review management with therapist response capability

## Data Flow

### User Registration & Authentication
1. User initiates login via Replit Auth
2. OIDC flow redirects to Replit identity provider
3. Successful authentication creates/updates user profile
4. Session established with PostgreSQL storage
5. Frontend receives user data via `/api/auth/user` endpoint

### Appointment Booking Flow
1. Client browses therapists via search/filter interface
2. Client selects therapist and views availability
3. Multi-step booking form collects appointment details
4. Payment processing via Airwallex
5. Appointment creation and confirmation notifications
6. Calendar integration updates therapist availability

### Data Persistence
- **Shared Schema**: Centralized schema definitions in `/shared/schema.ts`
- **Type Safety**: Drizzle ORM provides end-to-end type safety
- **Validation**: Zod schemas for runtime validation
- **Migrations**: Version-controlled database schema changes

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL with connection pooling
- **Authentication**: Replit Auth OIDC integration
- **Payment Processing**: Airwallex payment gateway
- **UI Framework**: Radix UI component primitives
- **Date Management**: date-fns for internationalization

### Development Tools
- **Type Checking**: TypeScript with strict configuration
- **Code Quality**: ESM modules with modern JavaScript features
- **Build Optimization**: Vite with React plugin and runtime error overlay
- **Development Environment**: Replit-specific tooling and cartographer integration

## Deployment Strategy

### Development Environment
- **Hot Reload**: Vite development server with HMR
- **Database**: Neon PostgreSQL development instance
- **Environment Variables**: DATABASE_URL, SESSION_SECRET, REPLIT_DOMAINS
- **Development Tools**: Replit runtime error overlay and cartographer

### Production Build
- **Frontend**: Vite build with optimized bundle splitting
- **Backend**: ESBuild compilation to single bundle
- **Static Assets**: Served via Express static middleware
- **Database Migrations**: Drizzle push command for schema synchronization

### Environment Configuration
- **Database Connection**: Neon serverless with WebSocket fallback
- **Session Security**: Secure cookies with HTTPS enforcement
- **CORS**: Configured for Replit domain restrictions
- **Error Handling**: Structured error responses with appropriate HTTP status codes

## Changelog

```
Changelog:
- July 02, 2025. Initial setup
- July 03, 2025. Implemented proper Airwallex authentication flow with access token caching
- July 03, 2025. Fixed payment integration to use x-client-id and x-api-key headers
- July 03, 2025. Added customer existence handling for existing Airwallex customers
- July 03, 2025. Removed prefilled payment data and added multiple payment method options
- July 03, 2025. Implemented complete customer management system with database mapping
- July 03, 2025. Fixed customer query logic to use existing customer IDs for payment intents
- July 03, 2025. Added therapist registration system with credential verification
- July 03, 2025. Implemented therapist dashboard for appointment management
- July 03, 2025. Added therapist credentials database table for qualification verification
- July 03, 2025. Extended API routes for therapist credential management
- July 03, 2025. Created custom login system with email/phone and password/verification code options
- July 03, 2025. Added demo user accounts for testing (client and therapist roles)
- July 03, 2025. Populated database with sample therapist data, appointments, and reviews
- July 03, 2025. Enhanced Airwallex token management with automatic retry on 401 errors and race condition protection
- July 03, 2025. Removed OAuth authentication system, now using only custom demo login with session-based authentication
- July 15, 2025. Implemented comprehensive therapist wallet functionality with income display, withdrawal capabilities, and Airwallex beneficiary integration
- July 15, 2025. Added database schema for therapist earnings, beneficiaries, and withdrawal requests
- July 15, 2025. Created complete wallet management interface with masked account numbers and transaction history
- July 15, 2025. Extended API routes for wallet operations including earnings tracking and beneficiary management
- August 04, 2025. Fixed payment amount inconsistency and currency display issues
- August 04, 2025. Implemented 50% revenue sharing model for therapist earnings
- August 04, 2025. Created separate demo users configuration file (server/demo-users.ts)
- August 04, 2025. Added user Andrew Xu (44517059) to demo users with password demo@123
- August 04, 2025. Fixed critical payment status verification bug: now correctly parses JSON response instead of checking HTTP status
- August 04, 2025. Resolved booking confirmation page display issues (Invalid Date and NaN amounts) with proper data validation
- August 04, 2025. Fixed DOM nesting validation warnings by restructuring Badge component usage in confirmation page
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
Technology stack preference: JavaScript frontend + Java backend (requested January 7, 2025)
```