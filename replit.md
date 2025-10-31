# OCRSenseiWeb - Dual Verification OCR System

## Overview
OCRSenseiWeb is a Matrix-themed OCR application that extracts text from scanned images using a dual verification process. It enables users to organize projects into subdirectories, upload and process images, track OCR results with asynchronous batch processing, and search through extracted text. The application's core purpose is to provide an efficient and visually distinct tool for managing and extracting information from digitized documents.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with React and TypeScript using Vite, leveraging `shadcn/ui` components (Radix UI) and styled with Tailwind CSS, adhering to a custom Matrix terminal theme. It features dark backgrounds, neon green text, monospace fonts, ASCII art, and animated cursors. Wouter handles client-side routing, and state management uses React Query for server state and React hooks for local component state. Key features include a dashboard, project/directory management, OCR-highlighted image views, and full-text search.

### Backend
The backend is an Express.js application with TypeScript, providing a RESTful API for project, directory, image, and search functionalities. It handles file uploads via Multer (17MB limit, various image/PDF formats) and supports URL-based image downloads.

### Data Storage
The application utilizes a PostgreSQL database, accessed via Neon's serverless driver and managed with Drizzle ORM. The schema includes tables for `projects`, `directories`, `images`, `ocr_results`, `processing_queue`, `monitored_searches`, and `settings`. Zod schemas ensure type-safe validation. Images are stored as binary data (`bytea`) directly in PostgreSQL.

### OCR Processing
OCR processing is managed by a Python-based service using `pytesseract` with a dual-pass verification strategy. It employs two different Tesseract configurations (PSM 6 and PSM 3), selecting the result with higher confidence. Word-level bounding boxes are extracted for frontend highlighting. Processing is asynchronous, with images queued and processed in batches by a background worker.

### File Storage Strategy
Images are stored as binary data (bytea) in PostgreSQL within the `imageData` column of the `images` table, providing data integrity and simplified backups. The system maintains filesystem fallback for legacy images.

### System Enhancements
- **Search:** Features fuzzy matching using PostgreSQL pg_trgm extension with word_similarity function. Character variation tolerance is configurable (1-3 letter differences). Results are ordered by: exact matches first, then fuzzy matches by similarity score, then by OCR confidence. Search queries are case-insensitive and properly encoded.
- **Settings:** Configurable fuzzy search behavior via dedicated Settings page. Users can select fuzzy search variation tolerance (1, 2, or 3 character differences, default: 2). Settings are stored in a singleton database table and dynamically adjust similarity thresholds:
  - 1 character: 0.6 threshold (strict matching)
  - 2 characters: 0.3 threshold (balanced, default)
  - 3 characters: 0.2 threshold (loose matching)
- **Performance:** Database indexes are used for faster queries, and large binary fields like `imageData` are excluded from list queries. Frontend caching is optimized with React Query (staleTime: Infinity, gcTime: 30 minutes).
- **Monitoring:** A feature allows monitoring specific search terms, tracking and displaying their result counts, and quickly re-running searches. Monitored searches also use fuzzy matching.
- **Management:** Comprehensive features for renaming and deleting directories and images, including cascade deletion for directories.

## External Dependencies
*   **UI Frameworks**: Radix UI, shadcn/ui, Tailwind CSS
*   **Icons**: Lucide React
*   **OCR**: pytesseract (Python), Tesseract OCR engine, Pillow (Python)
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