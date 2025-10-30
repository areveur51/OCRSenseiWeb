# OCR Text Extractor - Dual Verification System

## Overview

This Matrix-themed OCR application extracts text from scanned images using dual verification. It allows users to organize projects into subdirectories, upload and process images, track OCR results with asynchronous batch processing, and search through extracted text. The application aims to provide an efficient and visually distinct tool for managing and extracting information from digitized documents.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React and TypeScript using Vite. It leverages `shadcn/ui` components (built on Radix UI) styled with Tailwind CSS, following a custom Matrix terminal theme. The design features dark backgrounds, neon green text (with softer tones for readability), monospace fonts, ASCII art, and animated cursors. Client-side routing is handled by Wouter. State management utilizes React Query for server state and React hooks for local component state. Key features include a dashboard, project/directory management, detailed image view with OCR highlighting, and full-text search.

### Backend Architecture

The backend is an Express.js application with TypeScript. It provides a RESTful API for project, directory, image, and search functionalities. File uploads are handled by Multer, supporting a 17MB limit and various image/PDF formats. URL-based image downloads are also supported. Request/response handling includes JSON parsing, request logging, CORS, and credentials management.

### Data Storage Solutions

The application uses a PostgreSQL database, accessed via Neon's serverless driver and managed with Drizzle ORM. The schema includes tables for `projects`, `directories`, `images`, `ocr_results`, and `processing_queue`. Zod schemas ensure type-safe validation.

### OCR Processing System

OCR processing is handled by a Python-based service utilizing `pytesseract` with a dual-pass verification strategy. Two different Tesseract configurations (PSM 6 and PSM 3) are used, and the result with higher confidence is selected as the consensus. Word-level bounding boxes are extracted for interactive text highlighting on the frontend. Processing is asynchronous, with images queued and processed in batches by a background worker that tracks status and handles retries.

### File Storage Strategy

**Current (Database Storage):** Images are stored as binary data (bytea) in PostgreSQL within the `imageData` column of the `images` table. This provides better data integrity, simplifies backups, and enables atomic operations. The system maintains filesystem fallback for legacy images during transition.

**Legacy (Filesystem Storage):** Previously, files were stored on the local filesystem within an `uploads/` directory, organized into human-readable project and directory subfolders (e.g., `ProjectName_idX/DirectoryName_idY/`). The `filePath` column maintains backward compatibility.

## External Dependencies

*   **UI Frameworks**: Radix UI, shadcn/ui, Tailwind CSS
*   **Icons**: Lucide React
*   **OCR**: pytesseract (Python wrapper), Tesseract OCR engine (system-level), Pillow (Python image processing)
*   **Frontend Framework**: React, TypeScript, Vite
*   **Backend Framework**: Express.js, Node.js
*   **Database**: PostgreSQL (via Neon serverless driver), Drizzle ORM
*   **State Management**: React Query
*   **Routing**: Wouter
*   **Form Handling**: React Hook Form, Zod
*   **File Uploads**: Multer
*   **HTTP Client**: Axios
*   **Utilities**: date-fns, clsx, tailwind-merge, nanoid

## Recent Updates (October 30, 2025)

### Search Results Ordering
Search results are now ordered by OCR confidence score from highest to lowest:
- Uses SQL CASE statement to select the correct confidence value based on `consensusSource` field
- Maps `pytesseract_config1` → `pytesseractConfidence` and `pytesseract_config2` → `easyocrConfidence`
- Results sorted DESC, showing most reliable OCR extractions first
- Example: 69% → 59% → 44% confidence ordering

### Search Query Parameters Fix
Fixed critical bug where search queries were not returning results:
- **Problem**: queryKey with object `{ q: debouncedQuery }` was being serialized as `/api/search/[object Object]` instead of proper query parameters
- **Solution**: Added explicit `queryFn` to construct URL with proper query parameters: `/api/search?q=pedro`
- **Impact**: Search now properly returns results for all queries (e.g., "pedro" correctly returns 2 results)
- Changed queryKey format from `["/api/search", { q: debouncedQuery }]` to `["/api/search", debouncedQuery]` for proper cache invalidation
- Uses `encodeURIComponent()` to properly encode search terms

### Progress Bar Fix
Fixed dual-pass OCR counting issue where progress showed 117% (7 processed / 6 total). Changed `processedImages` query to count distinct images instead of OCR result records, since each image creates 2 results (PSM 6 + PSM 3 configurations).

### Projects Page UX
- Made project cards fully clickable to navigate to project detail page
- Changed title display from `truncate` to `break-words` to show full project names
- Added hover/active elevation effects
- Rename/Delete buttons prevent card click with `stopPropagation()`

### UI Refinements
- Removed redundant subdirectory navigation sidebar from project detail page
- Fixed search to be case-insensitive (changed from `LIKE` to `ILIKE` in PostgreSQL query), allowing searches like "pedro" to match "Pedro", "PEDRO", etc.

### URL Download Enhancement
Added HTML page parsing for URL downloads, enabling downloads from archives.gov and similar sites:
- Installed `cheerio` for HTML parsing
- Implemented `extractImageUrl()` method that:
  - Skips HEAD requests for known HTML pages (archives.gov/id/) to avoid blocking
  - Parses HTML to find download links (e.g., links with "Download" text to S3 buckets)
  - Falls back to HEAD requests for other URLs, with graceful error handling
  - Comprehensive logging for debugging
