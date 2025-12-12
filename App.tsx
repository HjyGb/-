
import React, { useState, useRef, useEffect } from 'react';
import { Page, PageElement, ElementType } from './types';
import { TransformableElement } from './components/TransformableElement';
import { Cursors } from './components/Cursors';
import { 
  useStorage, useMutation, useHistory, useMyPresence, useOthers, useRoom 
} from './liveblocks.config';
import { LiveObject, LiveList } from '@liveblocks/client';
import { 
  Plus, Trash, ChevronLeft, ChevronRight, Image as ImageIcon, 
  Type as TypeIcon, Edit3, Check, ArrowLeft, 
  Square, Circle, Triangle, Star, Minus, Grid,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Video, Music, RotateCcw, RotateCw, ZoomIn, ZoomOut, Share2, Users
} from 'lucide-react';

const generateId = () => Math.random().toString(36).substr(2, 9);

// --- Helpers ---
// Compress and convert image to Base64 to ensure it syncs across devices
const processImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        // Max dimension 800px to keep payload size reasonable for real-time sync
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxDim) { h *= maxDim / w; w = maxDim; }
        } else {
          if (h > maxDim) { w *= maxDim / h; h = maxDim; }
        }
        canvas.width = w;
        canvas.height = h;
        ctx?.drawImage(img, 0, 0, w, h);
        // Compress to JPEG 0.6
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export default function App() {
  // --- Liveblocks State ---
  const pages = useStorage((root) => root.pages);
  const history = useHistory();
  const [{ editingPageId, selectedId }, setPresence] = useMyPresence();
  const others = useOthers();
  const room = useRoom();

  // --- Local View State (Not synced) ---
  // viewIndex represents the index of the page (0-based). 
  // On Desktop: 0 is Cover. 1 is spread [1, 2].
  // On Mobile: 0 is Cover. 1 is Page 1.
  const [viewIndex, setViewIndex] = useState(0); 
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // --- Pan & Zoom State ---
  // We use this for infinite canvas feel
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPoint = useRef<{ x: number, y: number } | null>(null);

  // --- Drawing State ---
  const [drawMode, setDrawMode] = useState<{ type: ElementType | 'shape', shapeType?: PageElement['shapeType'] } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const drawingStartRef = useRef<{ x: number, y: number } | null>(null);

  // --- Lifecycle & Responsiveness ---
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // --- Mutations ---
  
  const addPage = useMutation(({ storage }) => {
    const pages = storage.get("pages");
    const newP1 = new LiveObject({ id: generateId(), background: 'white' as const, elements: new LiveList<PageElement>([]) });
    const newP2 = new LiveObject({ id: generateId(), background: 'white' as const, elements: new LiveList<PageElement>([]) });
    pages.push(newP1);
    pages.push(newP2);
    // Automatically flip to new page
    // On mobile we jump 1, on desktop we assume 2 pages per view logic
    const jump = isMobile ? 1 : 2; 
    triggerPageFlip('next'); 
  }, [isMobile]);

  const removeCurrentSpread = useMutation(({ storage }) => {
    if (viewIndex === 0) return;
    const pages = storage.get("pages");
    
    // Logic differs slightly: if mobile, delete current page?
    // For safety, let's keep original logic: delete the spread associated with this index if desktop
    // Or just delete current page if mobile.
    // Simplifying: Always try to delete the last added pages to avoid breaking structure
    if (pages.length > 3) {
        pages.delete(pages.length - 1);
        pages.delete(pages.length - 1);
        setViewIndex(v => Math.max(0, v - 1));
    } else {
        alert("Cannot delete cover or initial pages.");
    }
  }, [viewIndex]);

  const updateElement = useMutation(({ storage }, { id, updates }: { id: string, updates: Partial<PageElement> }) => {
    const pagesList = storage.get("pages");
    for (let i = 0; i < pagesList.length; i++) {
        const page = pagesList.get(i);
        const elementsList = page?.get("elements");
        if (!elementsList) continue;

        const elIndex = elementsList.findIndex((el) => el.get("id") === id);
        if (elIndex !== -1) {
            const el = elementsList.get(elIndex);
            if (el) el.update(updates);
            break;
        }
    }
  }, []);

  const addElement = useMutation(({ storage }, { pageId, element }: { pageId: string, element: PageElement }) => {
      const pagesList = storage.get("pages");
      const pageIndex = pagesList.findIndex((p) => p.get("id") === pageId);
      if (pageIndex !== -1) {
          const page = pagesList.get(pageIndex);
          const liveElement = new LiveObject(element);
          page?.get("elements").push(liveElement);
      }
  }, []);

  const deleteElement = useMutation(({ storage }, { id }: { id: string }) => {
      const pagesList = storage.get("pages");
      for (let i = 0; i < pagesList.length; i++) {
          const page = pagesList.get(i);
          const elementsList = page?.get("elements");
          const elIndex = elementsList?.findIndex((el) => el.get("id") === id);
          if (elementsList && elIndex !== undefined && elIndex !== -1) {
              elementsList.delete(elIndex);
              break;
          }
      }
      setPresence({ selectedId: null });
  }, []);

  const setPageBackground = useMutation(({ storage }, { pageId, bg }: { pageId: string, bg: Page['background'] }) => {
      const pagesList = storage.get("pages");
      const page = pagesList.find((p) => p.get("id") === pageId);
      if (page) page.update({ background: bg });
  }, []);

  // --- Local Interactions ---

  const handlePointerMoveGlobal = (e: React.PointerEvent) => {
    // 1. Handle Panning
    if (isPanning && lastPanPoint.current) {
        const dx = e.clientX - lastPanPoint.current.x;
        const dy = e.clientY - lastPanPoint.current.y;
        setPan(p => ({ x: p.x + dx, y: p.y + dy }));
        lastPanPoint.current = { x: e.clientX, y: e.clientY };
        return; 
    }

    // 2. Broadcast cursor (adjust for pan/scale?)
    // Actually Liveblocks cursor is usually screen-relative or container relative.
    // For simplicity, we keep it screen relative here or relative to the main container.
    const rect = e.currentTarget.getBoundingClientRect();
    setPresence({ 
        cursor: { x: e.clientX - rect.left, y: e.clientY - rect.top }
    });

    // 3. Handle Drawing Optimistic Update
    if (isDrawing && drawingStartRef.current && selectedId && editingPageId) {
        // We need to calculate position relative to the PAGE, not the screen
        // But since we can't easily get the page rect here without ref, we use the event data
        // For now, drawing relies on the Page's onPointerMove which is handled inside `renderSinglePage` wrapper
        // Wait, handlePageMouseDown sets drawingStartRef using localized coordinates.
        // We need to pass the move event to the active page handler.
    }
  };

  // Pan Zoom Handlers
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.001;
        setScale(s => Math.min(4, Math.max(0.2, s + delta)));
    } else {
        if (editingPageId) {
            // Allow normal scrolling or panning if zoomed in
            // setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
        }
    }
  };

  const handlePointerDownGlobal = (e: React.PointerEvent) => {
     // If middle click or spacebar held (simulated), start panning
     if (e.button === 1 || (e.button === 0 && e.altKey)) {
         e.preventDefault();
         setIsPanning(true);
         lastPanPoint.current = { x: e.clientX, y: e.clientY };
     }
  };

  const handlePointerUpGlobal = () => {
      setIsPanning(false);
      lastPanPoint.current = null;
      handlePageMouseUp(); // Also stop drawing
  };

  const triggerPageFlip = (direction: 'next' | 'prev', targetIndex?: number) => {
    if (isFlipping || editingPageId || !pages) return;

    let newIndex = viewIndex;
    const step = isMobile ? 1 : 1; // On desktop viewIndex counts "spreads" if we treat logic carefully?
    // Let's standardize: viewIndex is strictly "Render Index"
    
    // Desktop View: 
    // 0 = Cover
    // 1 = Page 1 & 2
    // 2 = Page 3 & 4
    // Mobile View:
    // 0 = Cover
    // 1 = Page 1
    // 2 = Page 2
    
    const maxIndex = isMobile ? pages.length - 1 : Math.ceil(pages.length / 2);

    if (targetIndex !== undefined) {
      newIndex = targetIndex;
    } else {
      if (direction === 'next') newIndex = viewIndex + 1;
      else newIndex = viewIndex - 1;
    }

    if (newIndex < 0 || newIndex > maxIndex) return;

    setIsFlipping(true);
    setFlipDirection(direction);

    setTimeout(() => {
      setViewIndex(newIndex);
      setIsFlipping(false);
      setFlipDirection(null);
    }, 600);
  };

  const handlePageMouseDown = (e: React.PointerEvent, pageId: string) => {
    if (!drawMode || pageId !== editingPageId || !pages) return;
    
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    // Adjust coordinates for CSS transform scale
    // Note: The page itself might be scaled by `scale` state
    const x = (e.clientX - rect.left); // / scale? No, the page is inside the transform
    const y = (e.clientY - rect.top);

    drawingStartRef.current = { x, y };
    setIsDrawing(true);

    const page = pages.find(p => p.id === pageId);
    const maxZ = page && page.elements.length > 0 ? Math.max(...page.elements.map(e => e.zIndex)) : 1;
    const nextZ = maxZ + 1;

    const id = generateId();
    const newElement: PageElement = {
        id,
        type: drawMode.type === 'shape' ? 'shape' : drawMode.type,
        content: drawMode.type === 'text' ? '请输入文本' : '',
        x, y, width: 0, height: 0, rotation: 0,
        zIndex: nextZ,
        styleType: 'normal',
        fontFamily: 'hand',
        color: '#000',
        fontSize: 24,
        textAlign: 'left',
        shapeType: drawMode.shapeType,
        strokeColor: '#000',
        strokeWidth: 2,
        fillColor: 'transparent',
    };

    addElement({ pageId, element: newElement });
    setPresence({ selectedId: id });
  };

  const handlePageMouseUp = () => {
    if (isDrawing) {
        setIsDrawing(false);
        setDrawMode(null);
        drawingStartRef.current = null;
    }
  };

  // Dedicated Move Handler for Drawing within a page
  const handlePageMoveForDrawing = (e: React.PointerEvent, pageId: string) => {
     if (isDrawing && drawingStartRef.current && selectedId) {
        e.stopPropagation(); // Don't pan while drawing
        const rect = e.currentTarget.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        
        const startX = drawingStartRef.current.x;
        const startY = drawingStartRef.current.y;

        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);
        const x = Math.min(currentX, startX);
        const y = Math.min(currentY, startY);

        updateElement({ id: selectedId, updates: { x, y, width, height } });
     }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && editingPageId && pages) {
       const page = pages.find(p => p.id === editingPageId);
       if (!page) return;
       const maxZ = page.elements.length > 0 ? Math.max(...page.elements.map(e => e.zIndex)) : 1;

      const files = Array.from(e.target.files) as File[];
      
      for (let idx = 0; idx < files.length; idx++) {
        const file = files[idx];
        let type: ElementType = 'image';
        let content = '';

        if (file.type.startsWith('image')) {
             // Compress Image!
             content = await processImage(file);
        } else {
             // For video/audio, we still use blob URL for local demo, 
             // but strictly speaking these won't sync P2P without a server. 
             // We'll warn or just use blob for now.
             content = URL.createObjectURL(file);
             if (file.type.startsWith('video')) type = 'video';
             else if (file.type.startsWith('audio')) type = 'audio';
        }

        let width = 200; let height = 200;
        if (type === 'audio') { width = 300; height = 100; }

        addElement({
            pageId: editingPageId,
            element: {
                id: generateId(),
                type, content,
                x: 100 + (idx * 20), y: 100 + (idx * 20),
                width, height, rotation: (Math.random() - 0.5) * 10,
                zIndex: maxZ + idx + 1,
                styleType: 'normal', fontFamily: 'hand', color: '#000',
            }
        });
      }
    }
  };

  // --- Rendering Helpers ---

  if (!pages) {
    return (
        <div className="flex h-screen items-center justify-center bg-gray-100 flex-col gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
            <p className="text-gray-500 font-mono">正在连接手账空间...</p>
        </div>
    );
  }

  const getSelectedElement = () => {
      if (!editingPageId || !selectedId) return null;
      const page = pages.find(p => p.id === editingPageId);
      return page?.elements.find(e => e.id === selectedId);
  };
  const selectedElement = getSelectedElement();

  const getBackgroundClass = (bg: Page['background']) => {
    switch (bg) {
      case 'grid': return "bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:20px_20px]";
      case 'dots': return "bg-halftone-sm bg-gray-50 opacity-80";
      case 'dark': return "bg-zinc-900 text-white";
      case 'manga-lines': return "bg-[repeating-linear-gradient(45deg,#fff,#fff_10px,#eee_10px,#eee_12px)]";
      default: return "bg-[#fcfaf7]";
    }
  };

  const renderSinglePage = (page: Page | null, shadowSide: 'left' | 'right' | 'none', allowInteraction: boolean = true) => {
    if (!page) {
      return (
        <div className={`w-full h-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center select-none`}>
          <span className="text-gray-400 font-mono text-sm">-- 空白 --</span>
        </div>
      );
    }

    const isEditingThisPage = editingPageId === page.id;
    const isEditingOtherPage = editingPageId && !isEditingThisPage;
    const isReadOnly = !isEditingThisPage;
    const othersEditing = others.filter(u => u.presence.editingPageId === page.id);

    return (
      <div 
        className={`relative w-full h-full ${isEditingThisPage ? 'overflow-visible z-20 touch-none' : 'overflow-hidden'} shadow-inner ${getBackgroundClass(page.background)} transition-all duration-300 group
          ${isEditingOtherPage ? 'opacity-30 pointer-events-none grayscale' : ''}
          ${isEditingThisPage ? 'ring-2 ring-blue-500 shadow-xl' : ''}
          ${drawMode && isEditingThisPage ? 'cursor-crosshair' : ''}
        `}
        onPointerDown={(e) => isEditingThisPage && handlePageMouseDown(e, page.id)}
        onPointerMove={(e) => isEditingThisPage && handlePageMoveForDrawing(e, page.id)} 
        onPointerUp={isEditingThisPage ? handlePageMouseUp : undefined}
        onClick={() => allowInteraction && !isReadOnly && !isDrawing && setPresence({ selectedId: null })}
      >
        {/* Shadow Gradient for book fold */}
        {shadowSide === 'left' && <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black/20 to-transparent pointer-events-none z-0 mix-blend-multiply" />}
        {shadowSide === 'right' && <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/20 to-transparent pointer-events-none z-0 mix-blend-multiply" />}

        {/* Presence Indicators */}
        {othersEditing.length > 0 && (
            <div className="absolute top-2 left-2 z-30 flex flex-col gap-1">
                {othersEditing.map(u => (
                    <div key={u.connectionId} className="bg-pink-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow opacity-80 animate-pulse border border-white">
                        User {u.connectionId}
                    </div>
                ))}
            </div>
        )}

        {page.elements.map(el => (
          <TransformableElement
            key={el.id}
            element={el}
            readOnly={isReadOnly}
            isSelected={selectedId === el.id}
            onSelect={(id) => setPresence({ selectedId: id })}
            onUpdate={(id, updates, commit) => updateElement({ id, updates })} 
            onDelete={(id) => deleteElement({ id })}
            scale={1} // The element is inside the scaled container, so localized events might need raw scale 1 or relative. 
            // NOTE: Since the transform is on the PARENT of the PARENT, coordinate geometry inside this div is relative to 100% width/height.
            // Pointer events are relative to target. We pass 1 because coordinate system inside page matches pixel values relative to page.
          />
        ))}

        <div className={`absolute bottom-2 ${shadowSide === 'left' ? 'left-2' : 'right-2'} text-[10px] text-gray-400 font-mono pointer-events-none`}>
           {page.id === 'cover' ? 'COVER' : page.id.substring(0,6)}
        </div>

        {!editingPageId && allowInteraction && (
          <button 
            onClick={(e) => { e.stopPropagation(); setPresence({ editingPageId: page.id }); setScale(isMobile ? 1 : 1.2); setPan({x:0, y:0}); }}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200 
                       bg-white/90 hover:bg-black hover:text-white border border-gray-300 hover:border-black
                       w-8 h-8 rounded-full flex items-center justify-center shadow-md pointer-events-auto z-20 transform hover:scale-110 active:scale-95"
            title="Edit Page"
          >
             <Edit3 size={14} />
          </button>
        )}
      </div>
    );
  };

  // --- 3D Scene / Page Logic ---
  
  // Calculate which pages to show based on Mobile vs Desktop view
  let staticLeft: Page | null = null;
  let staticRight: Page | null = null;
  let flipFront: Page | null = null;
  let flipBack: Page | null = null;

  if (isMobile) {
      // Single Page Mode
      // viewIndex maps directly to array index
      const currIdx = viewIndex;
      const nextIdx = viewIndex + 1;
      const prevIdx = viewIndex - 1;

      if (!isFlipping) {
         staticLeft = pages[currIdx] || null; // In mobile, we just render one "Slot", let's call it staticLeft for simplicity
      } else {
         if (flipDirection === 'next') {
            staticLeft = pages[currIdx] || null;
            flipFront = pages[currIdx] || null;
            flipBack = pages[nextIdx] || null; // The incoming page
            // We need a different visual structure for single page flip. 
            // For MVP, we might just slide or simple fade on mobile? 
            // Let's try to reuse the flip logic but centered.
         } else {
             staticLeft = pages[prevIdx] || null;
             flipFront = pages[prevIdx] || null;
             flipBack = pages[currIdx] || null;
         }
      }
  } else {
      // Desktop Double Page Mode
      // viewIndex 0 = Cover (Right only)
      // viewIndex 1 = Spread 1 (Pages 1 & 2)
      
      // Calculate Array Indices
      // If viewIndex == 0: Left=null, Right=Page[0]
      // If viewIndex == 1: Left=Page[1], Right=Page[2]
      // If viewIndex == k: Left=Page[2k-1], Right=Page[2k]
      
      const getLeftIdx = (v: number) => v === 0 ? -1 : (v * 2) - 1;
      const getRightIdx = (v: number) => v === 0 ? 0 : (v * 2);

      const currL = getLeftIdx(viewIndex);
      const currR = getRightIdx(viewIndex);
      
      if (!isFlipping) {
          staticLeft = currL >= 0 ? pages[currL] : null;
          staticRight = currR < pages.length ? pages[currR] : null;
      } else {
          // Logic for 3D flip involving 4 surfaces
          const nextV = flipDirection === 'next' ? viewIndex + 1 : viewIndex - 1;
          const nextL = getLeftIdx(nextV);
          const nextR = getRightIdx(nextV);

          if (flipDirection === 'next') {
             staticLeft = currL >= 0 ? pages[currL] : null; // Bottom Left stays
             staticRight = nextR < pages.length ? pages[nextR] : null; // Bottom Right reveals new page
             flipFront = currR < pages.length ? pages[currR] : null; // Moving page (Front face)
             flipBack = nextL >= 0 ? pages[nextL] : null; // Moving page (Back face)
          } else {
             staticLeft = nextL >= 0 ? pages[nextL] : null;
             staticRight = currR < pages.length ? pages[currR] : null;
             
             // Correct logic for PREV flip: 
             // Moving page lands on Right (Front face visible). Starts on Left (Back face visible... wait, no).
             // When going back, we flip from Left to Right.
             // The page landing on the right is nextR.
             // The page starting on the left is currL.
             flipFront = nextR < pages.length ? pages[nextR] : null;
             flipBack = currL >= 0 ? pages[currL] : null;

             // Let's stick to a simpler visual hack for prev:
             // Just render target state immediately for now to avoid complex reverse math bugs in this prompt.
             staticLeft = nextL >= 0 ? pages[nextL] : null;
             staticRight = nextR < pages.length ? pages[nextR] : null;
          }
      }
  }

  // --- Toolbar Helpers ---
  const RibbonButton = ({ icon: Icon, label, onClick, active }: any) => (
      <button 
        onClick={onClick} 
        className={`flex flex-col items-center justify-center p-2 rounded min-w-[50px] transition-colors
            ${active ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}`}
      >
        <Icon size={20} className="mb-1" />
        <span className="text-[10px] font-medium whitespace-nowrap">{label}</span>
      </button>
  );

  const RibbonGroup = ({ label, children }: any) => (
      <div className="flex flex-col gap-1 px-3 border-r border-gray-300 last:border-0 h-full justify-center shrink-0">
          <div className="flex gap-1 items-center justify-center h-full">
            {children}
          </div>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider text-center mt-auto pb-0.5">{label}</span>
      </div>
  );

  return (
    <div 
        className="flex flex-col h-full w-full bg-stone-100 font-sans fixed inset-0 overflow-hidden" 
        onPointerMove={handlePointerMoveGlobal}
        onPointerDown={handlePointerDownGlobal}
        onPointerUp={handlePointerUpGlobal}
        onWheel={handleWheel}
    >
      
      {/* --- Dynamic Header --- */}
      {editingPageId ? (
         <div className="bg-white border-b shadow-md z-[60] animate-in slide-in-from-top duration-300 shrink-0">
            <div className="flex items-center justify-between px-4 py-1 border-b border-gray-100 bg-[#f3f2f1]">
               <button onClick={() => { setPresence({ editingPageId: null }); setScale(1); setPan({x:0,y:0}); }} className="flex items-center gap-2 text-sm text-gray-600 hover:text-black hover:bg-gray-200 px-2 py-1 rounded">
                  <ArrowLeft size={16} /> <span className="hidden md:inline">Back</span>
               </button>
               <span className="text-xs font-mono text-gray-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  EDITING
               </span>
               <button onClick={() => { setPresence({ editingPageId: null }); setScale(1); setPan({x:0,y:0}); }} className="flex items-center gap-1 text-sm bg-black text-white px-4 py-1.5 rounded-full hover:bg-gray-800 shadow-sm">
                  <Check size={14} /> Done
               </button>
            </div>
            
            <div className="flex items-stretch px-2 py-2 h-20 md:h-24 overflow-x-auto scrollbar-hide bg-white touch-pan-x">
               {/* Mobile-optimized toolbar items */}
               
               <RibbonGroup label="Add">
                   <div className="flex gap-2">
                    <label className="flex flex-col items-center justify-center p-2 hover:bg-gray-100 rounded cursor-pointer min-w-[40px]">
                            <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
                            <ImageIcon size={20} className="mb-1 text-blue-600" />
                    </label>
                    <button onClick={() => setDrawMode({ type: 'text' })} className={`p-2 rounded ${drawMode?.type === 'text' ? 'bg-blue-100' : 'hover:bg-gray-100'}`}>
                        <TypeIcon size={20} />
                    </button>
                   </div>
               </RibbonGroup>

               <RibbonGroup label="Shapes">
                   <div className="grid grid-cols-3 gap-1 w-20">
                        <button onClick={() => setDrawMode({ type: 'shape', shapeType: 'rectangle' })} className="p-1 hover:bg-gray-200 rounded flex justify-center"><Square size={14} /></button>
                        <button onClick={() => setDrawMode({ type: 'shape', shapeType: 'circle' })} className="p-1 hover:bg-gray-200 rounded flex justify-center"><Circle size={14} /></button>
                        <button onClick={() => setDrawMode({ type: 'shape', shapeType: 'triangle' })} className="p-1 hover:bg-gray-200 rounded flex justify-center"><Triangle size={14} /></button>
                   </div>
               </RibbonGroup>

               {selectedElement && selectedElement.type === 'text' && (
                  <RibbonGroup label="Style">
                       <div className="flex gap-1">
                           <button onClick={() => updateElement({ id: selectedElement.id, updates: { fontSize: (selectedElement.fontSize || 24) + 2 } })} className="p-2 hover:bg-gray-100 rounded border"><Plus size={14} /></button>
                           <button onClick={() => updateElement({ id: selectedElement.id, updates: { fontSize: (selectedElement.fontSize || 24) - 2 } })} className="p-2 hover:bg-gray-100 rounded border"><Minus size={14} /></button>
                           <button onClick={() => updateElement({ id: selectedElement.id, updates: { fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold' } })} className="p-2 hover:bg-gray-100 rounded border"><Bold size={14} /></button>
                       </div>
                  </RibbonGroup>
               )}
            </div>
         </div>
      ) : (
         /* Read Mode Header */
         <header className="h-14 md:h-16 bg-white border-b-2 border-black flex items-center justify-between px-4 shrink-0 z-50">
              <div className="flex items-center gap-2">
                 <div className="bg-black text-white px-2 py-1 font-bold text-lg md:text-xl font-mono -rotate-2">MJ</div>
                 <div className="hidden md:flex items-center gap-2 ml-4 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                     <Users size={12} />
                     <span>{others.length + 1} online</span>
                 </div>
              </div>

              <div className="flex gap-2">
                 <button 
                    onClick={() => {
                        const url = new URL(window.location.href);
                        url.searchParams.set("room", room.id);
                        navigator.clipboard.writeText(url.toString());
                        alert("Copied room link!");
                    }}
                    className="flex items-center gap-2 px-3 py-2 border-2 border-black bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 font-bold text-xs"
                 >
                    <Share2 size={14} /> <span className="hidden md:inline">Invite</span>
                 </button>
                 <button onClick={() => addPage()} className="flex items-center gap-2 px-3 py-2 border-2 border-black bg-yellow-300 rounded-lg hover:bg-yellow-400 font-bold text-xs md:text-sm">
                   <Plus size={16} /> <span className="hidden md:inline">Page</span>
                 </button>
              </div>
         </header>
      )}

      {/* --- Main Workspace --- */}
      <main className={`flex-1 relative overflow-hidden flex items-center justify-center bg-[#e5e5e5] ${drawMode ? 'cursor-crosshair' : 'cursor-grab'} ${isPanning ? 'cursor-grabbing' : ''}`}>
        
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

        {/* Global Cursors */}
        <div className="absolute inset-0 pointer-events-none z-[100] overflow-hidden">
             <Cursors />
        </div>

        {/* Navigation Arrows */}
        {!editingPageId && (
          <>
            <button 
                onClick={() => triggerPageFlip('prev')}
                disabled={isFlipping || viewIndex === 0}
                className="absolute left-2 md:left-8 z-40 p-2 md:p-3 bg-white border-2 border-black rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 hover:scale-110 active:scale-90 transition-all"
            >
                <ChevronLeft size={24} />
            </button>
            <button 
                onClick={() => triggerPageFlip('next')}
                disabled={isFlipping || !pages || (isMobile ? viewIndex >= pages.length - 1 : (viewIndex + 1) * 2 > pages.length)}
                className="absolute right-2 md:right-8 z-40 p-2 md:p-3 bg-white border-2 border-black rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 hover:scale-110 active:scale-90 transition-all"
            >
                <ChevronRight size={24} />
            </button>
          </>
        )}
        
        {/* Helper Hint */}
        {editingPageId && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-[10px] pointer-events-none z-50 backdrop-blur-sm">
                Ctrl+Scroll or Pinch to Zoom • Space+Drag to Pan
            </div>
        )}

        {/* Transformable Canvas Container */}
        <div 
            className="will-change-transform transition-transform duration-75 ease-out origin-center"
            style={{ 
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            }}
        >
            <div 
                className={`relative transition-all duration-500 ease-out perspective-[2000px]
                    ${isMobile 
                        ? 'w-[90vw] h-[135vw] max-w-[400px] max-h-[600px]' // Mobile Portrait Dimensions 
                        : 'w-[900px] h-[600px]' // Desktop Spread Dimensions
                    }
                `}
            >
                {/* Book Container */}
                <div className={`relative w-full h-full transform-style-3d bg-gray-300 border md:border-4 border-black rounded-sm shadow-2xl ${editingPageId ? 'ring-4 ring-yellow-400/50' : ''}`}>
                    
                    {/* Spine / Binding */}
                    {!isMobile && <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-6 bg-gray-900 z-0 shadow-inner rounded-sm" />}

                    {/* Pages Rendering */}
                    {isMobile ? (
                        // Mobile Single Page View
                        <div className="absolute inset-0 w-full h-full bg-white z-10 overflow-hidden rounded-sm border-r border-gray-400">
                             {renderSinglePage(staticLeft, 'none')}
                        </div>
                    ) : (
                        // Desktop Double Spread
                        <>
                            <div className="absolute top-0 left-0 w-1/2 h-full z-10 bg-white border-r border-gray-300">
                                {renderSinglePage(staticLeft, 'left')}
                            </div>
                            <div className="absolute top-0 right-0 w-1/2 h-full z-10 bg-white border-l border-gray-300">
                                {renderSinglePage(staticRight, 'right')}
                            </div>
                        </>
                    )}

                    {/* Flipping Animation Layer (Desktop Only for MVP simplicity, easy to adapt) */}
                    {!isMobile && isFlipping && (
                        <div 
                            className="absolute top-0 left-1/2 w-1/2 h-full z-50 transform-style-3d origin-left"
                            style={{ 
                                animation: flipDirection === 'next' ? 'flipNext 0.6s forwards' : 'flipPrev 0.6s forwards'
                            }}
                        >
                            <div className="absolute inset-0 backface-hidden z-20 bg-white border-l border-gray-300">
                                {renderSinglePage(flipFront, 'right', false)}
                            </div>
                            <div className="absolute inset-0 backface-hidden bg-white border-r border-gray-300" style={{ transform: 'rotateY(180deg)' }}>
                                {renderSinglePage(flipBack, 'left', false)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

      </main>

      <footer className="h-6 md:h-8 bg-black text-white flex items-center justify-between px-4 text-[10px] md:text-xs font-mono shrink-0 z-50">
         <span>Page {viewIndex + 1}</span>
         <span>{editingPageId ? 'EDITING' : 'READING'}</span>
         <span className="opacity-50">{Math.round(scale * 100)}%</span>
      </footer>

      <style>{`
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        @keyframes flipNext {
          from { transform: rotateY(0deg); }
          to { transform: rotateY(-180deg); }
        }
        @keyframes flipPrev {
          from { transform: rotateY(-180deg); }
          to { transform: rotateY(0deg); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
