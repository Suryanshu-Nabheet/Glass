import { GLASS_HARNESS_POLICY_MARKER } from "../../agentGateway/harnessPolicy.ts";
import { describe, expect, it } from "vitest";

import {
  describeCursorErrorCause,
  parseCursorResume,
  takeCursorGlassHarnessPolicyTextPart,
  withCursorPlanModePrompt,
} from "./CursorAdapter.ts";

describe("Cursor Glass harness policy", () => {
  it("delivers scoped MCP host context exactly once per fresh/load/fork session", () => {
    for (const lifecycle of ["fresh", "load", "fork"] as const) {
      const state: { harnessPolicyDelivered?: boolean } = {};
      const first = takeCursorGlassHarnessPolicyTextPart(state, true);
      expect(first?.text, lifecycle).toContain(GLASS_HARNESS_POLICY_MARKER);
      expect(first?.text, lifecycle).toContain("Use the glass_* tools");
      expect(takeCursorGlassHarnessPolicyTextPart(state, true), lifecycle).toBeNull();
    }
  });

  it("stays truthful without a scoped gateway connection", () => {
    expect(takeCursorGlassHarnessPolicyTextPart({}, false)?.text).toContain(
      "Glass MCP control is unavailable",
    );
  });
});

describe("withCursorPlanModePrompt", () => {
  it("returns unchanged text when interaction mode is not plan", () => {
    expect(
      withCursorPlanModePrompt({ text: "Implement the feature", interactionMode: "default" }),
    ).toBe("Implement the feature");
    expect(withCursorPlanModePrompt({ text: "Hello" })).toBe("Hello");
  });

  it("prepends plan mode prompt instructions when interaction mode is plan", () => {
    const result = withCursorPlanModePrompt({
      text: "Build authentication flow",
      interactionMode: "plan",
    });
    expect(result).toContain("Glass Cursor plan mode is active.");
    expect(result).toContain("Do not implement or mutate files in this turn.");
    expect(result).toContain("User request:\nBuild authentication flow");
  });

  it("handles empty user request in plan mode without trailing User request block", () => {
    const result = withCursorPlanModePrompt({
      text: "   ",
      interactionMode: "plan",
    });
    expect(result).toContain("Glass Cursor plan mode is active.");
    expect(result).not.toContain("User request:");
  });
});

describe("parseCursorResume", () => {
  it("extracts sessionId from valid version 1 resume payload", () => {
    expect(parseCursorResume({ schemaVersion: 1, sessionId: "cursor-session-123" })).toEqual({
      sessionId: "cursor-session-123",
    });
  });

  it("rejects non-object or invalid version resume payloads", () => {
    expect(parseCursorResume(null)).toBeUndefined();
    expect(parseCursorResume("not an object")).toBeUndefined();
    expect(parseCursorResume([])).toBeUndefined();
    expect(parseCursorResume({ schemaVersion: 2, sessionId: "session-1" })).toBeUndefined();
    expect(parseCursorResume({ schemaVersion: 1, sessionId: "" })).toBeUndefined();
    expect(parseCursorResume({ schemaVersion: 1, sessionId: 123 })).toBeUndefined();
  });
});

describe("describeCursorErrorCause", () => {
  it("extracts message from Error instances", () => {
    expect(describeCursorErrorCause(new Error("Keychain unlock failed"))).toBe(
      "Keychain unlock failed",
    );
  });

  it("extracts trimmed text from string errors", () => {
    expect(describeCursorErrorCause("  ACP socket closed unexpectedly  ")).toBe(
      "ACP socket closed unexpectedly",
    );
  });

  it("falls back gracefully for unknown types", () => {
    expect(describeCursorErrorCause({ error: "custom" })).toBe("");
    expect(describeCursorErrorCause(null)).toBe("");
    expect(describeCursorErrorCause(undefined)).toBe("");
  });
});
