# OCRSenseiWeb

> A Matrix-themed OCR application with dual verification for extracting text from scanned images

OCRSenseiWeb is a powerful web-based OCR (Optical Character Recognition) application that extracts text from scanned images using a dual-pass verification strategy. The application features a distinctive Matrix/terminal aesthetic with bold ASCII art and offers advanced fuzzy search capabilities.

![Dashboard Light](attached_assets/screens/ocr-system-dashboard-light.png)

## ✨ Features

### Core Functionality
- **Dual OCR Verification**: Processes images using two Tesseract PSM configurations (PSM 6 and PSM 3) and selects the result with higher confidence
- **Project Organization**: Organize images into projects with nested subdirectories
- **Asynchronous Processing**: Background queue-based OCR processing with real-time status tracking
- **Word-Level Highlighting**: Interactive image viewer with clickable text regions
- **Full-Text Search**: Advanced search with configurable fuzzy matching (1-3 character variations)
- **Search Monitoring**: Track specific search terms and get notified when new results appear

### User Experience
- **Matrix Terminal Theme**: Distinctive dark aesthetic with neon green accents and bold box-drawing ASCII art
- **Responsive Design**: Fully responsive interface that works on desktop and mobile
- **Real-Time Updates**: Live processing status and search results
- **Image Management**: Upload, rename, delete, and organize images with ease

## 📸 Screenshots

### System Dashboard
Switch between light and dark modes with cohesive Matrix terminal theme.

![Dashboard Dark](attached_assets/screens/ocr-system-dashboard-dark.png)

### Project Management
Organize images into projects with 23 unique ASCII art variations for visual distinction.

![Projects](attached_assets/screens/ocr-projects.png)

### Project Detail View
Navigate through directories and manage images within each project.

![Project Detail](attached_assets/screens/ocr-project-detail.png)

### Dual OCR Verification Results
View side-by-side comparison of OCR results with interactive text highlighting.

![OCR Results](attached_assets/screens/ocr-dual-verif.png)

### Advanced Search
Fuzzy search across all OCR-processed text with configurable tolerance.

![Search](attached_assets/screens/ocr-search.png)

### Settings
Configure fuzzy search behavior and application preferences.

![Settings](attached_assets/screens/ocr-system-settings.png)

## 🛠️ Technology Stack

### Frontend
- **React** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **shadcn/ui** components (Radix UI)
- **React Query** for server state management
- **Wouter** for client-side routing

### Backend
- **Node.js** with Express
- **TypeScript**
- **PostgreSQL** (Neon serverless) with pg_trgm extension for fuzzy search
- **Drizzle ORM** for type-safe database access
- **Multer** for file uploads

### OCR Processing
- **Python** with pytesseract
- **Tesseract OCR** engine
- **Pillow** for image processing

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Python 3.x
- Tesseract OCR engine

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/areveur51/OCRSenseiWeb.git
cd OCRSenseiWeb
```

2. **Install dependencies**
```bash
npm install
```

3. **Install Python dependencies**
```bash
pip install pytesseract pillow
```

4. **Set up environment variables**

Create a `.env` file or configure the following environment variables:
```
DATABASE_URL=postgresql://user:password@host:port/database
SESSION_SECRET=your-secret-key
```

5. **Set up the database**
```bash
npm run db:push
```

6. **Start the development server**
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## 📖 Usage

### Creating a Project
1. Navigate to the Dashboard
2. Click "New Project"
3. Enter a project name and description
4. Click "Create"

### Uploading Images
1. Open a project
2. Click "Upload Images"
3. Drag and drop images or click to browse
4. Supported formats: JPG, PNG, PDF (up to 17MB per file)

### Processing Images
1. After uploading, images are automatically queued for processing
2. Click "Process Pending" to start OCR extraction
3. Processing status is shown in real-time
4. Click on any image to view results and highlighted text regions

### Searching Text
1. Navigate to "Search" in the sidebar
2. Enter your search query
3. Configure fuzzy search tolerance in Settings (1-3 character variations)
4. Click "Monitor this search" to track search terms over time

### Organizing with Directories
1. Open a project
2. Click "New Directory" to create subdirectories
3. Upload images to specific directories
4. Navigate through the directory tree in the sidebar

## 🎨 Design Philosophy

OCRSenseiWeb embraces a Matrix/terminal aesthetic inspired by htop and classic command-line interfaces:
- **Bold Box-Drawing Characters**: Uses double-line Unicode characters (╔═╗╚║╝) for ASCII art
- **Terminal Color Scheme**: Dark backgrounds with neon green highlights
- **Monospace Fonts**: System monospace fonts for an authentic terminal feel
- **Metric Style ASCII Art**: 23 unique icon variations maintaining cohesive 3-4 line compact design

## 🔧 Configuration

### Fuzzy Search Settings
Navigate to Settings to configure fuzzy search behavior:
- **1 character variation**: Strict matching (0.6 similarity threshold)
- **2 character variation**: Balanced matching (0.3 similarity threshold, default)
- **3 character variation**: Loose matching (0.2 similarity threshold)

## 📁 Project Structure

```
OCRSenseiWeb/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   └── lib/         # Utilities and helpers
├── server/              # Express backend
│   ├── routes.ts        # API routes
│   ├── storage.ts       # Database access layer
│   └── ocr.ts           # OCR processing logic
├── shared/              # Shared types and schemas
│   └── schema.ts        # Database schema and types
├── python/              # Python OCR service
│   └── ocr_processor.py # Pytesseract integration
└── design_guidelines.md # UI/UX design guidelines
```

## 🗄️ Database Schema

The application uses PostgreSQL with the following main tables:
- `projects` - Project containers
- `directories` - Subdirectory organization within projects
- `images` - Image metadata and binary data (bytea)
- `ocr_results` - OCR extraction results with word-level bounding boxes
- `processing_queue` - Asynchronous job queue
- `monitored_searches` - Saved search queries with tracking
- `settings` - Application configuration (fuzzy search tolerance, etc.)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) for the OCR engine
- [shadcn/ui](https://ui.shadcn.com/) for the component library
- The Matrix for aesthetic inspiration

## 📧 Contact

- GitHub: [@areveur51](https://github.com/areveur51)
- Repository: [OCRSenseiWeb](https://github.com/areveur51/OCRSenseiWeb)

---

**Built with ❤️ for efficient document processing**
