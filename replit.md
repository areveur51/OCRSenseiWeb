# OCR Text Extractor - Dual Verification System

## Overview

This is a Matrix-themed OCR (Optical Character Recognition) application that extracts text from scanned images using dual verification with pytesseract and EasyOCR. The system allows users to organize projects, upload images for processing, track OCR results, and search through extracted text. The application features a distinctive terminal/hacker aesthetic with neon green text on black backgrounds and ASCII art throughout.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Component Strategy**: The application uses shadcn/ui components built on top of Radix UI primitives, providing accessible and customizable UI elements. Components are styled with Tailwind CSS using a custom Matrix terminal theme.

**Design System**: 
- Theme: Matrix Terminal/Hacker Console aesthetic with monospace fonts throughout
- Color scheme: Pure black backgrounds (#000) with bright neon green text (#00FF41)
- Typography: Exclusively monospace fonts (Courier New, Consolas, Monaco)
- Visual elements: Prominent ASCII art on each page, animated cursors during loading states
- Component variants: Custom hover/active states using green color elevations

**Routing**: Client-side routing implemented with Wouter for lightweight navigation between dashboard, project details, image details, and search pages.

**State Management**: React Query (@tanstack/react-query) for server state management, with local component state using React hooks.

**Key Pages**:
- Dashboard: Overview of all projects with statistics
- Project Detail: View images within a project/subdirectory with upload capabilities
- Image Detail: View individual image with OCR results and text region highlighting
- Search: Full-text search across all extracted OCR content

### Backend Architecture

**Framework**: Express.js with TypeScript running on Node.js

**API Design**: RESTful API architecture with routes prefixed with `/api`. The routing system is modular with a `registerRoutes` function that sets up all API endpoints.

**Storage Layer**: The application uses an abstraction layer (`IStorage` interface) with both in-memory (`MemStorage`) and database implementations. This allows for flexible storage backends while maintaining consistent CRUD operations.

**Request/Response Handling**:
- JSON body parsing with raw body preservation for webhook verification
- Request logging middleware that captures method, path, status code, duration, and response payloads
- Custom response interception for logging structured data

**Development Setup**: Vite integration in development mode with HMR (Hot Module Replacement) support, serving the frontend through Express middleware.

### Data Storage Solutions

**Database**: PostgreSQL accessed through Neon's serverless driver with WebSocket support

**ORM**: Drizzle ORM for type-safe database operations with schema-first approach

**Schema Design** (implemented):
- Projects table: Stores project metadata with timestamps
- Directories table: Hierarchical structure with project references and parent/child relationships
- Images table: File metadata, source info (upload/URL), processing status
- OCR Results table: Dual verification results (pytesseract config1 vs config2), consensus text, bounding boxes
- Processing Queue table: Asynchronous batch processing with status tracking, priority, attempts, and error handling
- Validation using Zod schemas derived from Drizzle table definitions
- Migration support through drizzle-kit

**Connection Strategy**: Connection pooling via Neon's serverless pool for efficient database access

### Authentication and Authorization

**Current State**: Basic user schema exists with username/password fields, but authentication is not yet fully implemented.

**Storage Interface**: The `IStorage` interface defines methods for user retrieval by ID and username, plus user creation, suggesting future session-based authentication.

**Session Management**: Package dependencies include `connect-pg-simple` for PostgreSQL-backed session storage, indicating plans for server-side session management.

### External Dependencies

**UI Framework**: 
- Radix UI primitives for accessible component foundations
- shadcn/ui component library in "new-york" style
- Tailwind CSS for utility-first styling with custom theme variables

**OCR Processing** (implemented):
- pytesseract: Python-based OCR using Tesseract engine with dual-pass verification
- Two configuration modes (PSM 6 and PSM 3) for consensus-based text extraction
- Higher confidence result selected as consensus
- Note: EasyOCR skipped due to platform dependency conflicts on NixOS
- Bounding box extraction for text region highlighting

**Form Handling**:
- React Hook Form with Zod resolver for type-safe form validation
- Integration with shadcn/ui form components

**Development Tools**:
- Replit-specific plugins for development experience (cartographer, dev banner, runtime error overlay)
- TypeScript for type safety across the stack
- esbuild for production server bundling

**Utilities**:
- date-fns for date manipulation
- clsx and tailwind-merge for conditional class names
- nanoid for generating unique IDs
- wouter for lightweight client-side routing

**Image Handling** (implemented): 
- File upload with multer (17MB limit per image)
- Supported formats: JPG, PNG, TIFF, PDF
- Batch upload support (up to 20 files simultaneously)
- URL download feature for archives.gov and similar sources
- Metadata extraction (filename, size, format, dimensions)

**File Storage Strategy** (implemented): 
- Local filesystem storage in uploads/ directory
- Organized by project and directory: uploads/project_{id}/dir_{id}/
- Database stores file paths, metadata, and processing status
- Dropbox integration deferred: User dismissed integration setup - can be added later for cloud storage
- Note for future: Replit Dropbox connector available at connector:ccfg_dropbox_01K49RKF1K3H5YEV4A3QXW28XT