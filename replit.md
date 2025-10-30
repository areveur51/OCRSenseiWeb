# OCR Text Extractor - Dual Verification System

## Overview

This is a Matrix-themed OCR (Optical Character Recognition) application that extracts text from scanned images using dual verification with pytesseract. The system allows users to organize projects into subdirectories, upload images for processing, track OCR results with asynchronous batch processing, and search through extracted text. The application features a distinctive terminal/hacker aesthetic with neon green text on black backgrounds and ASCII art throughout.

## Current Status

**✅ FULLY FUNCTIONAL MVP** - All core features implemented and tested end-to-end:
- ✅ Complete database schema with 5 tables (projects, directories, images, ocr_results, processing_queue)
- ✅ Full CRUD API routes for all resources
- ✅ File upload system with 17MB limit and format validation
- ✅ URL download feature for remote images (archives.gov, etc.)
- ✅ OCR processing with pytesseract dual-pass verification (two configurations)
- ✅ Asynchronous batch queue system for OCR processing
- ✅ All frontend pages connected to real API endpoints
- ✅ Interactive image viewer with text region highlighting
- ✅ Full-text search across all OCR results
- ✅ End-to-end testing completed successfully

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Component Strategy**: The application uses shadcn/ui components built on top of Radix UI primitives, providing accessible and customizable UI elements. Components are styled with Tailwind CSS using a custom Matrix terminal theme.

