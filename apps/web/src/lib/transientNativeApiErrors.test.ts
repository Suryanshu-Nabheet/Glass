import { WsRpcError } from "@glass/contracts";
import { describe, expect, it } from "vitest";

import { WsTransportRequestInterruptedError } from "../wsTransport";
import { isTransientNativeApiError, profileStatsQueryRetry } from "./transientNativeApiErrors";

describe("transientNativeApiErrors", () => {
  it("retries admission and transport interruptions", () => {
    expect(
      isTransientNativeApiError(
        new WsRpcError({
          message: "busy",
          code: "RPC_EXPENSIVE_READ_CAPACITY_EXCEEDED",
        }),
      ),
    ).toBe(true);
    expect(
      isTransientNativeApiError(
        new WsTransportRequestInterruptedError({
          message: "reconnect",
          code: "WS_REQUEST_RECONNECTED",
          method: "stats.getProfileStats",
          retryable: true,
        }),
      ),
    ).toBe(true);
    expect(isTransientNativeApiError(new Error("Native API not found"))).toBe(true);
  });

  it("does not retry permanent server failures", () => {
    expect(
      isTransientNativeApiError(
        new WsRpcError({
          message: "invalid",
          retryable: false,
        }),
      ),
    ).toBe(false);
    expect(
      profileStatsQueryRetry(0, new WsRpcError({ message: "invalid", retryable: false })),
    ).toBe(false);
  });
});
