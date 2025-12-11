import React, { useRef, useState } from 'react';
import { PageElement } from '../types';
import { X, Layers, Palette, Type, Bold, Italic, Underline, Minus, Plus } from 'lucide-react';

interface Props {
  element: PageElement;
  isSelected: boolean;
  readOnly?: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<PageElement>) => void;
  onDelete: (id: string) => void;
  scale: number; // Viewport scale for event calculation
}

export const TransformableElement: React.FC<Props> = ({
  element,
  isSelected,
  readOnly = false,
  onSelect,
  onUpdate,
  onDelete,
  scale,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    initialW: 0,
    initialH: 0,
    initialRot: 0,
    mode: 'idle' as 'idle' | 'drag' | 'resize' | 'rotate',
  });

  // Handle pointer down for drag/resize/rotate
  const handlePointerDown = (e: React.PointerEvent, mode: 'drag' | 'resize' | 'rotate') => {
    if (readOnly) return;
    
    e.preventDefault();
    e.stopPropagation();
    onSelect(element.id);

    if (mode === 'drag' && isEditing) return; // Don't drag if editing text

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: element.x,
      initialY: element.y,
      initialW: element.width,
      initialH: element.height,
      initialRot: element.rotation,
      mode,
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerMove = (e: PointerEvent) => {
    const { startX, startY, initialX, initialY, initialW, initialH, initialRot, mode } = dragRef.current;
    const deltaX = (e.clientX - startX) / scale;
    const deltaY = (e.clientY - startY) / scale;

    if (mode === 'drag') {
      onUpdate(element.id, {
        x: initialX + deltaX,
        y: initialY + deltaY,
      });
    } else if (mode === 'resize') {
        const rad = (initialRot * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        
        const localDeltaX = deltaX * cos + deltaY * sin;
        const localDeltaY = -deltaX * sin + deltaY * cos;

        if (element.type === 'text') {
           // Free resize for text
           onUpdate(element.id, {
              width: Math.max(50, initialW + localDeltaX),
              height: Math.max(30, initialH + localDeltaY),
           });
        } else {
           // Aspect ratio lock for images/videos
           const sizeChange = Math.max(localDeltaX, localDeltaY);
           onUpdate(element.id, {
               width: Math.max(50, initialW + sizeChange),
               height: Math.max(50, initialH + (sizeChange * (initialH / initialW))), // Maintain aspect
           });
        }

    } else if (mode === 'rotate') {
      const rect = elementRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const startAngle = Math.atan2(startY - centerY, startX - centerX);
      const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      
      let rotationDelta = (currentAngle - startAngle) * (180 / Math.PI);
      
      onUpdate(element.id, {
        rotation: initialRot + rotationDelta,
      });
    }
  };

  const handlePointerUp = () => {
    dragRef.current.mode = 'idle';
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  };

  // Content Rendering
  const renderContent = () => {
    const commonClasses = "w-full h-full object-cover pointer-events-none";
    
    switch (element.type) {
      case 'image':
        return <img src={element.content} alt="user content" className={commonClasses} />;
      case 'video':
        return (
          <video 
            src={element.content} 
            className={commonClasses} 
            loop 
            muted 
            autoPlay 
            playsInline
          />
        );
      case 'text':
      case 'sticker':
        // Determine font size: use stored value or fallback to dynamic approximation (legacy support)
        const fontSizeVal = element.fontSize || Math.min(element.width, element.height) / 4;

        const textStyle = { 
          fontFamily: element.fontFamily === 'hand' ? 'Patrick Hand, cursive' : element.fontFamily === 'serif' ? 'Shippori Mincho, serif' : 'Noto Sans SC, sans-serif',
          color: element.color,
          fontSize: `${fontSizeVal}px`,
          lineHeight: 1.2,
          fontWeight: element.fontWeight || 'normal',
          fontStyle: element.fontStyle || 'normal',
          textDecoration: element.textDecoration || 'none',
        };

        if (isEditing) {
          return (
            <textarea
              autoFocus
              className="w-full h-full bg-transparent resize-none outline-none p-2 overflow-hidden selection:bg-blue-200"
              style={textStyle}
              value={element.content}
              onChange={(e) => onUpdate(element.id, { content: e.target.value })}
              onBlur={() => setIsEditing(false)}
              onPointerDown={(e) => e.stopPropagation()} // Allow text selection
            />
          );
        }
        return (
          <div 
            className="w-full h-full p-2 whitespace-pre-wrap break-words flex items-center justify-center text-center"
            style={textStyle}
          >
            {element.content || "双击编辑"}
          </div>
        );
      default:
        return null;
    }
  };

  // Wrapper Styles based on element.styleType
  const getContainerStyles = () => {
    let base = "absolute bg-white shadow-sm overflow-hidden select-none touch-none ";
    if (element.styleType === 'polaroid') {
      base += "border-2 border-black p-2 pb-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ";
    } else if (element.styleType === 'tape') {
      base += "border-0 shadow-lg ";
    } else {
      // Normal / Comic style
      base += "border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ";
    }
    // Cursor styles
    if (!readOnly) {
       base += "cursor-move ";
    }
    return base;
  };

  return (
    <div
      ref={elementRef}
      className={getContainerStyles()}
      style={{
        width: element.width,
        height: element.height,
        transform: `translate(${element.x}px, ${element.y}px) rotate(${element.rotation}deg)`,
        zIndex: element.zIndex,
      }}
      onPointerDown={(e) => handlePointerDown(e, 'drag')}
      onDoubleClick={() => !readOnly && element.type === 'text' && setIsEditing(true)}
    >
      {/* Tape Visual Decoration */}
      {element.styleType === 'tape' && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-yellow-200/80 rotate-3 z-10 shadow-sm border border-yellow-400/50 pointer-events-none"></div>
      )}

      {renderContent()}

      {/* Selection UI - Only in Edit Mode */}
      {isSelected && !readOnly && !isEditing && (
        <>
          {/* Border Highlight */}
          <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none" />
          
          {/* Text Formatting Toolbar - Only for Text Elements when selected */}
          {element.type === 'text' && (
            <div 
              className="absolute -top-14 left-1/2 -translate-x-1/2 flex gap-1 bg-black text-white p-1.5 rounded-lg shadow-xl z-50 animate-in fade-in zoom-in duration-200"
              onPointerDown={(e) => e.stopPropagation()}
            >
               <button 
                 onClick={(e) => { e.stopPropagation(); onUpdate(element.id, { fontWeight: element.fontWeight === 'bold' ? 'normal' : 'bold' }); }}
                 className={`p-1 rounded hover:bg-gray-700 ${element.fontWeight === 'bold' ? 'bg-gray-700 text-yellow-400' : ''}`}
                 title="加粗"
               >
                 <Bold size={14} />
               </button>
               <button 
                 onClick={(e) => { e.stopPropagation(); onUpdate(element.id, { fontStyle: element.fontStyle === 'italic' ? 'normal' : 'italic' }); }}
                 className={`p-1 rounded hover:bg-gray-700 ${element.fontStyle === 'italic' ? 'bg-gray-700 text-yellow-400' : ''}`}
                 title="斜体"
               >
                 <Italic size={14} />
               </button>
               <button 
                 onClick={(e) => { e.stopPropagation(); onUpdate(element.id, { textDecoration: element.textDecoration === 'underline' ? 'none' : 'underline' }); }}
                 className={`p-1 rounded hover:bg-gray-700 ${element.textDecoration === 'underline' ? 'bg-gray-700 text-yellow-400' : ''}`}
                 title="下划线"
               >
                 <Underline size={14} />
               </button>
               
               {/* Font Size Controls */}
               <div className="w-px h-4 bg-gray-600 mx-1 self-center"></div>
               
               <button 
                 onClick={(e) => { 
                   e.stopPropagation(); 
                   const currentSize = element.fontSize || 24;
                   onUpdate(element.id, { fontSize: Math.max(12, currentSize - 2) });
                 }}
                 className="p-1 rounded hover:bg-gray-700"
                 title="缩小字号"
               >
                 <Minus size={14} />
               </button>
               <button 
                 onClick={(e) => { 
                   e.stopPropagation(); 
                   const currentSize = element.fontSize || 24;
                   onUpdate(element.id, { fontSize: Math.min(120, currentSize + 2) });
                 }}
                 className="p-1 rounded hover:bg-gray-700"
                 title="加大字号"
               >
                 <Plus size={14} />
               </button>
            </div>
          )}

          {/* Rotate Handle */}
          <div
            className="absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-2 border-black rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center shadow-sm z-50 hover:bg-gray-100"
            onPointerDown={(e) => handlePointerDown(e, 'rotate')}
          >
            <span className="block w-1 h-1 bg-black rounded-full"></span>
          </div>

          {/* Resize Handle (Bottom Right) */}
          <div
            className="absolute -bottom-3 -right-3 w-6 h-6 bg-black border-2 border-white cursor-nwse-resize shadow-md z-50 hover:scale-110 transition-transform"
            onPointerDown={(e) => handlePointerDown(e, 'resize')}
          />

          {/* Controls attached to corners (No floating box) */}
          
          {/* Top Right: Delete */}
          <button 
             onClick={(e) => { e.stopPropagation(); onDelete(element.id); }}
             className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white border-2 border-white rounded-full flex items-center justify-center shadow-md z-50 hover:scale-110 hover:bg-red-600 transition-transform"
             title="删除"
          >
             <X size={14} />
          </button>

          {/* Top Left: Style Toggle */}
          <button 
             onClick={(e) => { 
                e.stopPropagation(); 
                const newType = element.styleType === 'normal' ? 'polaroid' : element.styleType === 'polaroid' ? 'tape' : 'normal';
                onUpdate(element.id, { styleType: newType });
             }}
             className="absolute -top-3 -left-3 w-6 h-6 bg-black text-white border-2 border-white rounded-full flex items-center justify-center shadow-md z-50 hover:scale-110 transition-transform"
             title="切换样式"
          >
             <Palette size={14} />
          </button>

          {/* Bottom Left: Layer/Text */}
          {element.type === 'text' ? (
              <button 
                onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                className="absolute -bottom-3 -left-3 w-6 h-6 bg-black text-white border-2 border-white rounded-full flex items-center justify-center shadow-md z-50 hover:scale-110 transition-transform"
                title="编辑文字"
             >
                <Type size={14} />
             </button>
          ) : (
             <button 
                onClick={(e) => { 
                   e.stopPropagation(); 
                   onUpdate(element.id, { zIndex: element.zIndex + 1 });
                }}
                className="absolute -bottom-3 -left-3 w-6 h-6 bg-black text-white border-2 border-white rounded-full flex items-center justify-center shadow-md z-50 hover:scale-110 transition-transform"
                title="上移一层"
             >
                <Layers size={14} />
             </button>
          )}

        </>
      )}
    </div>
  );
};