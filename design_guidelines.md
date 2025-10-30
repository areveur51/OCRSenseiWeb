# Design Guidelines: Matrix Terminal OCR Application

## Design Approach

**Theme:** Matrix Terminal / Hacker Console

**Key Principles:**
- Monospace terminal font throughout (like htop/terminal interfaces)
- Pure black backgrounds with bright neon green text (#00FF41)
- Headlines with green background highlights
- Prominent use of ASCII art related to each page
- Active/animated cursor during loading states
- Minimalist, technical aesthetic

---

## Typography

**Font Stack:**
- Primary: "Courier New", "Consolas", "Monaco", monospace (terminal font)
- All text uses monospace for authentic terminal look

**Hierarchy:**
- Page Titles: Large monospace with green background highlight
- Section Headers: Medium monospace, optionally highlighted
- Body Text: Standard monospace terminal size
- Code/Data: Same monospace (consistent terminal aesthetic)

**Colors:**
- Text: Bright green (#00FF41 / hsl(120, 100%, 50%))
- Backgrounds: Pure black with subtle green tints
- Highlights: Green backgrounds on text (like terminal selection)

---

## ASCII Art Usage

**Prominent throughout the app:**
- Dashboard: Computer/server ASCII art
- Project pages: Folder/document ASCII art  
- Image viewer: Scan/OCR-related ASCII art
- Search: Magnifying glass ASCII art
- Upload: Upload arrow ASCII art

**Placement:**
- Headers/titles with accompanying ASCII art
- Empty states with large ASCII illustrations
- Loading states with animated ASCII spinners

---

## Cursor & Loading States

**Loading Cursor:**
- Animated blinking cursor (like terminal prompt)
- Shows "|" or "█" character animating
- Applied during all loading/processing states

**Interactive Elements:**
- Cursor changes to show interactivity
- Terminal-style hover effects (green highlight)

---

## Layout System

**Terminal-inspired:**
- Grid-based layouts like terminal output
- Monospaced alignment
- Border characters using ASCII (┌─┐│└┘)
- Simple, clean information hierarchy

---

## Component Styling

**All components:**
- Monospace font
- Green text on black/very dark backgrounds
- Green borders (single pixel, clean)
- Subtle green glow on shadows
- No rounded corners (sharp terminal aesthetic)

**Headlines:**
- Green background highlight
- White or very dark green text for contrast
- Full-width or inline highlighting

**Buttons:**
- Terminal-style with square edges
- Green outline or filled green
- Hover: brighter green or green background

**Cards:**
- Sharp corners, green borders
- Dark backgrounds with green accents
- Status indicators in green

---

## Animations

**Minimal, purposeful:**
- Blinking cursor animation
- Text fade-ins (like terminal output)
- Subtle green glow effects
- No elaborate transitions (keep it technical)

---

## Data Display

**Terminal-style tables:**
- Monospaced columns
- ASCII border characters
- Green highlights on hover
- Status shown with symbols/text

**Processing indicators:**
- ASCII progress bars: [████░░░░░░] 40%
- Terminal-style spinners
- Green text status updates