- Filename handling:
  - Uses actual JPG filename from the resolved image URL (no timestamp prefix)
  - Decodes URL-encoded characters for cleaner filenames
  - Example: `18-1487_US-MO_-26th-CAV--TRP-G-305-Cav--Hq-ca.-1-Jan-1916–31-Dec-1939_00664.jpg`
- Supports archives.gov URLs like `https://catalog.archives.gov/id/150268931?objectPage=837`

### Image Delete Functionality
Added ability to delete images from the system:
- Backend: DELETE /api/images/:id endpoint removes image and associated OCR data
- Frontend: Delete button in image detail view with confirmation dialog
- Automatic cache invalidation to refresh directory image lists
- Navigates back to dashboard after successful deletion

### Database Storage Migration (October 30, 2025)
Successfully migrated from filesystem storage to PostgreSQL database storage for images:

**Schema Changes:**
- Added custom `bytea` type for storing binary image data as Buffer objects
- Added nullable `imageData` column to images table for staged migration
- Made `filePath` nullable for backward compatibility
- Added Buffer validation to `insertImageSchema` using Zod refinement

**Implementation:**
- Upload endpoint stores `file.buffer` directly to database
- URL download endpoint stores downloaded buffer to database
- Image serving endpoint (`/api/images/:id/file`) uses intelligent fallback:
  - Prefers database storage (`imageData`) if available
  - Falls back to filesystem (`filePath`) for legacy images
  - Returns 404 if neither source available
- Proper Content-Type headers based on image format

**Migration Process:**
- Created backfill script (`server/backfill-images.ts`)
- Successfully migrated all 9 existing images from filesystem to database
- No data loss during migration
- Filesystem files retained for fallback during transition

**Filename Handling for URL Downloads:**
- Uses original filename from URL if it has proper extension
- Falls back to timestamp-based naming for URLs without extensions
- Format: `${Date.now()}_${urlFilename || 'download'}.${extension}`
- Ensures all files have proper extensions matching their MIME types

**Benefits:**
- Better data integrity (atomic operations)
- Simplified backup and restore
- No filesystem dependency for new images
- Reduced storage complexity

### Filesystem Removal - Complete Database Migration (October 30, 2025)
Successfully removed all filesystem dependencies after database migration:

**Filesystem Cleanup:**
- Created compressed backup: `uploads_backup_20251030_063706.tar.gz` (7.2MB)
- Archived all 13 migrated images with directory structure preserved
- Deleted uploads/ directory completely from project

**Code Changes:**
- Updated `FileStorageService` methods to be database-only:
  - `saveUploadedFile()`: No filesystem writes, returns metadata + buffer
  - `downloadFromUrl()`: Downloads to memory only, returns buffer
  - `deleteFile()`: Now no-op (no filesystem cleanup needed)
  - `deleteDirectory()`: Now no-op (no filesystem cleanup needed)
- Upload/download routes already correctly persist buffers to `imageData` column
- Image serving maintains intelligent fallback: DB first, filesystem second (for any legacy data)

**Current State:**
- All new uploads go directly to database (no filesystem involvement)
- All URL downloads go directly to database (no filesystem involvement)
- All 13 existing images confirmed in database with `imageData` populated
- Filesystem fallback retained for safety but not used
- Delete operations use database cascade only

**Benefits:**
- Zero filesystem dependencies for operation
- Simplified deployment (no uploads directory needed)
- All data in single PostgreSQL database
- Easier backups and rollbacks

### Directory and Image Management Features (October 30, 2025)
Added comprehensive rename and delete functionality:

**Directory Management:**
- Rename directories via PATCH /api/directories/:id (updates name and path in database)
- Delete directories with cascade deletion of images and OCR data
- Frontend dropdown menu (MoreVertical icon) next to directory titles
- Protection: "root" directory cannot be renamed or deleted
- Confirmation dialogs before destructive operations

**Image/File Management:**
- Rename images via PATCH /api/images/:id (updates filename in database)
- Frontend "Rename" button in image detail view with dialog interface
- Automatic cache invalidation after rename operations
- Works seamlessly with database-only storage (no filesystem operations)

**Loading States:**
- ASCII art loading animation when fetching subdirectory images
- Animated terminal-style loading indicator matching Matrix theme
- Shows before images are displayed in directory view

### Performance Optimizations (October 30, 2025)
Implemented multiple performance improvements for better scalability:

**Database Indexes:**
- Added index on `directories.projectId` for faster project filtering
- Added index on `images.directoryId` for faster directory queries
- Added index on `ocr_results.imageId` for faster OCR lookups
- Added composite index on `processing_queue.imageId` and `processing_queue.status` for queue operations
- All indexes applied via `drizzle-kit push` for safe schema synchronization

**Query Optimizations:**
- Modified `getImagesByDirectory()` to exclude `imageData` (large binary field) from list queries
- Modified `searchText()` to exclude `imageData` from search results
- Optimized `getProjectStats()` using CTE (Common Table Expression) for batched queries
- Reduced database round-trips and network transfer for list operations

**Frontend Caching:**
- React Query configured with `staleTime: Infinity` (data never goes stale)
- Added `gcTime: 30 minutes` to keep unused data in cache longer
- Disabled `refetchOnWindowFocus` to prevent unnecessary refetches
- Optimized cache invalidation strategies for mutations

**Impact:**
- Faster page loads (no large binary transfers in lists)
- Reduced database queries (batch operations with CTEs)
- Better user experience with intelligent caching
- Scalable for larger datasets