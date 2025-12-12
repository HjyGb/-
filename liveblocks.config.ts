import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import { Page } from "./types";

export const client = createClient({
  // ⚠️ replace with your public key from https://liveblocks.io/dashboard/apikeys
  publicApiKey: (import.meta as any).env.VITE_LIVEBLOCKS_PUBLIC_KEY || "pk_dev_REPLACE_WITH_YOUR_KEY",
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