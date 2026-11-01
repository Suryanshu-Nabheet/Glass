// FILE: useWsTransportOpen.ts
// Purpose: True when the browser WebSocket transport is connected and ready for RPC.
// Layer: Web hook

import { useSyncExternalStore } from "react";

import { addWsTransportStateListener, readLatestWsTransportState } from "~/wsTransportEvents";

function subscribe(onStoreChange: () => void): () => void {
  return addWsTransportStateListener(() => onStoreChange(), { replayCurrent: true });
}

function getSnapshot(): boolean {
  return readLatestWsTransportState() === "open";
}

function getServerSnapshot(): boolean {
  return false;
}

export function useWsTransportOpen(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
