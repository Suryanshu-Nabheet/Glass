// FILE: transientNativeApiErrors.ts
// Purpose: Classify Native API / WebSocket failures that should backoff-retry in React Query.
// Layer: Web transport helpers

import { WsRpcError } from "@glass/contracts";
import { Schema } from "effect";

import { isRuntimeInterruptFailure, WsTransportRequestInterruptedError } from "../wsTransport";

export const PROFILE_STATS_MAX_QUERY_RETRIES = 8;

export function isTransientNativeApiError(error: unknown): boolean {
  if (error instanceof WsTransportRequestInterruptedError) {
    return error.retryable !== false;
  }
  if (Schema.is(WsRpcError)(error)) {
    if (error.retryable === true) return true;
    if (error.code === "RPC_EXPENSIVE_READ_CAPACITY_EXCEEDED") return true;
    return false;
  }
  if (isRuntimeInterruptFailure(error)) return true;
  if (error instanceof Error) {
    if (error.message === "Native API not found") return true;
    if (error.message.includes("Missing runtime for WebSocket")) return true;
    if (error.message.includes("WebSocket RPC") && error.message.includes("timed out")) {
      return true;
    }
  }
  return false;
}

export function profileStatsQueryRetry(failureCount: number, error: unknown): boolean {
  return failureCount < PROFILE_STATS_MAX_QUERY_RETRIES && isTransientNativeApiError(error);
}

export function profileStatsQueryRetryDelay(attemptIndex: number): number {
  return Math.min(250 * 2 ** attemptIndex, 5_000);
}
