import React, { useState } from 'react';
import { Page, PageElement, ElementType } from './types';
import { TransformableElement } from './components/TransformableElement';
import { 
  Plus, Trash, ChevronLeft, ChevronRight, Image as ImageIcon, 
  Type as TypeIcon, StickyNote, Edit3, Check, ArrowLeft
} from 'lucide-react';

const generateId = () => Math.random().toString(36).substr(2, 9);

const INITIAL_PAGES: Page[] = [
  { id: 'cover', background: 'manga-lines', elements: [
      { id: 'title', type: 'text', content: '我的漫画手账\nJOURNAL', x: 50, y: 150, width: 300, height: 200, rotation: -5, zIndex: 1, styleType: 'normal', fontFamily: 'hand', color: '#000000', fontWeight: 'bold', fontSize: 48 }
  ] },
  { id: 'p1', background: 'white', elements: [] },
  { id: 'p2', background: 'dots', elements: [] },
];

export default function App() {
  const [pages, setPages] = useState<Page[]>(INITIAL_PAGES);
  const [viewIndex, setViewIndex] = useState(0); 
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  
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

  const addElement = (type: ElementType, content: string = '') => {
    if (!editingPageId) return;

    const pageIndex = pages.findIndex(p => p.id === editingPageId);
    if (pageIndex === -1) return;

    const newElement: PageElement = {
      id: generateId(),
      type,
      content: content || (type === 'text' ? '新文字' : ''),
      x: 100 + Math.random() * 50,
      y: 100 + Math.random() * 50,
      width: type === 'sticker' ? 100 : 200,
      height: type === 'sticker' ? 100 : 100,
      rotation: (Math.random() - 0.5) * 10,
      zIndex: 10,
      styleType: type === 'sticker' ? 'tape' : 'normal',
      fontFamily: 'hand',
      color: '#000000',
      fontSize: 24,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
    };

    updatePageElements(pageIndex, [...pages[pageIndex].elements, newElement]);
    setSelectedId(newElement.id);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(file => {
        const url = URL.createObjectURL(file);
        const type = file.type.startsWith('video') ? 'video' : 'image';
        addElement(type, url);
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

    // Determine state
    const isEditingThisPage = editingPageId === page.id;
    const isEditingOtherPage = editingPageId && !isEditingThisPage;
    const isReadOnly = !isEditingThisPage;

    return (
      <div 
        className={`relative w-full h-full overflow-hidden shadow-inner ${getBackgroundClass(page.background)} transition-all duration-300 group
          ${isEditingOtherPage ? 'opacity-30 pointer-events-none grayscale' : ''}
          ${isEditingThisPage ? 'ring-4 ring-blue-500/30' : ''}
        `}
        onClick={() => allowInteraction && !isReadOnly && setSelectedId(null)}
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

        {/* EDIT MODE: Background Selector */}
        {isEditingThisPage && (
           <div className="absolute top-2 left-2 flex gap-1 z-50 bg-white/90 p-1 rounded-full shadow-sm border border-gray-200">
             {(['white', 'grid', 'dots', 'dark', 'manga-lines'] as const).map(bg => (
               <button 
                 key={bg} 
                 onClick={(e) => { e.stopPropagation(); setPageBackground(page.id, bg); }}
                 className={`w-4 h-4 rounded-full border border-black ${bg === 'dark' ? 'bg-zinc-800' : 'bg-white'}`}
                 title={bg}
               />
             ))}
           </div>
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

  return (
    <div className="flex flex-col h-screen w-full bg-stone-100 font-sans">
      
      {/* --- Dynamic Header --- */}
      <header className="h-16 bg-white border-b-2 border-black flex items-center justify-between px-4 shrink-0 z-50 relative">
         {/* Edit Mode Toolbar */}
         {editingPageId ? (
           <>
              <div className="flex items-center gap-4 animate-in slide-in-from-top duration-300">
                <button onClick={() => setEditingPageId(null)} className="flex items-center gap-2 text-gray-500 hover:text-black">
                  <ArrowLeft size={20} /> <span className="font-bold">返回</span>
                </button>
                <div className="h-6 w-px bg-gray-300"></div>
                
                <label className="cursor-pointer hover:scale-105 transition-transform">
                  <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
                  <div className="flex items-center gap-1 border-2 border-black px-3 py-1 rounded-lg bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none">
                    <ImageIcon size={18} />
                    <span className="font-bold text-sm">媒体</span>
                  </div>
                </label>
                
                <button onClick={() => addElement('text')} className="flex items-center gap-1 border-2 border-black px-3 py-1 rounded-lg bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:scale-105 active:translate-y-[2px] active:shadow-none transition-transform">
                  <TypeIcon size={18} />
                  <span className="font-bold text-sm">文字</span>
                </button>

                <button onClick={() => addElement('sticker', '★')} className="flex items-center gap-1 border-2 border-black px-3 py-1 rounded-lg bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:scale-105 active:translate-y-[2px] active:shadow-none transition-transform">
                  <StickyNote size={18} />
                  <span className="font-bold text-sm">贴纸</span>
                </button>
              </div>

              <div className="flex gap-2 animate-in slide-in-from-right duration-300">
                 <button onClick={() => setEditingPageId(null)} className="flex items-center gap-1 px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 shadow-md font-bold">
                    <Check size={18} /> 完成编辑
                 </button>
              </div>
           </>
         ) : (
           /* Read Mode Toolbar */
           <>
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
           </>
         )}
      </header>

      {/* --- Main Workspace --- */}
      <main className="flex-1 overflow-hidden flex items-center justify-center p-4 md:p-8 bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')]">
        
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
         <span>{selectedId ? '选中中...' : '就绪'}</span>
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
      `}</style>
    </div>
  );
}