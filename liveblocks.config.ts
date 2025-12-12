
import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import { Page } from "./types";

// Helper to get key from env or local storage
const getApiKey = () => {
  const envKey = (import.meta as any).env.VITE_LIVEBLOCKS_PUBLIC_KEY;
  if (envKey && !envKey.includes("REPLACE_WITH_YOUR_KEY")) {
    return envKey;
  }
  if (typeof window !== "undefined") {
    return window.localStorage.getItem("lb_public_key");
  }
  return undefined;
};

const apiKey = getApiKey();

export const client = createClient({
  publicApiKey: apiKey || "pk_dev_placeholder",
});

// Presence represents the properties that exist on every user in the Room
// and that will automatically be kept in sync. Accessible through the `user` property in the Room.
export type Presence = {
  cursor: { x: number; y: number } | null;
  editingPageId: string | null;
  selectedId: string | null;
};

// Storage represents the shared document that persists in the Room, even after all users leave.
export type Storage = {
  pages: Page[];
};

export const {
  RoomProvider,
  useMyPresence,
  useStorage,
  useMutation,
  useOthers,
  useHistory,
  useRoom,
} = createRoomContext<Presence, Storage>(client);
