
# 📖 Manga Journal (Manga-Techo | 漫画手账)

**Manga Journal** is a highly interactive, digital scrapbook application designed with a distinct black-and-white manga aesthetic. It simulates the experience of a physical notebook with realistic 3D page-flipping animations, free-form drag-and-drop layout capabilities, and multimedia support.

![Manga Journal Preview](https://placehold.co/800x400/eeeeee/000000?text=Manga+Journal+Preview)

## ✨ Key Features

### 🎨 Authentic Editing Experience
*   **Free-Form Layout**: Drag, resize, and rotate any element (Text, Images, Video, Audio, Shapes) freely on the canvas.
*   **Manga Aesthetics**: Pre-set backgrounds including manga speed lines, halftones (dots), grids, and dark mode.
*   **Rich Media Support**:
    *   **Images & Videos**: Drag and drop or upload.
    *   **Audio**: Custom interactive "Cassette Tape" UI for audio files.
    *   **Shapes & Illustrations**: Built-in drawing tools for geometric shapes (Stars, Circles, Lines, etc.).
*   **Styling Options**: Switch container styles between **Normal** (Dashed), **Polaroid** (Photo frame), and **Tape** (Washi tape effect).

### 🛠️ Powerful Tools
*   **Undo / Redo System**: Full history support to safely experiment with your designs.
*   **Zoom Controls**: Zoom in for detailed work or out for an overview.
*   **Layer Management**: Easily move elements forward or backward in the stack.
*   **Text Editing**: Rich text formatting (Fonts, Size, Bold, Italic, Alignment).

### 📚 Realistic Reading Mode
*   **3D Page Flipping**: CSS 3D transforms create a realistic book-reading experience.
*   **Double-Page Spread**: View your journal as an open book.
*   **Mobile Optimized**: Touch support for dragging and navigation.

## 🛠️ Tech Stack

*   **Core**: [React 19](https://react.dev/)
*   **Language**: TypeScript
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **Icons**: [Lucide React](https://lucide.dev/)
*   **Fonts**: Google Fonts (Patrick Hand, Shippori Mincho, Noto Sans SC)
*   **Build/Runtime**: ES Modules (via `esm.sh` for browser-native imports)

## 🚀 Getting Started

This project is structured to run in a browser environment that supports ES Modules, or it can be easily adapted to a build tool like Vite.

### Prerequisites
*   A modern web browser (Chrome, Edge, Firefox, Safari).
*   A local static server (e.g., `Live Server` in VS Code, `python -m http.server`, or `npx serve`).

### Installation
1.  Clone or download the repository.
2.  Ensure the file structure is maintained:
    ```
    /
    ├── index.html
    ├── index.tsx
    ├── App.tsx
    ├── types.ts
    └── components/
        └── TransformableElement.tsx
    ```

### Running Locally
Simply serve the root directory using a static file server.
*   **VS Code**: Right-click `index.html` -> "Open with Live Server".
*   **Terminal**: Run `npx serve .` inside the folder.

## 📖 Usage Guide

### 1. Navigation
*   **Flip Pages**: Click the `<` or `>` arrows on the sides to flip through the book.
*   **Edit Mode**: Click the **Edit Icon (✏️)** in the top-right corner of any page to start customizing it.

### 2. Editing
*   **Adding Elements**: Use the top ribbon toolbar to add Text, Shapes, or Upload Media (Images/Video/Audio).
*   **Manipulating Elements**:
    *   **Move**: Drag anywhere on an element.
    *   **Rotate**: Drag the handle above the element.
    *   **Resize**: Drag the handle at the bottom-right corner.
    *   **Edit Text**: Double-click any text box to type.
    *   **Lock**: Click the lock icon to prevent accidental changes.
*   **Context Menu**: When an element is selected, buttons appear around it for Deletion, Layering, and Style switching.

### 3. Saving (Note)
*   Currently, the state is held in memory. Refreshing the browser will reset the journal to its initial state (future updates may implement LocalStorage persistence).

## 🔮 Future Roadmap
*   💾 **Data Persistence**: Save/Load journals using LocalStorage or a backend.
*   📤 **Export**: Export spreads as PNG/PDF.
*   📱 **Gestures**: Enhanced pinch-to-zoom and swipe gestures for mobile.

---

*Created for the "Manga Journal" project.*
