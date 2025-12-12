
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { RoomProvider } from './liveblocks.config';
import { Page, PageElement } from './types';
import { LiveList, LiveObject } from '@liveblocks/client';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Generate a random room ID or use the one from URL
const roomId = new URLSearchParams(window.location.search).get("room") || "my-manga-journal-demo";

// Initial Data Structure for new rooms
const INITIAL_PAGES: Page[] = [
  { id: 'cover', background: 'manga-lines', elements: [
      { id: 'title', type: 'text', content: '我的漫画手账\nJOURNAL', x: 50, y: 150, width: 300, height: 200, rotation: -5, zIndex: 1, styleType: 'normal', fontFamily: 'hand', color: '#000000', fontWeight: 'bold', fontSize: 48, textAlign: 'center' }
  ] },
  { id: 'p1', background: 'white', elements: [] },
  { id: 'p2', background: 'dots', elements: [] },
];

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <RoomProvider 
        id={roomId} 
        initialPresence={{ cursor: null, editingPageId: null, selectedId: null }}
        initialStorage={{
            pages: new LiveList(INITIAL_PAGES.map(p => new LiveObject({
                ...p,
                elements: new LiveList(p.elements.map(e => new LiveObject(e)))
            })))
        }}
    >
        <App />
    </RoomProvider>
  </React.StrictMode>
);
