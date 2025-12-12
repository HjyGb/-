
import React, { useState, useRef, useEffect } from 'react';
import { Page, PageElement, ElementType } from './types';
import { TransformableElement } from './components/TransformableElement';
import { Cursors } from './components/Cursors';
import { 
  useStorage, useMutation, useHistory, useMyPresence, useOthers 
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

export default function App() {
  // --- Liveblocks State ---
  const pages = useStorage((root) => root.pages);
  const history = useHistory();
  const [{ editingPageId, selectedId }, setPresence] = useMyPresence();
  const others = useOthers();

  // --- Local View State (Not synced) ---
  const [viewIndex, setViewIndex] = useState(0); 
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);

  // --- Drawing State ---
  const [drawMode, setDrawMode] = useState<{ type: ElementType | 'shape', shapeType?: PageElement['shapeType'] } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const drawingStartRef = useRef<{ x: number, y: number } | null>(null);

  // --- Mutations (Replacing local state setters) ---
  
  const addPage = useMutation(({ storage }) => {
    const pages = storage.get("pages");
    const newP1 = new LiveObject({ id: generateId(), background: 'white' as const, elements: new LiveList<PageElement>([]) });
    const newP2 = new LiveObject({ id: generateId(), background: 'white' as const, elements: new LiveList<PageElement>([]) });
    pages.push(newP1);
    pages.push(newP2);
    // Automatically flip to new page
    triggerPageFlip('next', Math.ceil((pages.length + 2) / 2));
  }, []);

  const removeCurrentSpread = useMutation(({ storage }) => {
    if (viewIndex === 0) return;
    const pages = storage.get("pages");
    const rightPageIndex = viewIndex * 2;
    const leftPageIndex = viewIndex * 2 - 1;

    // Delete from end to start to maintain indices during delete
    if (rightPageIndex < pages.length) pages.delete(rightPageIndex);
    if (leftPageIndex < pages.length) pages.delete(leftPageIndex);

    setViewIndex(Math.max(0, viewIndex - 1));
  }, [viewIndex]);

  const updateElement = useMutation(({ storage }, { id, updates }: { id: string, updates: Partial<PageElement> }) => {
    const pagesList = storage.get("pages");
    
    // Find the element across all pages
    for (let i = 0; i < pagesList.length; i++) {
        const page = pagesList.get(i);
        const elementsList = page?.get("elements");
        if (!elementsList) continue;

        const elIndex = elementsList.findIndex((el) => el.get("id") === id);
        if (elIndex !== -1) {
            const el = elementsList.get(elIndex);
            if (el) {
                el.update(updates);
            }
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

  const reorderElement = useMutation(({ storage }, { id, direction }: { id: string, direction: 'up' | 'down' }) => {
      // Reordering logic simplified for Z-Index approach (we just update zIndex prop)
      // The current TransformableElement uses zIndex prop, so we update that instead of array order
      // This is handled by updateElement({ zIndex: ... }) in the component calls
  }, []);

  // --- Local Interactions ---

  const handlePointerMoveGlobal = (e: React.PointerEvent) => {
    // Broadcast cursor position
    const rect = e.currentTarget.getBoundingClientRect();
    setPresence({ 
        cursor: { x: e.clientX - rect.left, y: e.clientY - rect.top }
    });

    if (isDrawing && drawingStartRef.current && selectedId && editingPageId) {
        // Optimistic update for drawing (Local state would be smoother, but direct mutation works for MVP)
        const currentX = (e.clientX - rect.left) / zoomLevel;
        const currentY = (e.clientY - rect.top) / zoomLevel;
        const startX = drawingStartRef.current.x;
        const startY = drawingStartRef.current.y;

        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);
        const x = Math.min(currentX, startX);
        const y = Math.min(currentY, startY);

        updateElement({ id: selectedId, updates: { x, y, width, height } });
    }
  };

  const triggerPageFlip = (direction: 'next' | 'prev', targetIndex?: number) => {
    if (isFlipping || editingPageId || !pages) return;

    const maxIndex = Math.ceil(pages.length / 2);
    let newIndex = viewIndex;

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
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;

    drawingStartRef.current = { x, y };
    setIsDrawing(true);

    // Calculate Z-Index
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
        // Check size logic if needed
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && editingPageId && pages) {
       const page = pages.find(p => p.id === editingPageId);
       if (!page) return;
       const maxZ = page.elements.length > 0 ? Math.max(...page.elements.map(e => e.zIndex)) : 1;

      Array.from(e.target.files).forEach((file: File, idx) => {
        const url = URL.createObjectURL(file);
        let type: ElementType = 'image';
        if (file.type.startsWith('video')) type = 'video';
        else if (file.type.startsWith('audio')) type = 'audio';

        let width = 200; let height = 200;
        if (type === 'audio') { width = 300; height = 100; }

        addElement({
            pageId: editingPageId,
            element: {
                id: generateId(),
                type, content: url,
                x: 100 + (idx * 20), y: 100 + (idx * 20),
                width, height, rotation: (Math.random() - 0.5) * 10,
                zIndex: maxZ + idx + 1,
                styleType: 'normal', fontFamily: 'hand', color: '#000',
            }
        });
      });
    }
  };

  // --- Rendering Helpers ---

  // Loading state
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

  const renderSinglePage = (page: Page | null, isLeft: boolean, allowInteraction: boolean = true) => {
    if (!page) {
      return (
        <div className={`w-full h-full bg-gray-200 border-2 border-dashed border-gray-400 flex items-center justify-center opacity-50 select-none`}>
          <span className="text-gray-500 font-mono">空白页</span>
        </div>
      );
    }

    const isEditingThisPage = editingPageId === page.id;
    const isEditingOtherPage = editingPageId && !isEditingThisPage;
    const isReadOnly = !isEditingThisPage;
    
    // Check if others are editing this page
    const othersEditing = others.filter(u => u.presence.editingPageId === page.id);

    return (
      <div 
        className={`relative w-full h-full ${isEditingThisPage ? 'overflow-visible z-20 touch-none' : 'overflow-hidden'} shadow-inner ${getBackgroundClass(page.background)} transition-all duration-300 group
          ${isEditingOtherPage ? 'opacity-30 pointer-events-none grayscale' : ''}
          ${isEditingThisPage ? 'ring-4 ring-blue-500/30' : ''}
          ${drawMode && isEditingThisPage ? 'cursor-crosshair' : ''}
        `}
        onPointerDown={(e) => isEditingThisPage && handlePageMouseDown(e, page.id)}
        onPointerMove={isEditingThisPage ? handlePageMoveWrapper : undefined} 
        onPointerUp={isEditingThisPage ? handlePageMouseUp : undefined}
        onClick={() => allowInteraction && !isReadOnly && !isDrawing && setPresence({ selectedId: null })}
      >
        <div className={`absolute inset-y-0 ${isLeft ? 'right-0 w-8 bg-gradient-to-l' : 'left-0 w-8 bg-gradient-to-r'} from-black/20 to-transparent pointer-events-none z-0 mix-blend-multiply`} />

        {/* Presence Indicators */}
        {othersEditing.length > 0 && (
            <div className="absolute top-2 left-2 z-30 flex gap-1">
                {othersEditing.map(u => (
                    <div key={u.connectionId} className="bg-pink-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow opacity-80 animate-pulse">
                        User {u.connectionId} editing...
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
            scale={zoomLevel}
          />
        ))}

        <div className={`absolute bottom-4 ${isLeft ? 'left-4' : 'right-4'} text-xs text-gray-400 font-mono pointer-events-none`}>
           {page.id === 'cover' ? '封面' : page.id}
        </div>

        {!editingPageId && allowInteraction && (
          <button 
            onClick={(e) => { e.stopPropagation(); setPresence({ editingPageId: page.id }); }}
            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 
                       bg-white/90 hover:bg-black hover:text-white border-2 border-gray-200 hover:border-black
                       w-10 h-10 rounded-full flex items-center justify-center shadow-md pointer-events-auto z-20 transform hover:scale-110"
            title="协同编辑本页"
          >
             <Edit3 size={18} />
          </button>
        )}
      </div>
    );
  };
  
  // Wrapper to handle pointer moves for drawing AND cursor tracking
  const handlePageMoveWrapper = (e: React.PointerEvent) => {
      // We don't need explicit logic here as global pointer move handles cursor
      // but if we needed page-relative logic, it would go here.
  };

  // --- 3D Scene Logic (Unchanged) ---
  const currLIdx = viewIndex * 2 - 1;
  const currRIdx = viewIndex * 2;
  const nextLIdx = (viewIndex + 1) * 2 - 1;
  const nextRIdx = (viewIndex + 1) * 2;
  const prevLIdx = (viewIndex - 1) * 2 - 1;
  const prevRIdx = (viewIndex - 1) * 2;

  let staticLeftPage: Page | null = null;
  let staticRightPage: Page | null = null;
  let flipperFrontPage: Page | null = null;
  let flipperBackPage: Page | null = null;

  if (!isFlipping) {
      staticLeftPage = currLIdx >= 0 ? pages[currLIdx] : null;
      staticRightPage = currRIdx < pages.length ? pages[currRIdx] : null;
  } else {
      if (flipDirection === 'next') {
          staticLeftPage = currLIdx >= 0 ? pages[currLIdx] : null;
          staticRightPage = nextRIdx < pages.length ? pages[nextRIdx] : null;
          flipperFrontPage = currRIdx < pages.length ? pages[currRIdx] : null;
          flipperBackPage = nextLIdx >= 0 ? pages[nextLIdx] : null;
      } else {
          staticLeftPage = prevLIdx >= 0 ? pages[prevLIdx] : null;
          staticRightPage = currRIdx < pages.length ? pages[currRIdx] : null;
          flipperBackPage = currLIdx >= 0 ? pages[currLIdx] : null;
          flipperFrontPage = prevRIdx < pages.length ? pages[prevRIdx] : null;
      }
  }

  // --- Toolbar Helpers ---
  const RibbonButton = ({ icon: Icon, label, onClick, active }: any) => (
      <button 
        onClick={onClick} 
        className={`flex flex-col items-center justify-center p-2 rounded min-w-[50px] transition-colors
            ${active ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}`}
      >
        <Icon size={22} className="mb-1" />
        <span className="text-[10px] font-medium whitespace-nowrap">{label}</span>
      </button>
  );

  const RibbonGroup = ({ label, children }: any) => (
      <div className="flex flex-col gap-1 px-3 border-r border-gray-300 last:border-0 h-full justify-center">
          <div className="flex gap-1 items-center justify-center h-full">
            {children}
          </div>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider text-center mt-auto pb-0.5">{label}</span>
      </div>
  );

  return (
    <div className="flex flex-col h-screen w-full bg-stone-100 font-sans" onPointerMove={handlePointerMoveGlobal}>
      
      {/* --- Dynamic Header --- */}
      {editingPageId ? (
         <div className="bg-white border-b shadow-md z-50 animate-in slide-in-from-top duration-300">
            <div className="flex items-center justify-between px-4 py-1 border-b border-gray-100 bg-[#f3f2f1]">
               <button onClick={() => { setPresence({ editingPageId: null }); setZoomLevel(1); }} className="flex items-center gap-2 text-sm text-gray-600 hover:text-black hover:bg-gray-200 px-2 py-1 rounded">
                  <ArrowLeft size={16} /> 完成编辑
               </button>
               <span className="text-xs font-mono text-gray-500">协同编辑模式 (LIVE)</span>
               <div className="flex items-center gap-2">
                   <div className="flex -space-x-2 mr-2">
                       {others.map((u) => (
                           <div key={u.connectionId} className="w-6 h-6 rounded-full bg-gray-400 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">
                               {u.connectionId}
                           </div>
                       ))}
                       <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">Me</div>
                   </div>
                   <button onClick={() => { setPresence({ editingPageId: null }); setZoomLevel(1); }} className="flex items-center gap-1 text-sm bg-black text-white px-4 py-1.5 rounded hover:bg-gray-800 shadow-sm">
                      <Check size={14} /> 完成
                   </button>
               </div>
            </div>
            
            <div className="flex items-stretch px-2 py-2 h-24 overflow-x-auto scrollbar-hide bg-white">
               
               {/* History */}
               <RibbonGroup label="协同">
                   <div className="flex flex-col gap-1 items-center justify-center">
                       <div className="flex gap-1">
                          <button onClick={history.undo} className="p-1.5 rounded hover:bg-gray-200" title="撤销 (所有人)"><RotateCcw size={16} /></button>
                          <button onClick={history.redo} className="p-1.5 rounded hover:bg-gray-200" title="重做 (所有人)"><RotateCw size={16} /></button>
                       </div>
                       <div className="flex gap-1 border-t pt-1 border-gray-100">
                          <button onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="p-1 rounded hover:bg-gray-200" title="缩小"><ZoomOut size={14} /></button>
                          <span className="text-[10px] font-mono w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
                          <button onClick={() => setZoomLevel(z => Math.min(2, z + 0.1))} className="p-1 rounded hover:bg-gray-200" title="放大"><ZoomIn size={14} /></button>
                       </div>
                   </div>
               </RibbonGroup>

               {/* Images */}
               <RibbonGroup label="图像">
                   <label className="flex flex-col items-center justify-center p-2 hover:bg-gray-100 rounded cursor-pointer min-w-[50px]">
                        <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
                        <ImageIcon size={22} className="mb-1 text-blue-600" />
                        <span className="text-[10px] font-medium">图片</span>
                   </label>
               </RibbonGroup>

               {/* Illustrations */}
               <RibbonGroup label="插图">
                   <div className="grid grid-cols-3 gap-1 w-24">
                        <button onClick={() => setDrawMode({ type: 'shape', shapeType: 'rectangle' })} className="p-1 hover:bg-gray-200 rounded flex justify-center"><Square size={16} /></button>
                        <button onClick={() => setDrawMode({ type: 'shape', shapeType: 'circle' })} className="p-1 hover:bg-gray-200 rounded flex justify-center"><Circle size={16} /></button>
                        <button onClick={() => setDrawMode({ type: 'shape', shapeType: 'triangle' })} className="p-1 hover:bg-gray-200 rounded flex justify-center"><Triangle size={16} /></button>
                        <button onClick={() => setDrawMode({ type: 'shape', shapeType: 'star' })} className="p-1 hover:bg-gray-200 rounded flex justify-center"><Star size={16} /></button>
                        <button onClick={() => setDrawMode({ type: 'shape', shapeType: 'line' })} className="p-1 hover:bg-gray-200 rounded flex justify-center"><Minus size={16} className="-rotate-45" /></button>
                        <button onClick={() => setDrawMode({ type: 'shape', shapeType: 'table' })} className="p-1 hover:bg-gray-200 rounded flex justify-center"><Grid size={16} /></button>
                   </div>
               </RibbonGroup>

               {/* Text */}
               <RibbonGroup label="文本">
                   <RibbonButton 
                     icon={TypeIcon} 
                     label="文本框" 
                     active={drawMode?.type === 'text'} 
                     onClick={() => setDrawMode({ type: 'text' })} 
                   />
               </RibbonGroup>

               {/* Formatting */}
               {selectedElement && selectedElement.type === 'text' && (
                  <RibbonGroup label="格式">
                       <div className="flex flex-col gap-1 items-start">
                           <div className="flex gap-1 border-b border-gray-200 pb-1 mb-1">
                               <select 
                                 className="text-xs border rounded p-1 w-24"
                                 value={selectedElement.fontFamily}
                                 onChange={(e) => updateElement({ id: selectedElement.id, updates: { fontFamily: e.target.value as any } })}
                               >
                                   <option value="hand">手写体</option>
                                   <option value="serif">宋体</option>
                                   <option value="sans">黑体</option>
                               </select>
                               <div className="flex items-center border rounded px-1">
                                  <button onClick={() => updateElement({ id: selectedElement.id, updates: { fontSize: Math.max(12, (selectedElement.fontSize || 24) - 2) } })} className="hover:bg-gray-100 p-0.5"><Minus size={10} /></button>
                                  <span className="text-xs w-6 text-center">{selectedElement.fontSize || 24}</span>
                                  <button onClick={() => updateElement({ id: selectedElement.id, updates: { fontSize: Math.min(120, (selectedElement.fontSize || 24) + 2) } })} className="hover:bg-gray-100 p-0.5"><Plus size={10} /></button>
                               </div>
                           </div>
                           <div className="flex gap-1">
                               <button onClick={() => updateElement({ id: selectedElement.id, updates: { fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold' } })} className={`p-1 rounded hover:bg-gray-200 ${selectedElement.fontWeight === 'bold' ? 'bg-gray-300' : ''}`}><Bold size={14} /></button>
                               <button onClick={() => updateElement({ id: selectedElement.id, updates: { fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic' } })} className={`p-1 rounded hover:bg-gray-200 ${selectedElement.fontStyle === 'italic' ? 'bg-gray-300' : ''}`}><Italic size={14} /></button>
                               <button onClick={() => updateElement({ id: selectedElement.id, updates: { textDecoration: selectedElement.textDecoration === 'underline' ? 'none' : 'underline' } })} className={`p-1 rounded hover:bg-gray-200 ${selectedElement.textDecoration === 'underline' ? 'bg-gray-300' : ''}`}><Underline size={14} /></button>
                               <div className="w-px h-4 bg-gray-300 mx-1"></div>
                               <button onClick={() => updateElement({ id: selectedElement.id, updates: { textAlign: 'left' } })} className={`p-1 rounded hover:bg-gray-200 ${selectedElement.textAlign === 'left' ? 'bg-gray-300' : ''}`}><AlignLeft size={14} /></button>
                               <button onClick={() => updateElement({ id: selectedElement.id, updates: { textAlign: 'center' } })} className={`p-1 rounded hover:bg-gray-200 ${selectedElement.textAlign === 'center' ? 'bg-gray-300' : ''}`}><AlignCenter size={14} /></button>
                               <button onClick={() => updateElement({ id: selectedElement.id, updates: { textAlign: 'right' } })} className={`p-1 rounded hover:bg-gray-200 ${selectedElement.textAlign === 'right' ? 'bg-gray-300' : ''}`}><AlignRight size={14} /></button>
                           </div>
                       </div>
                  </RibbonGroup>
               )}

               {/* Media */}
               <RibbonGroup label="媒体">
                    <label className="flex flex-col items-center justify-center p-2 hover:bg-gray-100 rounded cursor-pointer min-w-[50px]">
                        <input type="file" multiple accept="video/*" className="hidden" onChange={handleFileUpload} />
                        <Video size={22} className="mb-1" />
                        <span className="text-[10px] font-medium">视频</span>
                    </label>
                    <label className="flex flex-col items-center justify-center p-2 hover:bg-gray-100 rounded cursor-pointer min-w-[50px]">
                        <input type="file" multiple accept="audio/*" className="hidden" onChange={handleFileUpload} />
                        <Music size={22} className="mb-1" />
                        <span className="text-[10px] font-medium">音频</span>
                    </label>
               </RibbonGroup>

               {/* Design */}
               <RibbonGroup label="设计">
                  <div className="grid grid-cols-2 gap-1">
                      {(['white', 'grid', 'dots', 'dark', 'manga-lines'] as const).map(bg => (
                        <button 
                          key={bg} 
                          onClick={() => setPageBackground({ pageId: editingPageId, bg })}
                          className={`w-5 h-5 rounded border hover:scale-110 transition-transform ${
                            bg === 'white' ? 'bg-white' : 
                            bg === 'dark' ? 'bg-zinc-800' : 
                            bg === 'grid' ? 'bg-[url(https://bg.site/grid.png)] bg-gray-100' : 
                            'bg-gray-200'
                          } ${bg === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}
                          title={bg}
                        />
                      ))}
                  </div>
               </RibbonGroup>

            </div>
         </div>
      ) : (
         /* Read Mode Header */
         <header className="h-16 bg-white border-b-2 border-black flex items-center justify-between px-4 shrink-0 z-50">
              <div className="flex items-center gap-2">
                 <div className="bg-black text-white px-2 py-1 font-bold text-xl font-mono -rotate-2">漫画手账</div>
                 <div className="flex items-center gap-2 ml-4 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                     <Users size={12} />
                     <span>{others.length + 1} 人在线</span>
                 </div>
              </div>

              <div className="flex gap-2">
                 <button 
                    onClick={() => {
                        const url = window.location.href;
                        navigator.clipboard.writeText(url);
                        alert("链接已复制，发给朋友即可加入房间！");
                    }}
                    className="flex items-center gap-2 px-3 py-2 border-2 border-black bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold text-xs"
                 >
                    <Share2 size={14} /> 邀请好友
                 </button>
                 <button onClick={() => addPage()} className="flex items-center gap-2 px-4 py-2 border-2 border-black bg-yellow-300 rounded-lg hover:bg-yellow-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold text-sm">
                   <Plus size={16} /> 加页
                 </button>
                 <button onClick={() => removeCurrentSpread()} className="flex items-center gap-2 px-4 py-2 border-2 border-black bg-red-100 text-red-600 rounded-lg hover:bg-red-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold text-sm">
                   <Trash size={16} /> 删除整页
                 </button>
              </div>
         </header>
      )}

      {/* --- Main Workspace --- */}
      <main className={`flex-1 overflow-hidden flex items-center justify-center p-4 md:p-8 bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')] ${drawMode ? 'cursor-crosshair' : ''}`}>
        
        {/* Render Live Cursors in the shared space */}
        <Cursors />

        {!editingPageId && (
          <button 
            onClick={() => triggerPageFlip('prev')}
            disabled={isFlipping || viewIndex === 0}
            className="absolute left-4 md:left-8 z-40 p-3 bg-white border-2 border-black rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:shadow-none disabled:translate-y-1 hover:scale-110 transition-all"
          >
            <ChevronLeft size={32} />
          </button>
        )}

        <div 
            className="relative w-full max-w-6xl aspect-[3/2] transition-transform duration-200 ease-out origin-center" 
            style={{ perspective: '2000px', transform: `scale(${zoomLevel})` }}
        >
            <div className={`relative w-full h-full transform-style-3d bg-gray-300 border-4 border-black rounded-sm shadow-2xl transition-transform duration-500 ${editingPageId ? 'scale-[1.02]' : ''}`}>
                
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-6 bg-gray-900 z-0 shadow-inner rounded-sm"></div>

                <div className="absolute top-0 left-0 w-1/2 h-full z-10 border-r border-gray-300 bg-white">
                   {renderSinglePage(staticLeftPage, true)}
                </div>

                <div className="absolute top-0 right-0 w-1/2 h-full z-10 border-l border-gray-300 bg-white">
                   {renderSinglePage(staticRightPage, false)}
                </div>

                {isFlipping && (
                  <div 
                    className="absolute top-0 left-1/2 w-1/2 h-full z-50 transform-style-3d origin-left transition-transform duration-500 ease-in-out"
                    style={{ 
                        transform: flipDirection === 'next' ? 'rotateY(-180deg)' : 'rotateY(0deg)',
                        animation: flipDirection === 'next' ? 'flipNext 0.6s forwards' : 'flipPrev 0.6s forwards'
                    }}
                  >
                     <div className="absolute inset-0 backface-hidden z-20 bg-white border-l border-gray-300">
                        {renderSinglePage(flipperFrontPage, false, false)}
                     </div>
                     <div className="absolute inset-0 backface-hidden bg-white border-r border-gray-300" style={{ transform: 'rotateY(180deg)' }}>
                        {renderSinglePage(flipperBackPage, true, false)}
                     </div>
                  </div>
                )}
            </div>
        </div>

        {!editingPageId && (
          <button 
            onClick={() => triggerPageFlip('next')}
            disabled={isFlipping || !pages || (viewIndex + 1) * 2 > pages.length}
            className="absolute right-4 md:right-8 z-40 p-3 bg-white border-2 border-black rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:shadow-none disabled:translate-y-1 hover:scale-110 transition-all"
          >
            <ChevronRight size={32} />
          </button>
        )}

      </main>

      <footer className="h-8 bg-black text-white flex items-center justify-between px-4 text-xs font-mono">
         <span>页码: {viewIndex + 1} / {pages ? Math.ceil(pages.length / 2) + 1 : '-'}</span>
         <span>{editingPageId ? '协同编辑模式' : '浏览模式'}</span>
         <span>{drawMode ? '绘制模式' : selectedId ? '选中中...' : '就绪'}</span>
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
