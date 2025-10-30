# Design Guidelines: OCR Text Extraction Application

## Design Approach

**Selected Approach:** Design System (Linear + Notion hybrid)

**Justification:** This is a utility-focused productivity tool requiring information density, processing efficiency, and data management. We'll draw from Linear's clean efficiency and Notion's hierarchical content organization.

**Key Principles:**
- Efficiency over decoration: Every element serves a functional purpose
- Clear information hierarchy for multi-level data (projects → directories → images)
- Professional data-processing aesthetic with breathing room
- Scannable interfaces for quick status comprehension

---

## Typography

**Font Stack:**
- Primary: Inter (via Google Fonts CDN)
- Monospace: JetBrains Mono (for OCR confidence scores, metadata)

**Hierarchy:**
- Page Titles: text-2xl font-semibold tracking-tight
- Section Headers: text-lg font-semibold
- Card Titles: text-base font-medium
- Body Text: text-sm font-normal
- Metadata/Labels: text-xs font-medium uppercase tracking-wide
- OCR Text Display: text-sm font-mono leading-relaxed

---

## Layout System

**Spacing Units:** Tailwind units of 2, 4, 6, 8, and 16 (as in p-2, gap-4, mt-6, mb-8, py-16)

**Container Structure:**
- Dashboard: Two-column layout with fixed 64px sidebar navigation (w-64) and fluid main content area
- Content max-width: max-w-7xl mx-auto for main content containers
- Card grids: gap-6 for comfortable separation
- Form spacing: space-y-4 for stacked form elements

**Page Layouts:**

1. **Dashboard View:**
   - Sidebar: Fixed 64px width, full height, project list with nested directories
   - Main: Stats cards grid (3-column on lg, 2-column on md, 1-column on mobile)
   - Recent activity feed below stats

2. **Project Detail:**
   - Breadcrumb navigation (Home → Project → Directory)
   - Action toolbar with upload, process, search buttons
   - Image grid with processing status badges (4-column on xl, 3-column on lg, 2-column on md)

3. **Image Viewer:**
   - Split view: Image canvas (60% width) + extracted text panel (40% width)
   - Overlay mode with text regions highlighted on hover
   - Bottom toolbar with zoom controls, consensus comparison view

4. **Search Results:**
   - Full-width search bar with filters
   - Results as cards showing image thumbnail, matched text snippet with highlighting, metadata

---

## Component Library

### Navigation
- **Sidebar:** Collapsible project tree with expand/collapse icons (Heroicons chevron-right/chevron-down), indentation of pl-4 per level
- **Breadcrumb:** Horizontal chain with slash separators, interactive links with hover states
- **Top Bar:** Fixed height of h-16, contains search, user menu, notification badge

### Core UI Elements

**Cards:**
- Base: Rounded-lg with subtle border, p-6 padding
- Project Card: Includes thumbnail grid preview (2x2), project name, item count, last updated
- Image Card: Thumbnail, filename, processing status badge, OCR confidence percentage, click to view

**Buttons:**
- Primary: Medium size (px-4 py-2), rounded-md, font-medium
- Secondary: Same dimensions with outline treatment
- Icon buttons: Square (w-10 h-10), rounded-md, centered icon
- Upload button: Larger prominence (px-6 py-3), with icon prefix

**Status Badges:**
- Small pills: px-2.5 py-0.5, text-xs, rounded-full
- States: Pending, Processing, Completed, Error
- Position: Top-right corner of image cards with absolute positioning

### Forms & Inputs

**Text Inputs:**
- Standard height: h-10
- Padding: px-3
- Border radius: rounded-md
- Label spacing: mb-2 above input

**Upload Zone:**
- Dashed border: border-2 border-dashed
- Large drop area: min-h-48
- Centered icon and text with vertical spacing (space-y-4)
- File type and size limit text below

**Search Bar:**
- Height: h-12 for prominence
- Icon prefix with pl-10 for input padding
- Dropdown filters attached to right side

### Data Display

**OCR Results Table:**
- Striped rows with hover states
- Columns: Thumbnail (w-16), Filename, Method 1 Result, Method 2 Result, Consensus, Confidence, Actions
- Sticky header for long lists
- Text truncation with hover tooltip for long content

**Processing Progress:**
- Linear progress bars: h-2, rounded-full
- Percentage text overlay or adjacent
- Batch progress showing "45 of 150 images processed"

**Image Grid:**
- Masonry-style grid with consistent gap-6
- Image cards with aspect ratio maintained (aspect-w-4 aspect-h-3)
- Lazy loading implementation for thousands of images

### Interactive Viewer

**Image Canvas:**
- Zoomable with controls (zoom-in, zoom-out, fit-to-screen, actual-size)
- Pan functionality for zoomed images
- Text overlay rectangles with semi-transparent background (blur backdrop)

**Text Highlight Interaction:**
- On hover over extracted text in side panel: corresponding region highlights on image
- On hover over image region: corresponding text highlights in panel
- Smooth transition (transition-all duration-200)

**Consensus Comparison:**
- Side-by-side view of pytesseract vs EasyOCR results
- Differences highlighted with distinct visual treatment
- Confidence scores displayed as percentage bars

### Overlays & Modals

**Project Creation Modal:**
- Centered overlay with max-w-md
- Form with name input, description textarea (h-24)
- Action buttons (Cancel, Create) aligned right with gap-3

**Bulk Actions Panel:**
- Slide-in from bottom with h-20
- Shows selected count, batch action buttons
- Dismiss on outside click

---

## Animations

**Minimal, Performance-Focused:**
- Sidebar collapse/expand: transition-transform duration-200
- Card hover lift: subtle translate-y-[-2px] with transition
- Status badge changes: fade transition (transition-opacity)
- No scroll animations, parallax, or decorative motion

---

## Images

**Usage:**
- No hero image (this is a utility dashboard, not marketing)
- Thumbnail previews throughout (64x64 for sidebar, 256x256 for cards, full-size in viewer)
- Empty state illustrations for zero-data scenarios (e.g., "No projects yet" with simple icon graphic)
- Processing animation: Simple spinner icon during OCR processing

---

## Grid & Responsive Behavior

**Breakpoints:**
- Mobile (base): Single column, stacked sidebar (drawer menu)
- Tablet (md): 2-column grids, visible sidebar
- Desktop (lg): 3-4 column grids, full layout
- XL (xl): Maximum density with 4-column image grids

**Touch Considerations:**
- Larger tap targets on mobile (min h-12 for buttons)
- Swipe gestures for image navigation in viewer
- Bottom sheet drawer for mobile filters