# ProofWork Platform

## Overview

ProofWork is a task-based point reward system that allows users to submit tasks for review and earn points upon approval. The platform features a user interface for task submission and tracking, along with an admin dashboard for reviewing and managing tasks. Users can view their progress through leaderboards and personal statistics, while administrators can review pending tasks and manage the overall system.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling and development
- **Routing**: Wouter for client-side routing with protected routes for authenticated areas
- **UI Framework**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Authentication**: Context-based authentication system with session management

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Session Management**: Express sessions with PostgreSQL session store
- **Authentication**: Passport.js with local strategy using scrypt for password hashing
- **API Design**: RESTful endpoints with consistent error handling and logging middleware

### Database Design
- **Database**: PostgreSQL with Neon serverless connection pooling
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Tables**:
  - `users`: User accounts with roles (user/admin), points tracking, and authentication data
  - `tasks`: Task submissions with status tracking, point values, and review information
- **Relationships**: Foreign key relationships between users and tasks for submission and review tracking

### Authentication & Authorization
- **Strategy**: Session-based authentication using Passport.js local strategy
- **Password Security**: Scrypt hashing with salt for secure password storage
- **Role-Based Access**: User and admin roles with protected routes and API endpoints
- **Session Storage**: PostgreSQL-backed session store for persistence

### Task Management System
- **Task Types**: Predefined categories (content creation, bug reports, feature requests, community help, documentation) with associated point values
- **Workflow**: Submit → Pending → Approved/Rejected with optional rejection reasons
- **Point System**: Automatic point assignment based on task type, with admin ability to adjust
- **Review Process**: Admin-only access to pending tasks with approval/rejection capabilities

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL database with connection pooling
- **Environment Configuration**: DATABASE_URL for connection string management

### UI Component Libraries
- **Radix UI**: Comprehensive set of accessible React components for complex UI patterns
- **Tailwind CSS**: Utility-first CSS framework with custom design system variables
- **Lucide React**: Icon library for consistent iconography throughout the application

### Development & Build Tools
- **Vite**: Modern build tool with hot reload and optimized production builds
- **TypeScript**: Static type checking with strict configuration
- **ESBuild**: Fast bundling for production server builds
- **PostCSS**: CSS processing with Tailwind and Autoprefixer plugins

### Runtime Dependencies
- **Date-fns**: Date manipulation and formatting utilities
- **Nanoid**: Unique ID generation for various system components
- **Class Variance Authority**: Utility for creating component variant systems
- **CLSX & Tailwind Merge**: CSS class name manipulation and optimization