# OCRSenseiWeb - Dual Verification OCR System

## Overview
OCRSenseiWeb is a Matrix-themed OCR application designed to extract text from scanned images using a dual verification process. Its primary purpose is to provide an efficient and visually distinct tool for managing and extracting information from digitized documents, allowing users to organize projects, upload and process images, track OCR results with asynchronous batch processing, and search through extracted text. The application aims to offer a robust solution for document information retrieval with a unique aesthetic.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with React and TypeScript using Vite, leveraging `shadcn/ui` components (Radix UI) and styled with Tailwind CSS, adhering to a custom Matrix terminal theme. It features dark backgrounds, neon green text, monospace fonts, ASCII art, and animated cursors. Wouter handles client-side routing with slug-based URLs. State management uses React Query for server state and React hooks for local component state. Key features include a dashboard, project/directory management, OCR-highlighted image views, and full-text search.

### Backend
The backend is an Express.js application with TypeScript, providing a RESTful API for project, directory, image, and search functionalities. It handles file uploads via Multer (17MB limit, PNG and JPG formats only) and supports URL-based image downloads.

### Data Storage
The application utilizes a PostgreSQL database, accessed via Neon's serverless driver and managed with Drizzle ORM. The schema includes tables for `projects`, `directories`, `images`, `ocr_results`, `processing_queue`, `monitored_searches`, and `settings`. Images are stored as binary data (`bytea`) directly in PostgreSQL.

### OCR Processing
OCR processing is managed by a Python-based service using `pytesseract` (Tesseract 5.3.4) with LSTM neural networks and a configurable dual-pass verification strategy. Images are preprocessed using OpenCV (grayscale, upscaling, denoising, binarization, auto-deskewing) before OCR analysis. The system uses two different configurable Tesseract PSM modes (default: PSM 6 and PSM 3) that run concurrently via ThreadPoolExecutor, selecting the result with higher confidence. Word-level bounding boxes are extracted for frontend highlighting.

**Performance Optimizations:**
- **Smart Image Resizing**: Automatically resizes large images (>2000px width or >3000px height) during OCR processing, reducing processing time by 50-70% while maintaining quality. Uses high-quality Lanczos resampling and maintains aspect ratio. Images are uploaded full-size and resized only during processing.
- **Concurrent Tesseract Passes**: Dual PSM configurations execute in parallel, reducing processing time.
- **Preprocessing Cache**: MD5-hashed cache stores preprocessed images to eliminate redundant OpenCV operations.
- **Worker Pool**: Configurable concurrent workers (default: 4) process multiple images simultaneously with atomic queue locking to prevent race conditions.
- **Performance Presets**: Three optimization levels (Fast/Balanced/Accurate) balance speed and accuracy. Default: Fast.
- **Batch Processing**: A single API endpoint processes up to 100 images atomically.
All OCR parameters are user-configurable via the Settings page and persist to the database. Processing is asynchronous, with images queued and processed by background workers.

### System Enhancements
- **Shareable URLs:** Human-readable slug-based URLs are implemented for all resources, auto-generated from names and guaranteed unique.
- **Search:** Features fuzzy matching using PostgreSQL's pg_trgm extension, with configurable character variation tolerance. Results are ordered by exact matches, then fuzzy matches by similarity score, and then by OCR confidence.
- **Settings:** Configurable fuzzy search behavior and comprehensive OCR processing options (engine mode, PSM configurations, preprocessing toggles, performance presets, worker count, preprocessing cache). All settings persist to the database.
- **Project Management:** Supports renaming and deleting projects, directories, and images, with cascade deletion. Multi-level subdirectories are supported, allowing unlimited nesting.
- **Monitoring:** Allows monitoring specific search terms, tracking result counts, and quickly re-running searches.

## External Dependencies
*   **UI Frameworks**: Radix UI, shadcn/ui, Tailwind CSS
*   **Icons**: Lucide React
*   **OCR**: pytesseract (Python), Tesseract OCR engine, Pillow (Python), OpenCV (Python)
*   **Frontend**: React, TypeScript, Vite
*   **Backend**: Express.js, Node.js
*   **Database**: PostgreSQL (Neon) with pg_trgm extension, Drizzle ORM
*   **State Management**: React Query
*   **Routing**: Wouter
*   **Form Handling**: React Hook Form, Zod
*   **File Uploads**: Multer
*   **HTTP Client**: Axios