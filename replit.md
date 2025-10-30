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

Files are stored on the local filesystem within an `uploads/` directory, organized into human-readable project and directory subfolders (e.g., `ProjectName_idX/DirectoryName_idY/`). This structure ensures unique paths while maintaining readability. The `images` table stores file paths and metadata.

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
  - Checks if URL is already a direct image (via HEAD request)
  - If HTML, parses page to find download links (e.g., links with "Download" text to S3 buckets)
  - Falls back gracefully to original URL on errors
- Filename handling:
  - Uses actual JPG filename from the resolved image URL (no timestamp prefix)
  - Decodes URL-encoded characters for cleaner filenames
  - Example: `18-1487_US-MO_-26th-CAV--TRP-G-305-Cav--Hq-ca.-1-Jan-1916–31-Dec-1939_00664.jpg`
- Supports archives.gov URLs like `https://catalog.archives.gov/id/150268931?objectPage=837`