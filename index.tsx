
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { RoomProvider } from './liveblocks.config';
import { Page, PageElement } from './types';
import { LiveList, LiveObject } from '@liveblocks/client';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Check if we have a valid key
const envKey = (import.meta as any).env.VITE_LIVEBLOCKS_PUBLIC_KEY;
const hasEnvKey = envKey && !envKey.includes("REPLACE_WITH_YOUR_KEY");
const hasStoredKey = localStorage.getItem("lb_public_key");

// Setup Screen Component
const SetupScreen = () => {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!key.startsWith("pk_")) {
      setError("API Key 格式不正确，通常以 pk_dev_ 或 pk_prod_ 开头");
      return;
    }
    localStorage.setItem("lb_public_key", key);
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#f3f4f6] p-4 font-sans text-gray-800">
      <div className="w-full max-w-lg bg-white p-8 rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-2 border-black">
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2 border-b-2 border-black pb-4">
           🗝️ 配置 Liveblocks
        </h1>
        <p className="text-gray-600 mb-6 text-sm leading-relaxed">
          Manga Journal 使用 Liveblocks 实现多人实时协同。由于当前环境未配置环境变量，请手动输入你的 Public API Key。
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
           <strong>如何获取 Key:</strong>
           <ol className="list-decimal list-inside mt-2 space-y-1 opacity-80">
              <li>访问 <a href="https://liveblocks.io" target="_blank" rel="noreferrer" className="underline font-bold hover:text-blue-600">liveblocks.io</a> 并注册/登录</li>
              <li>创建一个新项目 (Project)</li>
              <li>点击左侧菜单的 <strong>API keys</strong></li>
              <li>复制 <strong>Public key</strong> (以 <code>pk_</code> 开头)</li>
           </ol>
        </div>

        <div className="space-y-4">
            <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Public API Key</label>
                <input 
                    type="text" 
                    value={key}
                    onChange={e => { setKey(e.target.value); setError(""); }}
                    placeholder="pk_dev_xxxxxxxxxxxxxxxx..."
                    className="w-full border-2 border-gray-300 rounded p-3 focus:border-black focus:outline-none font-mono text-sm transition-colors"
                />
                {error && <p className="text-red-500 text-xs mt-1 font-bold">{error}</p>}
            </div>

            <button 
                onClick={handleSave}
                disabled={!key}
                className="w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
                保存并进入手账
            </button>
            
            <p className="text-center text-[10px] text-gray-400 mt-4">
               Key 将仅保存在你的浏览器本地存储中 (LocalStorage)
            </p>
        </div>
      </div>
    </div>
  );
};

// Render Logic
if (!hasEnvKey && !hasStoredKey) {
  root.render(
    <React.StrictMode>
       <SetupScreen />
    </React.StrictMode>
  );
} else {
  // Logic to handle Room ID
  const getRoomId = () => {
    const params = new URLSearchParams(window.location.search);
    const existingId = params.get("room");
    if (existingId) return existingId;

    // Generate random ID if missing
    const newId = "journal-" + Math.random().toString(36).substring(2, 9);
    
    // Sync to URL immediately so refreshing keeps the room and copying URL works
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("room", newId);
    window.history.replaceState(null, "", newUrl.toString());
    
    return newId;
  };

  const roomId = getRoomId();

  const INITIAL_PAGES: Page[] = [
    { id: 'cover', background: 'manga-lines', elements: [
        { id: 'title', type: 'text', content: '我的漫画手账\nJOURNAL', x: 50, y: 150, width: 300, height: 200, rotation: -5, zIndex: 1, styleType: 'normal', fontFamily: 'hand', color: '#000000', fontWeight: 'bold', fontSize: 48, textAlign: 'center' }
    ] },
    { id: 'p1', background: 'white', elements: [] },
    { id: 'p2', background: 'dots', elements: [] },
  ];

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
}
