# OCRSenseiWeb - Dual Verification OCR System

## Overview
OCRSenseiWeb is a Matrix-themed OCR application that extracts text from scanned images using a dual verification process. It enables users to organize projects into subdirectories, upload and process images, track OCR results with asynchronous batch processing, and search through extracted text. The application's core purpose is to provide an efficient and visually distinct tool for managing and extracting information from digitized documents.

**Version**: 1.0.0  
**License**: MIT  
**Repository**: https://github.com/areveur51/OCRSenseiWeb.git  
**Author**: areveur51

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Updates (October 31, 2025)
- ✅ **Directory Drag & Drop Reordering**: Added ability to reorder directories in sidebar
  - Edit mode toggle (Edit/Done button) in sidebar for each project's directory list
  - Drag handle icon (GripVertical) appears when in edit mode
  - Visual feedback during drag (opacity change, cursor style)
  - Only allows reordering directories at the same level (same parent)
  - Swaps sortOrder values between dragged and target directories
  - Toast notifications for success/error feedback
  - Added sortOrder field to directories schema
- ✅ **Image Pagination**: Added pagination controls for image listings
  - Page size selector with options for 25, 50, or 100 images per page (default: 25)
  - Previous/Next navigation buttons with proper disabled states
  - Shows "Showing X-Y of Z images" with current page and total pages
  - Automatically resets to page 1 when switching directories or changing page size
  - Backend returns paginated response with total count and page information
- ✅ **Image Reprocessing**: Added ability to reprocess already-processed images
  - Reprocess button available on all image detail pages for both processed and unprocessed images
  - Visual feedback with "Queueing..." state and disabled button during API request
  - Prevents duplicate submissions through state management
  - Useful when OCR settings are changed or initial results need improvement
  - Button adapts styling: default variant for "Process Now", outline variant for "Reprocess"
- ✅ **OCR Engine Enhancements**: Implemented configurable OCR preprocessing pipeline
  - Added OpenCV-based image preprocessing with grayscale conversion, upscaling (1.5x), denoising, Otsu binarization, and auto-deskewing
  - Configurable OCR engine mode (OEM 0-3): Legacy, LSTM, Legacy+LSTM, Auto-select
  - Dual PSM (Page Segmentation Mode) configuration for verification passes
  - Master preprocessing toggle with individual controls for upscale, denoise, and deskew
  - Settings UI with comprehensive OCR configuration options
  - All preprocessing enabled by default for optimal accuracy on scanned documents
  - Uses Tesseract 5.3.4 with LSTM neural networks for superior text recognition
  - Settings persist to database and dynamically configure Python OCR service
- ✅ **Directory Creation Enhancement**: Added parent folder selector to directory creation dialog
  - Choose where to create new directories: root level "/" or within any existing directory
  - Allows creating multiple root-level directories (e.g., root_dir_1, root_dir_2 at same level)
  - Enables flexible directory structure organization across all levels
  - Added validation to prevent duplicate directory names at the same parent level (case-insensitive)
  - Validation applies to both creating and renaming directories
  - Frontend shows immediate error feedback; backend ensures data integrity
  - Backend normalizes names (trims whitespace) before validation and persistence
  - Prevents duplicate bypass via leading/trailing whitespace
- ✅ **Project Management**: Added rename and delete functionality for projects
  - Dropdown menu on project detail page (visible at project root) provides rename and delete options
  - Renaming regenerates slug automatically and redirects to new URL
  - Deleting cascades to all directories, images, and OCR results
  - Confirmation dialogs prevent accidental deletions
  - Fixed backend slug generation bug in `updateProject` method
  - Fixed dashboard navigation to use slug-based URLs instead of legacy ID-based URLs
- ✅ **Shareable Human-Readable URLs**: Implemented slug-based URL system for all resources
  - Projects use `/p/:slug` pattern (e.g., `/p/31st-infantry-regiment`)
  - Directories use `/p/:projectSlug/:dirSlug` (e.g., `/p/31st-infantry-regiment/roster-1920`)
  - Images use `/p/:projectSlug/:dirSlug/img/:imageSlug` (e.g., `/p/31st-infantry-regiment/roster-1920/img/page-001`)
  - Slugs auto-generated from names, URL-safe, and guaranteed unique
  - All navigation updated to use slug-based URLs for better shareability
  - Backend maintains both slug-based and ID-based API routes for flexibility
- ✅ **Multi-Level Subdirectories**: Added support for unlimited nested subdirectory levels within projects
  - Subdirectories can now contain subdirectories (e.g., Root > Folder1 > Folder2 > Folder3...)
  - Breadcrumb navigation shows full directory hierarchy
  - Sidebar displays nested tree structure with proper indentation
  - URL routing uses slugs for human-readable, shareable navigation
- ✅ Updated all ASCII art to cohesive metric style (3-4 lines, bold double-line borders)
- ✅ Created 23 unique project icon variations
- ✅ Added comprehensive documentation with screenshots
- ✅ Added MIT License
- ✅ Created CONTRIBUTING.md and deployment guides
- ✅ Prepared repository for open source distribution