**Design System**: 
- Theme: Matrix Terminal/Hacker Console aesthetic with softer green tones (#55FF55)
- Color scheme: Dark backgrounds with green text (70% saturation for better readability)
- Light mode: Light green CRT-style background (HSL: 120° 30% 92%)
- Typography: Exclusively monospace fonts (Courier New, Consolas, Monaco)
- Visual elements: Prominent ASCII art on each page, animated cursors during loading states
- Component variants: Custom hover/active states using green color elevations

**Routing**: Client-side routing implemented with Wouter for lightweight navigation:
- `/` - Dashboard with system stats
- `/projects` - Project management page
- `/project/:id` or `/project/:id/:subdir` - Project detail with image grid
- `/image/:id` - Image detail with OCR results and text highlighting
- `/search` - Full-text search across all OCR data

**State Management**: React Query (@tanstack/react-query) for server state management, with local component state using React hooks.

**Key Features**:
- Dashboard: Overview of all projects with statistics and recent activity
- Projects: Create/rename/delete projects with directory organization
- Project Detail: Browse directories, upload images, download from URLs, create subdirectories
- Image Detail: View OCR results with dual verification comparison and interactive text highlighting
- Search: Real-time search across all extracted text with context highlighting

### Backend Architecture

**Framework**: Express.js with TypeScript running on Node.js

**API Design**: RESTful API architecture with routes prefixed with `/api`:

**Project Management**:
- `GET /api/projects` - List all projects with stats
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get single project details
- `PATCH /api/projects/:id` - Update project (rename/description)
- `DELETE /api/projects/:id` - Delete project
- `GET /api/projects/:id/directories` - List directories in project

**Directory Management**:
- `POST /api/directories` - Create new directory/subdirectory
- `GET /api/directories/:id` - Get directory details
- `GET /api/directories/:id/images` - List images in directory
- `POST /api/directories/:id/upload` - Upload images (multipart/form-data, 17MB max per file)
- `POST /api/directories/:id/download-url` - Download image from URL
- `DELETE /api/directories/:id` - Delete directory

**Image Processing**:
- `GET /api/images/:id` - Get image details with OCR results
- `POST /api/images/:id/process` - Queue image for OCR processing
- `GET /api/images/:id/file` - Serve image file
- `DELETE /api/images/:id` - Delete image

**Search**:
- `GET /api/search?q=query` - Search across all OCR results

**Storage Layer**: PostgreSQL database with Drizzle ORM. Storage interface abstraction (`IStorage`) allows for future migration to different storage backends.

**Request/Response Handling**:
- JSON body parsing with raw body preservation
- Request logging middleware capturing method, path, status, duration
- Multipart form handling with multer for file uploads
- CORS and credentials handling

### Data Storage Solutions

**Database**: PostgreSQL accessed through Neon's serverless driver with WebSocket support

**ORM**: Drizzle ORM for type-safe database operations with schema-first approach

**Schema Design** (fully implemented and pushed to database):

1. **projects** table:
   - `id` (serial, primary key)
   - `name` (varchar, not null)
   - `description` (text)
   - `createdAt` (timestamp, default now)

2. **directories** table:
   - `id` (serial, primary key)
   - `projectId` (integer, foreign key to projects)
   - `name` (varchar, not null)
   - `path` (varchar, not null) - Full path from project root
   - `parentId` (integer, nullable, self-referencing for hierarchy)
   - `createdAt` (timestamp, default now)

3. **images** table:
   - `id` (serial, primary key)
   - `directoryId` (integer, foreign key to directories)
   - `originalFilename` (varchar, not null)
   - `storedFilename` (varchar, not null) - Unique filename on disk
   - `filePath` (varchar, not null) - Full path to file
   - `fileSize` (integer)
   - `mimeType` (varchar)
   - `width` (integer, nullable)
   - `height` (integer, nullable)
   - `source` ('upload' | 'url', default 'upload')
   - `sourceUrl` (text, nullable) - Original URL if downloaded
   - `processingStatus` ('not_queued' | 'pending' | 'processing' | 'completed' | 'failed')
   - `uploadedAt` (timestamp, default now)

4. **ocr_results** table:
   - `id` (serial, primary key)
   - `imageId` (integer, foreign key to images, unique)
   - `pytesseractText` (text) - PSM 6 config result
   - `pytesseractConfidence` (integer) - 0-100 confidence score
   - `easyocrText` (text) - PSM 3 config result (named for compatibility)
   - `easyocrConfidence` (integer) - 0-100 confidence score
   - `consensusText` (text) - Higher confidence result chosen as consensus
   - `boundingBoxes` (jsonb) - Array of {text, x, y, width, height, confidence}
   - `processedAt` (timestamp, default now)

5. **processing_queue** table:
   - `id` (serial, primary key)
   - `imageId` (integer, foreign key to images, unique)
   - `status` ('pending' | 'processing' | 'completed' | 'failed')
   - `priority` (integer, default 0) - Higher priority processed first
   - `attempts` (integer, default 0)
   - `lastAttemptAt` (timestamp, nullable)
   - `error` (text, nullable)
   - `createdAt` (timestamp, default now)

**Validation**: Zod schemas derived from Drizzle table definitions for type-safe validation

**Migration**: Using `drizzle-kit` for database migrations and schema management

### OCR Processing System

**Implementation**: Python-based OCR service using pytesseract with dual-pass verification

**Dual Verification Strategy**:
- Pass 1: Tesseract PSM 6 (uniform block of text) - Good for documents
- Pass 2: Tesseract PSM 3 (fully automatic page segmentation) - Good for mixed layouts
- Consensus: Higher confidence result selected as final output
- Both results stored for comparison and debugging

**Bounding Box Extraction**:
- Word-level bounding boxes extracted for interactive text highlighting
- Stored as JSONB in database: `[{text, x, y, width, height, confidence}, ...]`
- Used in frontend for hover-to-highlight functionality

**Asynchronous Processing**:
- Images queued immediately upon upload/download
- Background processor polls queue and processes batch jobs
- Status tracking: not_queued → pending → processing → completed/failed
- Retry logic with attempt counter and error logging
- Priority-based processing (higher priority first)

**Python OCR Service** (`server/ocr-service.py`):
- Standalone Python script called via Node.js child_process
- Receives image path as command-line argument
- Returns JSON with dual OCR results, consensus, and bounding boxes
- Error handling and logging

**Note**: EasyOCR originally planned but skipped due to NixOS dependency conflicts. Using two pytesseract configurations instead for dual verification.

### File Storage Strategy

**Implementation**: Local filesystem storage in `uploads/` directory

**Directory Structure**:
```
uploads/
  project_1/
    dir_1/
      image1.jpg
      image2.png
    dir_2/
      scan001.tiff
  project_2/
    dir_3/
      document.pdf
```

**File Upload**:
- Multer middleware handling multipart/form-data
- 17MB limit per file (configurable)
- Supported formats: JPG, JPEG, PNG, TIFF, TIF, PDF
- Automatic format validation via MIME type
- Unique filename generation to prevent conflicts
- Batch upload support (up to 20 files simultaneously)

**URL Download**:
- Download images from remote URLs (e.g., archives.gov)
- Metadata extraction from URL
- Automatic queuing for OCR processing
- Source URL stored for reference

**Database Integration**:
- File paths stored in `images` table
- Metadata tracked: size, MIME type, dimensions
- Processing status linked to queue system

**Future Enhancement**: Dropbox integration deferred per user preference. User dismissed Replit Dropbox connector setup. Can be added later via connector:ccfg_dropbox_01K49RKF1K3H5YEV4A3QXW28XT

### External Dependencies

**UI Framework**: 
- Radix UI primitives for accessible component foundations
- shadcn/ui component library for pre-built components
- Tailwind CSS with custom Matrix theme
- Lucide React icons for UI elements

**OCR Processing**:
- pytesseract (Python wrapper for Tesseract OCR)
- Tesseract OCR engine (system-level dependency)
- Pillow (Python image processing)

**Form Handling**:
- React Hook Form with Zod resolver
- Integration with shadcn/ui form components

**Development Tools**:
- TypeScript for type safety
- Vite for fast development builds
- esbuild for production bundling
- Drizzle Kit for database migrations

**Utilities**:
- date-fns for date manipulation
- clsx and tailwind-merge for conditional classes
- nanoid for unique ID generation
- wouter for lightweight routing
- axios for HTTP requests
- multer for file uploads

## Real Test Data Available

The `examples/World War I Rosters` folder contains real scanned historical documents (1920s roster images) that can be used for testing the OCR functionality.

## Known Limitations & Future Enhancements

1. **OCR Engine**: Currently using pytesseract only (dual-pass with different configs). EasyOCR integration attempted but skipped due to NixOS dependency conflicts.

2. **Authentication**: User schema exists but authentication system not yet implemented. All API routes currently public.

3. **File Storage**: Local filesystem only. Cloud storage (Dropbox, S3) can be added later.

4. **Image Preview**: Frontend components assume image files are accessible via `/api/images/:id/file` route (implemented).

5. **Batch Processing**: Queue processor polls database. Consider moving to event-driven architecture (Redis pub/sub) for better scalability.

6. **PDF Support**: PDF upload supported but OCR extraction may need additional handling for multi-page PDFs.

## Development Commands

- `npm run dev` - Start development server (frontend + backend)
- `npm run build` - Build for production
- `npm run db:push` - Push database schema changes
- `npm run db:studio` - Open Drizzle Studio (database GUI)

## API Testing

Use the following example requests to test the API:

```bash
# Create a project
curl -X POST http://localhost:5000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project","description":"Testing OCR"}'

# Create a directory
curl -X POST http://localhost:5000/api/directories \
  -H "Content-Type: application/json" \
  -d '{"projectId":1,"name":"Documents","path":"/Documents","parentId":null}'

# Upload an image
curl -X POST http://localhost:5000/api/directories/1/upload \
  -F "images=@path/to/image.jpg"

# Process an image
curl -X POST http://localhost:5000/api/images/1/process

# Search text
curl "http://localhost:5000/api/search?q=historical"
```

## Implementation Notes

- All frontend pages now use real API data (no mock data)
- Query keys use template strings for correct data fetching
- Toast notifications for user feedback on all mutations
- Loading states on all queries and mutations
- Error handling with user-friendly messages
- Responsive design with mobile support
- Dark mode with Matrix theme colors
- Accessibility features via Radix UI primitives
