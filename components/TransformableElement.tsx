
import React, { useRef, useState } from 'react';
import { PageElement } from '../types';
import { X, Layers, Palette, Type, ZoomIn, ZoomOut, ArrowUp, ArrowDown, Lock, Unlock, Music } from 'lucide-react';

interface Props {
  element: PageElement;
  isSelected: boolean;
  readOnly?: boolean;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, updates: Partial<PageElement>, commit?: boolean) => void;
  onInteractionEnd?: () => void;
  onDelete: (id: string) => void;
  scale: number; // Viewport scale for event calculation
}

export const TransformableElement: React.FC<Props> = ({
  element,
  isSelected,
  readOnly = false,
  onSelect,
  onUpdate,
  onInteractionEnd,
  onDelete,
  scale,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLocked, setIsLocked] = useState(false); // Local lock state for UI prevention
  const elementRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    initialW: 0,
    initialH: 0,
    initialRot: 0,
    hasMoved: false,
    mode: 'idle' as 'idle' | 'drag' | 'resize' | 'rotate',
  });

  // Handle pointer down for drag/resize/rotate
  const handlePointerDown = (e: React.PointerEvent, mode: 'drag' | 'resize' | 'rotate') => {
    if (readOnly || isLocked) return;
    
    // Crucial for touch devices to prevent scrolling while dragging
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
      hasMoved: false,
      mode,
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  const handlePointerMove = (e: PointerEvent) => {
    const { startX, startY, initialX, initialY, initialW, initialH, initialRot, mode } = dragRef.current;
    
    // Check if actually moved to avoid micro-jitters
    if (Math.abs(e.clientX - startX) > 2 || Math.abs(e.clientY - startY) > 2) {
        dragRef.current.hasMoved = true;
    }

    // Divide delta by scale to ensure movement matches cursor regardless of zoom level
    const deltaX = (e.clientX - startX) / scale;
    const deltaY = (e.clientY - startY) / scale;

    if (mode === 'drag') {
      onUpdate(element.id, {
        x: initialX + deltaX,
        y: initialY + deltaY,
      }, false);
    } else if (mode === 'resize') {
        const rad = (initialRot * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        
        const localDeltaX = deltaX * cos + deltaY * sin;
        const localDeltaY = -deltaX * sin + deltaY * cos;

        if (element.type === 'text') {
           onUpdate(element.id, {
              width: Math.max(50, initialW + localDeltaX),
              height: Math.max(30, initialH + localDeltaY),
           }, false);
        } else if (element.type === 'shape') {
           onUpdate(element.id, {
              width: Math.max(20, initialW + localDeltaX),
              height: Math.max(20, initialH + localDeltaY),
           }, false);
        } else if (element.type === 'audio') {
           onUpdate(element.id, {
              width: Math.max(150, initialW + localDeltaX),
              height: Math.max(60, initialH + localDeltaY), // Min height for cassette
           }, false);
        } else {
           // Aspect ratio lock for images/videos
           const sizeChange = Math.max(localDeltaX, localDeltaY);
           onUpdate(element.id, {
               width: Math.max(50, initialW + sizeChange),
               height: Math.max(50, initialH + (sizeChange * (initialH / initialW))), 
           }, false);
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
      }, false);
    }
  };

  const handlePointerUp = () => {
    // Only save history if an actual modification occurred
    if (dragRef.current.mode !== 'idle' && dragRef.current.hasMoved && onInteractionEnd) {
      onInteractionEnd();
    }
    dragRef.current.mode = 'idle';
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerUp);
  };

  // Content Rendering
  const renderContent = () => {
    const commonClasses = "w-full h-full object-cover pointer-events-none select-none drag-none";
    
    switch (element.type) {
      case 'image':
        return <img src={element.content} alt="user content" className={commonClasses} draggable={false} />;
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
      case 'audio':
        // Custom Cassette Tape Style
        return (
          <div className="w-full h-full flex flex-col bg-zinc-800 rounded-lg p-2 border-2 border-zinc-600 shadow-sm relative overflow-hidden group">
             {/* Cassette Texture */}
             <div className="absolute inset-0 bg-[radial-gradient(#333_1px,transparent_1px)] bg-[size:4px_4px] opacity-20 pointer-events-none"></div>
             
             {/* Top Label Area */}
             <div className="bg-white/90 h-1/3 rounded-sm mb-1 flex items-center px-2 shadow-inner">
                <span className="text-[10px] font-mono text-black truncate w-full opacity-70">Mixtape Vol.1</span>
             </div>

             {/* Reel Circles */}
             <div className="flex-1 bg-black/40 rounded border border-zinc-700 flex items-center justify-center gap-4 relative">
                <div className="w-8 h-8 rounded-full border-4 border-white/20 bg-black animate-[spin_4s_linear_infinite] opacity-60"></div>
                <div className="w-8 h-8 rounded-full border-4 border-white/20 bg-black animate-[spin_4s_linear_infinite] opacity-60"></div>
                
                {/* Audio controls overlay */}
                <div className="absolute inset-0 flex items-center justify-center z-10 opacity-60 hover:opacity-100 transition-opacity">
                   <audio 
                     src={element.content} 
                     controls 
                     className="w-[95%] h-8 scale-90 origin-center pointer-events-auto" 
                     onPointerDown={(e) => e.stopPropagation()}
                   />
                </div>
             </div>
             
             {/* Bottom Decoration */}
             <div className="absolute bottom-1 left-2 text-[8px] text-zinc-500 font-bold">TYPE I (NORMAL)</div>
          </div>
        );
      case 'shape':
        const sW = element.strokeWidth || 3;
        const stroke = element.strokeColor || '#000';
        const fill = element.fillColor || 'transparent';
        
        return (
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible pointer-events-none block">
             {element.shapeType === 'rectangle' && (
               <rect x="0" y="0" width="100" height="100" stroke={stroke} strokeWidth={sW} fill={fill} vectorEffect="non-scaling-stroke" />
             )}
             {element.shapeType === 'circle' && (
               <ellipse cx="50" cy="50" rx="50" ry="50" stroke={stroke} strokeWidth={sW} fill={fill} vectorEffect="non-scaling-stroke" />
             )}
             {element.shapeType === 'triangle' && (
               <polygon points="50,0 100,100 0,100" stroke={stroke} strokeWidth={sW} fill={fill} vectorEffect="non-scaling-stroke" />
             )}
             {element.shapeType === 'star' && (
               <polygon points="50,0 61,35 98,35 68,57 79,91 50,70 21,91 32,57 2,35 39,35" stroke={stroke} strokeWidth={sW} fill={fill} vectorEffect="non-scaling-stroke" />
             )}
             {element.shapeType === 'line' && (
               <line x1="0" y1="50" x2="100" y2="50" stroke={stroke} strokeWidth={sW * 2} vectorEffect="non-scaling-stroke" />
             )}
             {element.shapeType === 'table' && (
                <g stroke={stroke} strokeWidth={sW} vectorEffect="non-scaling-stroke">
                  <rect x="0" y="0" width="100" height="100" fill={fill} />
                  <line x1="0" y1="33.3" x2="100" y2="33.3" />
                  <line x1="0" y1="66.6" x2="100" y2="66.6" />
                  <line x1="33.3" y1="0" x2="33.3" y2="100" />
                  <line x1="66.6" y1="0" x2="66.6" y2="100" />
                </g>
             )}
          </svg>
        );
      case 'text':
      case 'sticker':
        const fontSizeVal = element.fontSize || 24;
        const textStyle: React.CSSProperties = { 
          fontFamily: element.fontFamily === 'hand' ? 'Patrick Hand, cursive' : element.fontFamily === 'serif' ? 'Shippori Mincho, serif' : 'Noto Sans SC, sans-serif',
          color: element.color,
          fontSize: `${fontSizeVal}px`,
          lineHeight: 1.2,
          fontWeight: element.fontWeight || 'normal',
          fontStyle: element.fontStyle || 'normal',
          textDecoration: element.textDecoration || 'none',
          textAlign: element.textAlign || 'center',
        };

        if (isEditing) {
          return (
            <textarea
              autoFocus
              className="w-full h-full bg-transparent resize-none outline-none p-2 overflow-hidden selection:bg-blue-200 block"
              style={textStyle}
              value={element.content}
              onChange={(e) => onUpdate(element.id, { content: e.target.value }, false)}
              onBlur={() => { setIsEditing(false); onInteractionEnd?.(); }}
              onPointerDown={(e) => e.stopPropagation()} 
            />
          );
        }
        return (
          <div 
            className="w-full h-full p-2 whitespace-pre-wrap break-words flex flex-col justify-center"
            style={{
                ...textStyle,
                justifyContent: element.textAlign === 'center' ? 'center' : 'flex-start',
            }}
          >
             <div style={{ width: '100%', textAlign: element.textAlign || 'left' }}>
                {element.content || "双击编辑"}
             </div>
          </div>
        );
      default:
        return null;
    }
  };

  const getOuterStyles = () => {
    // Add touch-action: none to prevent browser scrolling while dragging
    return `absolute select-none outline-none overflow-visible ${!readOnly && !isLocked ? 'cursor-move' : ''} ${isLocked ? 'pointer-events-none' : ''}`;
  };

  const getInnerStyles = () => {
    if (element.type === 'shape' || element.type === 'audio') {
        return "w-full h-full relative";
    }

    let base = "w-full h-full bg-white overflow-hidden ";
    if (element.styleType === 'polaroid') {
        base += "border-2 border-black p-2 pb-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ";
    } else if (element.styleType === 'tape') {
        base += "border-0 shadow-lg ";
    } else {
         base += element.type === 'text' && element.styleType === 'normal' 
            ? "border border-dashed border-gray-400 " 
            : "border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ";
    }
    return base;
  };

  // Boost Z-Index when selected
  const currentZIndex = isSelected && !readOnly ? 100 : element.zIndex;

  return (
    <div
      ref={elementRef}
      className={getOuterStyles()}
      style={{
        width: element.width,
        height: element.height,
        transform: `translate(${element.x}px, ${element.y}px) rotate(${element.rotation}deg)`,
        zIndex: currentZIndex,
        touchAction: 'none'
      }}
      onPointerDown={(e) => handlePointerDown(e, 'drag')}
      onDoubleClick={() => !readOnly && !isLocked && element.type === 'text' && setIsEditing(true)}
    >
      {/* Inner Content Wrapper */}
      <div className={getInnerStyles()}>
         {renderContent()}
      </div>

      {/* Tape Decoration */}
      {element.styleType === 'tape' && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-yellow-200/80 rotate-3 z-10 shadow-sm border border-yellow-400/50 pointer-events-none"></div>
      )}

      {/* Lock Indicator (Visible even if not selected if locked) */}
      {isLocked && (
        <div className="absolute top-2 right-2 text-red-500 opacity-50 z-20 pointer-events-auto cursor-pointer" onClick={() => setIsLocked(false)}>
            <Lock size={16} />
        </div>
      )}

      {/* Selection UI */}
      {isSelected && !readOnly && !isEditing && (
        <>
          <div className={`absolute inset-0 border-2 ${isLocked ? 'border-red-400 border-dashed' : 'border-blue-500'} pointer-events-none z-50`} />
          
          {!isLocked && (
            <>
              {/* Rotate Handle */}
              <div
                className="absolute -top-12 left-1/2 -translate-x-1/2 w-8 h-8 md:w-7 md:h-7 bg-white border-2 border-black rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center shadow-sm z-50 hover:bg-gray-100 pointer-events-auto touch-none"
                onPointerDown={(e) => handlePointerDown(e, 'rotate')}
              >
                <span className="block w-1.5 h-1.5 bg-black rounded-full"></span>
              </div>

              {/* Resize Handle - Larger touch target */}
              <div
                className="absolute -bottom-4 -right-4 w-8 h-8 md:w-6 md:h-6 bg-black border-2 border-white cursor-nwse-resize shadow-md z-50 pointer-events-auto touch-none"
                onPointerDown={(e) => handlePointerDown(e, 'resize')}
              />

              {/* Delete Action */}
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(element.id); }} 
                className="absolute -top-4 -right-4 w-8 h-8 md:w-7 md:h-7 bg-red-500 text-white border-2 border-white rounded-full flex items-center justify-center shadow-md z-50 hover:scale-110 hover:bg-red-600 transition-transform pointer-events-auto"
                title="删除"
              >
                <X size={16} />
              </button>

              {/* Layer Controls (Generic) */}
              <div className="absolute -bottom-10 md:-bottom-3.5 left-1/2 -translate-x-1/2 flex gap-2 z-50">
                  <button 
                      onClick={(e) => { e.stopPropagation(); onUpdate(element.id, { zIndex: element.zIndex + 1 }, true); }} 
                      className="w-8 h-8 md:w-7 md:h-7 bg-white border-2 border-black rounded-full flex items-center justify-center shadow-md hover:scale-110 pointer-events-auto"
                      title="上移一层"
                  >
                      <ArrowUp size={16} />
                  </button>
                   <button 
                      onClick={(e) => { e.stopPropagation(); onUpdate(element.id, { zIndex: Math.max(0, element.zIndex - 1) }, true); }} 
                      className="w-8 h-8 md:w-7 md:h-7 bg-white border-2 border-black rounded-full flex items-center justify-center shadow-md hover:scale-110 pointer-events-auto"
                      title="下移一层"
                  >
                      <ArrowDown size={16} />
                  </button>
              </div>

              {/* Style/Type Action (Palette) */}
              {element.type !== 'shape' && element.type !== 'audio' && (
                <button 
                    onClick={(e) => { e.stopPropagation(); const newType = element.styleType === 'normal' ? 'polaroid' : element.styleType === 'polaroid' ? 'tape' : 'normal'; onUpdate(element.id, { styleType: newType }, true); }} 
                    className="absolute -bottom-4 -left-4 w-8 h-8 md:w-7 md:h-7 bg-black text-white border-2 border-white rounded-full flex items-center justify-center shadow-md z-50 hover:scale-110 transition-transform pointer-events-auto"
                    title="切换样式"
                >
                    <Palette size={16} />
                </button>
              )}

              {/* Lock Action */}
              <button 
                  onClick={(e) => { e.stopPropagation(); setIsLocked(true); onSelect(null); }} 
                  className="absolute top-1/2 -right-12 -translate-y-1/2 w-8 h-8 md:w-7 md:h-7 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center shadow-md z-50 hover:bg-gray-100 pointer-events-auto"
                  title="锁定元素"
              >
                  <Unlock size={16} className="text-gray-500" />
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
};