## System Architecture

### Frontend
The frontend is built with React and TypeScript using Vite, leveraging `shadcn/ui` components (Radix UI) and styled with Tailwind CSS, adhering to a custom Matrix terminal theme. It features dark backgrounds, neon green text, monospace fonts, ASCII art, and animated cursors. Wouter handles client-side routing with slug-based URLs for human-readable, shareable links. State management uses React Query for server state and React hooks for local component state. Key features include a dashboard, project/directory management, OCR-highlighted image views, and full-text search.

### Backend
The backend is an Express.js application with TypeScript, providing a RESTful API for project, directory, image, and search functionalities. It handles file uploads via Multer (17MB limit, various image/PDF formats) and supports URL-based image downloads.

### Data Storage
The application utilizes a PostgreSQL database, accessed via Neon's serverless driver and managed with Drizzle ORM. The schema includes tables for `projects`, `directories`, `images`, `ocr_results`, `processing_queue`, `monitored_searches`, and `settings`. Each resource (project, directory, image) has both a numeric ID and a unique slug for URL-friendly access. Zod schemas ensure type-safe validation. Images are stored as binary data (`bytea`) directly in PostgreSQL.

### OCR Processing
OCR processing is managed by a Python-based service using `pytesseract` (Tesseract 5.3.4) with LSTM neural networks and a configurable dual-pass verification strategy. Images are preprocessed using OpenCV (grayscale conversion, 1.5x upscaling, median denoising, Otsu binarization, auto-deskewing) before OCR analysis. The system employs two different configurable Tesseract PSM modes (default: PSM 6 and PSM 3), selecting the result with higher confidence. Word-level bounding boxes are extracted for frontend highlighting. All OCR parameters (engine mode, PSM configurations, preprocessing toggles) are user-configurable via the Settings page and persist to the database. Processing is asynchronous, with images queued and processed in batches by a background worker.

### File Storage Strategy
Images are stored as binary data (bytea) in PostgreSQL within the `imageData` column of the `images` table, providing data integrity and simplified backups. The system maintains filesystem fallback for legacy images.

### System Enhancements
- **Shareable URLs:** Human-readable slug-based URLs for all resources. Slugs are auto-generated from entity names, converted to lowercase with hyphens replacing spaces/special characters. Uniqueness is ensured through collision detection. Backend provides both slug-based (`/api/p/:slug`) and ID-based (`/api/projects/:id`) routes for maximum flexibility.
- **Search:** Features fuzzy matching using PostgreSQL pg_trgm extension with word_similarity function. Character variation tolerance is configurable (1-3 letter differences). Results are ordered by: exact matches first, then fuzzy matches by similarity score, then by OCR confidence. Search queries are case-insensitive and properly encoded.
- **Settings:** Configurable fuzzy search behavior and OCR processing via dedicated Settings page. 
  - Fuzzy search: Users can select variation tolerance (1, 2, or 3 character differences, default: 2) which dynamically adjusts similarity thresholds (0.6, 0.3, 0.2 respectively)
  - OCR Engine: Configurable Tesseract OEM mode (0=Legacy, 1=LSTM only [default], 2=Legacy+LSTM, 3=Auto-select)
  - Page Segmentation: Dual PSM configuration for verification passes (Config 1 default: PSM 6, Config 2 default: PSM 3)
  - Preprocessing: Master toggle with individual controls for upscaling (1.5x), denoising (median blur), and auto-deskewing
  - All settings persist to database and dynamically configure OCR processing pipeline
- **Performance:** Database indexes are used for faster queries (including slug indexes for quick lookups), and large binary fields like `imageData` are excluded from list queries. Frontend caching is optimized with React Query (staleTime: Infinity, gcTime: 30 minutes).
- **Monitoring:** A feature allows monitoring specific search terms, tracking and displaying their result counts, and quickly re-running searches. Monitored searches also use fuzzy matching.
- **Management:** Comprehensive features for renaming and deleting directories and images, including cascade deletion for directories. Multi-level subdirectories are supported through the `parentId` field, allowing unlimited nesting (e.g., Root > Archives > 1920s > Legal). Frontend displays nested structure with proper indentation in sidebar and full hierarchy in breadcrumb navigation using slug-based URLs.

## External Dependencies
*   **UI Frameworks**: Radix UI, shadcn/ui, Tailwind CSS
*   **Icons**: Lucide React
*   **OCR**: pytesseract (Python), Tesseract OCR engine, Pillow (Python), OpenCV (Python)
*   **Frontend**: React, TypeScript, Vite
*   **Backend**: Express.js, Node.js
*   **Database**: PostgreSQL (Neon) with pg_trgm extension for fuzzy search, Drizzle ORM
*   **State Management**: React Query
*   **Routing**: Wouter
*   **Form Handling**: React Hook Form, Zod
*   **File Uploads**: Multer
*   **HTTP Client**: Axios
*   **HTML Parsing**: cheerio
*   **Utilities**: date-fns, clsx, tailwind-merge, nanoid