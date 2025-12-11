export type ElementType = 'text' | 'image' | 'video' | 'sticker';

export interface PageElement {
  id: string;
  type: ElementType;
  content: string; // Text content or URL
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  
  // Style properties
  styleType: 'normal' | 'polaroid' | 'tape';
  fontFamily: 'hand' | 'serif' | 'sans';
  color: string;
  backgroundColor?: string;

  // Typography
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
}

export interface Page {
  id: string;
  background: 'white' | 'grid' | 'dots' | 'dark' | 'manga-lines';
  elements: PageElement[];
}

export interface DragState {
  isDragging: boolean;
  isResizing: boolean;
  isRotating: boolean;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
  initialWidth: number;
  initialHeight: number;
  initialRotation: number;
  handle?: string; // 'se' (southeast) for resize, 'rot' for rotate
}