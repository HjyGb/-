
import React from "react";
import { useOthers } from "../liveblocks.config";
import { MousePointer2 } from "lucide-react";

const COLORS = [
  "#E57373", "#F06292", "#BA68C8", "#9575CD", "#7986CB", 
  "#64B5F6", "#4FC3F7", "#4DD0E1", "#4DB6AC", "#81C784",
  "#AED581", "#DCE775", "#FFF176", "#FFD54F", "#FFB74D", "#FF8A65"
];

export function Cursors() {
  const others = useOthers();

  return (
    <>
      {others.map(({ connectionId, presence }) => {
        if (!presence.cursor) return null;

        const color = COLORS[connectionId % COLORS.length];

        return (
          <div
            key={connectionId}
            className="pointer-events-none absolute top-0 left-0 z-[999] transition-transform duration-100 ease-linear"
            style={{
              transform: `translateX(${presence.cursor.x}px) translateY(${presence.cursor.y}px)`,
            }}
          >
            <div className="relative">
               <MousePointer2 
                 size={20} 
                 fill={color} 
                 color={color} 
                 className="text-white drop-shadow-md"
               />
               <div 
                 className="absolute left-4 top-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white whitespace-nowrap shadow-md"
                 style={{ backgroundColor: color }}
               >
                 User {connectionId}
               </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
