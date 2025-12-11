
import React, { useState, useRef } from 'react';
import { Page, PageElement, ElementType } from './types';
import { TransformableElement } from './components/TransformableElement';
import { 
  Plus, Trash, ChevronLeft, ChevronRight, Image as ImageIcon, 
  Type as TypeIcon, StickyNote, Edit3, Check, ArrowLeft, 
  Square, Circle, Triangle, Star, Minus, Grid, Layout,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  MousePointer, Video, Music
} from 'lucide-react';

const generateId = () => Math.random().toString(36).substr(2, 9);

const INITIAL_PAGES: Page[] = [
  { id: 'cover', background: 'manga-lines', elements: [
      { id: 'title', type: 'text', content: '我的漫画手账\nJOURNAL', x: 50, y: 150, width: 300, height: 200, rotation: -5, zIndex: 1, styleType: 'normal', fontFamily: 'hand', color: '#000000', fontWeight: 'bold', fontSize: 48, textAlign: 'center' }
  ] },
  { id: 'p1', background: 'white', elements: [] },
  { id: 'p2', background: 'dots', elements: [] },
];

export default function App() {
  const [pages, setPages] = useState<Page[]>(INITIAL_PAGES);
  const [viewIndex, setViewIndex] = useState(0); 
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  
  // Drawing State
  const [drawMode, setDrawMode] = useState<{ type: ElementType | 'shape', shapeType?: PageElement['shapeType'] } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const drawingStartRef = useRef<{ x: number, y: number } | null>(null);
  
  // Animation state
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);

  // --- Actions ---

  const addPage = () => {
    const newP1: Page = { id: generateId(), background: 'white', elements: [] };
    const newP2: Page = { id: generateId(), background: 'white', elements: [] };
    setPages([...pages, newP1, newP2]);
    triggerPageFlip('next', Math.ceil(pages.length / 2));
  };

  const removeCurrentSpread = () => {
    if (viewIndex === 0) return;
    const leftPageIndex = viewIndex * 2 - 1;
    const rightPageIndex = viewIndex * 2;
    
    const newPages = [...pages];
    if (rightPageIndex < newPages.length) newPages.splice(rightPageIndex, 1);
    if (leftPageIndex < newPages.length) newPages.splice(leftPageIndex, 1);
    
    setPages(newPages);
    setViewIndex(Math.max(0, viewIndex - 1));
  };

  const triggerPageFlip = (direction: 'next' | 'prev', targetIndex?: number) => {
    if (isFlipping || editingPageId) return; // Disable flip during edit

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

  // --- Drawing Logic ---

  const startDrawing = (type: ElementType, shapeType?: PageElement['shapeType']) => {
    setDrawMode({ type: type === 'shape' ? 'shape' : type, shapeType });
    setSelectedId(null); // Deselect current to focus on drawing
  };

  const handlePageMouseDown = (e: React.PointerEvent, pageId: string) => {
    if (!drawMode || pageId !== editingPageId) return;
    
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    drawingStartRef.current = { x, y };
    setIsDrawing(true);

    // Create temp element
    const id = generateId();
    const newElement: PageElement = {
        id,
        type: drawMode.type === 'shape' ? 'shape' : drawMode.type,
        content: drawMode.type === 'text' ? '请输入文本' : '',
        x,
        y,
        width: 0, 
        height: 0,
        rotation: 0,
        zIndex: 10,
        styleType: 'normal',
        fontFamily: 'hand',
        color: '#000',
        fontSize: 24,
        textAlign: 'left',
        // Shape defaults
        shapeType: drawMode.shapeType,
        strokeColor: '#000',
        strokeWidth: 2,
        fillColor: 'transparent',
    };

    const pageIndex = pages.findIndex(p => p.id === editingPageId);
    const newElements = [...pages[pageIndex].elements, newElement];
    updatePageElements(pageIndex, newElements);
    setSelectedId(id);
  };

  const handlePageMouseMove = (e: React.PointerEvent) => {
    if (!isDrawing || !drawingStartRef.current || !selectedId || !editingPageId) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    const startX = drawingStartRef.current.x;
    const startY = drawingStartRef.current.y;

    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    const x = Math.min(currentX, startX);
    const y = Math.min(currentY, startY);

    handleElementUpdate(selectedId, { x, y, width, height });
  };

  const handlePageMouseUp = () => {
    if (isDrawing) {
        setIsDrawing(false);
        setDrawMode(null);
        drawingStartRef.current = null;
        // If created element is too small, give it default size
        if (selectedId) {
             const el = pages.find(p => p.id === editingPageId)?.elements.find(e => e.id === selectedId);
             if (el && (el.width < 10 || el.height < 10)) {
                 handleElementUpdate(selectedId, { width: 150, height: el.type === 'text' ? 50 : 150 });
             }
        }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && editingPageId) {
      Array.from(e.target.files).forEach(file => {
        const url = URL.createObjectURL(file);
        let type: ElementType = 'image';
        if (file.type.startsWith('video')) type = 'video';
        else if (file.type.startsWith('audio')) type = 'audio';

        // Add immediately to center for uploaded media
        const pageIndex = pages.findIndex(p => p.id === editingPageId);
        
        // Default dimensions
        let width = 200;
        let height = 200;
        if (type === 'audio') {
            width = 300;
            height = 60;
        }

        const newElement: PageElement = {
            id: generateId(),
            type,
            content: url,
            x: 200, y: 200, width, height,
            rotation: (Math.random() - 0.5) * 10,
            zIndex: 10,
            styleType: 'normal',
            fontFamily: 'hand',
            color: '#000',
        };
        updatePageElements(pageIndex, [...pages[pageIndex].elements, newElement]);
        setSelectedId(newElement.id);
      });
    }
  };

  const updatePageElements = (pageIndex: number, newElements: PageElement[]) => {
    const newPages = [...pages];
    newPages[pageIndex] = { ...newPages[pageIndex], elements: newElements };
    setPages(newPages);
  };

  const handleElementUpdate = (id: string, updates: Partial<PageElement>) => {
    let pageIdx = -1;
    let elIdx = -1;

    for (let i = 0; i < pages.length; i++) {
      const idx = pages[i].elements.findIndex(e => e.id === id);
      if (idx !== -1) {
        pageIdx = i;
        elIdx = idx;
        break;
      }
    }

    if (pageIdx !== -1) {
      const newElements = [...pages[pageIdx].elements];
      newElements[elIdx] = { ...newElements[elIdx], ...updates };
      updatePageElements(pageIdx, newElements);
    }
  };

  const handleElementDelete = (id: string) => {
    const pageIdx = pages.findIndex(p => p.elements.some(e => e.id === id));
    if (pageIdx !== -1) {
      const newElements = pages[pageIdx].elements.filter(e => e.id !== id);
      updatePageElements(pageIdx, newElements);
      setSelectedId(null);
    }
  };

  const setPageBackground = (id: string, bg: Page['background']) => {
    const pageIdx = pages.findIndex(p => p.id === id);
    if (pageIdx !== -1) {
      const newPages = [...pages];
      newPages[pageIdx].background = bg;
      setPages(newPages);
    }
  };

  // --- Get Selected Element Helper ---
  const getSelectedElement = () => {
      if (!editingPageId || !selectedId) return null;
      const page = pages.find(p => p.id === editingPageId);
      return page?.elements.find(e => e.id === selectedId);
  };
  const selectedElement = getSelectedElement();

  // --- Rendering Helpers ---

  const getBackgroundClass = (bg: Page['background']) => {
    switch (bg) {
      case 'grid': return "bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:20px_20px]";
      case 'dots': return "bg-halftone-sm bg-gray-50 opacity-80";
      case 'dark': return "bg-zinc-900 text-white";
      case 'manga-lines': return "bg-[repeating-linear-gradient(45deg,#fff,#fff_10px,#eee_10px,#eee_12px)]";
      default: return "bg-[#fcfaf7]"; // Off-white
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

    // Use overflow-visible when editing this page so drag handles/buttons aren't clipped
    const overflowClass = isEditingThisPage ? 'overflow-visible z-20' : 'overflow-hidden';

    return (
      <div 
        className={`relative w-full h-full ${overflowClass} shadow-inner ${getBackgroundClass(page.background)} transition-all duration-300 group
          ${isEditingOtherPage ? 'opacity-30 pointer-events-none grayscale' : ''}
          ${isEditingThisPage ? 'ring-4 ring-blue-500/30' : ''}
          ${drawMode && isEditingThisPage ? 'cursor-crosshair' : ''}
        `}
        onPointerDown={(e) => isEditingThisPage && handlePageMouseDown(e, page.id)}
        onPointerMove={isEditingThisPage ? handlePageMouseMove : undefined}
        onPointerUp={isEditingThisPage ? handlePageMouseUp : undefined}
        onClick={() => allowInteraction && !isReadOnly && !isDrawing && setSelectedId(null)}
      >
        {/* Page Shadow Gradient */}
        <div className={`absolute inset-y-0 ${isLeft ? 'right-0 w-8 bg-gradient-to-l' : 'left-0 w-8 bg-gradient-to-r'} from-black/20 to-transparent pointer-events-none z-0 mix-blend-multiply`} />

        {/* Elements */}
        {page.elements.map(el => (
          <TransformableElement
            key={el.id}
            element={el}
            readOnly={isReadOnly}
            isSelected={selectedId === el.id}
            onSelect={setSelectedId}
            onUpdate={handleElementUpdate}
            onDelete={handleElementDelete}
            scale={1}
          />
        ))}

        {/* Page Number */}
        <div className={`absolute bottom-4 ${isLeft ? 'left-4' : 'right-4'} text-xs text-gray-400 font-mono pointer-events-none`}>
           {page.id === 'cover' ? '封面' : page.id}
        </div>

        {/* VIEW MODE: Edit Button (Corner Icon) */}
        {!editingPageId && allowInteraction && (
          <button 
            onClick={(e) => { e.stopPropagation(); setEditingPageId(page.id); }}
            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 
                       bg-white/90 hover:bg-black hover:text-white border-2 border-gray-200 hover:border-black
                       w-10 h-10 rounded-full flex items-center justify-center shadow-md pointer-events-auto z-20 transform hover:scale-110"
            title="编辑本页"
          >
             <Edit3 size={18} />
          </button>
        )}
      </div>
    );
  };

  // --- 3D Scene Setup ---
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

  // --- Toolbar Component ---
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
    <div className="flex flex-col h-screen w-full bg-stone-100 font-sans">
      
      {/* --- Dynamic Header (Ribbon Style) --- */}
      {editingPageId ? (
         <div className="bg-white border-b shadow-md z-50 animate-in slide-in-from-top duration-300">
            {/* Top Bar: Back & Title */}
            <div className="flex items-center justify-between px-4 py-1 border-b border-gray-100 bg-[#f3f2f1]">
               <button onClick={() => setEditingPageId(null)} className="flex items-center gap-2 text-sm text-gray-600 hover:text-black hover:bg-gray-200 px-2 py-1 rounded">
                  <ArrowLeft size={16} /> 返回浏览
               </button>
               <span className="text-xs font-mono text-gray-500">MANGA JOURNAL EDITOR</span>
               <button onClick={() => setEditingPageId(null)} className="flex items-center gap-1 text-sm bg-black text-white px-4 py-1.5 rounded hover:bg-gray-800 shadow-sm">
                  <Check size={14} /> 完成
               </button>
            </div>
            
            {/* Office Ribbon Toolbar */}
            <div className="flex items-stretch px-2 py-2 h-24 overflow-x-auto scrollbar-hide bg-white">
               
               {/* 1. Images Group */}
               <RibbonGroup label="图像">
                   <label className="flex flex-col items-center justify-center p-2 hover:bg-gray-100 rounded cursor-pointer min-w-[50px]">
                        <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
                        <ImageIcon size={22} className="mb-1 text-blue-600" />
                        <span className="text-[10px] font-medium">图片</span>
                   </label>
               </RibbonGroup>

               {/* 2. Illustrations (Shapes) */}
               <RibbonGroup label="插图">
                   <div className="grid grid-cols-3 gap-1 w-24">
                        <button onClick={() => startDrawing('shape', 'rectangle')} className="p-1 hover:bg-gray-200 rounded flex justify-center"><Square size={16} /></button>
                        <button onClick={() => startDrawing('shape', 'circle')} className="p-1 hover:bg-gray-200 rounded flex justify-center"><Circle size={16} /></button>
                        <button onClick={() => startDrawing('shape', 'triangle')} className="p-1 hover:bg-gray-200 rounded flex justify-center"><Triangle size={16} /></button>
                        <button onClick={() => startDrawing('shape', 'star')} className="p-1 hover:bg-gray-200 rounded flex justify-center"><Star size={16} /></button>
                        <button onClick={() => startDrawing('shape', 'line')} className="p-1 hover:bg-gray-200 rounded flex justify-center"><Minus size={16} className="-rotate-45" /></button>
                        <button onClick={() => startDrawing('shape', 'table')} className="p-1 hover:bg-gray-200 rounded flex justify-center"><Grid size={16} /></button>
                   </div>
               </RibbonGroup>

               {/* 3. Text Group */}
               <RibbonGroup label="文本">
                   <RibbonButton 
                     icon={TypeIcon} 
                     label="文本框" 
                     active={drawMode?.type === 'text'} 
                     onClick={() => startDrawing('text')} 
                   />
               </RibbonGroup>

               {/* 4. Text Format (Contextual) */}
               {selectedElement && selectedElement.type === 'text' && (
                  <RibbonGroup label="格式">
                       <div className="flex flex-col gap-1 items-start">
                           <div className="flex gap-1 border-b border-gray-200 pb-1 mb-1">
                               <select 
                                 className="text-xs border rounded p-1 w-24"
                                 value={selectedElement.fontFamily}
                                 onChange={(e) => handleElementUpdate(selectedElement.id, { fontFamily: e.target.value as any })}
                               >
                                   <option value="hand">手写体</option>
                                   <option value="serif">宋体</option>
                                   <option value="sans">黑体</option>
                               </select>
                               <div className="flex items-center border rounded px-1">
                                  <button onClick={() => handleElementUpdate(selectedElement.id, { fontSize: Math.max(12, (selectedElement.fontSize || 24) - 2) })} className="hover:bg-gray-100 p-0.5"><Minus size={10} /></button>
                                  <span className="text-xs w-6 text-center">{selectedElement.fontSize || 24}</span>
                                  <button onClick={() => handleElementUpdate(selectedElement.id, { fontSize: Math.min(120, (selectedElement.fontSize || 24) + 2) })} className="hover:bg-gray-100 p-0.5"><Plus size={10} /></button>
                               </div>
                           </div>
                           <div className="flex gap-1">
                               <button onClick={() => handleElementUpdate(selectedElement.id, { fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold' })} className={`p-1 rounded hover:bg-gray-200 ${selectedElement.fontWeight === 'bold' ? 'bg-gray-300' : ''}`}><Bold size={14} /></button>
                               <button onClick={() => handleElementUpdate(selectedElement.id, { fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic' })} className={`p-1 rounded hover:bg-gray-200 ${selectedElement.fontStyle === 'italic' ? 'bg-gray-300' : ''}`}><Italic size={14} /></button>
                               <button onClick={() => handleElementUpdate(selectedElement.id, { textDecoration: selectedElement.textDecoration === 'underline' ? 'none' : 'underline' })} className={`p-1 rounded hover:bg-gray-200 ${selectedElement.textDecoration === 'underline' ? 'bg-gray-300' : ''}`}><Underline size={14} /></button>
                               <div className="w-px h-4 bg-gray-300 mx-1"></div>
                               <button onClick={() => handleElementUpdate(selectedElement.id, { textAlign: 'left' })} className={`p-1 rounded hover:bg-gray-200 ${selectedElement.textAlign === 'left' ? 'bg-gray-300' : ''}`}><AlignLeft size={14} /></button>
                               <button onClick={() => handleElementUpdate(selectedElement.id, { textAlign: 'center' })} className={`p-1 rounded hover:bg-gray-200 ${selectedElement.textAlign === 'center' ? 'bg-gray-300' : ''}`}><AlignCenter size={14} /></button>
                               <button onClick={() => handleElementUpdate(selectedElement.id, { textAlign: 'right' })} className={`p-1 rounded hover:bg-gray-200 ${selectedElement.textAlign === 'right' ? 'bg-gray-300' : ''}`}><AlignRight size={14} /></button>
                           </div>
                       </div>
                  </RibbonGroup>
               )}

               {/* 5. Media */}
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

               {/* 6. Page Background (Design) */}
               <RibbonGroup label="设计">
                  <div className="grid grid-cols-2 gap-1">
                      {(['white', 'grid', 'dots', 'dark', 'manga-lines'] as const).map(bg => (
                        <button 
                          key={bg} 
                          onClick={() => setPageBackground(editingPageId, bg)}
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
              </div>

              <div className="flex gap-2">
                 <button onClick={addPage} className="flex items-center gap-2 px-4 py-2 border-2 border-black bg-yellow-300 rounded-lg hover:bg-yellow-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold text-sm">
                   <Plus size={16} /> 加页
                 </button>
                 <button onClick={removeCurrentSpread} className="flex items-center gap-2 px-4 py-2 border-2 border-black bg-red-100 text-red-600 rounded-lg hover:bg-red-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold text-sm">
                   <Trash size={16} /> 删除整页
                 </button>
              </div>
         </header>
      )}

      {/* --- Main Workspace --- */}
      <main className={`flex-1 overflow-hidden flex items-center justify-center p-4 md:p-8 bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')] ${drawMode ? 'cursor-crosshair' : ''}`}>
        
        {/* Navigation Left (Hidden in Edit Mode) */}
        {!editingPageId && (
          <button 
            onClick={() => triggerPageFlip('prev')}
            disabled={isFlipping || viewIndex === 0}
            className="absolute left-4 md:left-8 z-40 p-3 bg-white border-2 border-black rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:shadow-none disabled:translate-y-1 hover:scale-110 transition-all"
          >
            <ChevronLeft size={32} />
          </button>
        )}

        {/* The 3D Book Container */}
        <div className="relative w-full max-w-6xl aspect-[3/2]" style={{ perspective: '2000px' }}>
            <div className={`relative w-full h-full transform-style-3d bg-gray-300 border-4 border-black rounded-sm shadow-2xl transition-transform duration-500 ${editingPageId ? 'scale-[1.02]' : ''}`}>
                
                {/* Spine */}
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-6 bg-gray-900 z-0 shadow-inner rounded-sm"></div>

                {/* Left Page */}
                <div className="absolute top-0 left-0 w-1/2 h-full z-10 border-r border-gray-300 bg-white">
                   {renderSinglePage(staticLeftPage, true)}
                </div>

                {/* Right Page */}
                <div className="absolute top-0 right-0 w-1/2 h-full z-10 border-l border-gray-300 bg-white">
                   {renderSinglePage(staticRightPage, false)}
                </div>

                {/* Animation Layer */}
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

        {/* Navigation Right (Hidden in Edit Mode) */}
        {!editingPageId && (
          <button 
            onClick={() => triggerPageFlip('next')}
            disabled={isFlipping || (viewIndex + 1) * 2 > pages.length}
            className="absolute right-4 md:right-8 z-40 p-3 bg-white border-2 border-black rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:shadow-none disabled:translate-y-1 hover:scale-110 transition-all"
          >
            <ChevronRight size={32} />
          </button>
        )}

      </main>

      {/* --- Footer Status --- */}
      <footer className="h-8 bg-black text-white flex items-center justify-between px-4 text-xs font-mono">
         <span>页码: {viewIndex + 1} / {Math.ceil(pages.length / 2) + 1}</span>
         <span>{editingPageId ? '编辑模式' : '浏览模式'}</span>
         <span>{drawMode ? '绘制模式: 点击并拖动以创建' : selectedId ? '选中中...' : '就绪'}</span>
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
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
