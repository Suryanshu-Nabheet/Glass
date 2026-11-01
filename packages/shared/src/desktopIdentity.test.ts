import { describe, expect, it } from "vitest";

import {
  resolveGlassDesktopFlavor,
  GLASS_CANARY_BUNDLE_ID,
  GLASS_CANARY_DESKTOP_ENTRY_URL,
  GLASS_CANARY_DESKTOP_ORIGIN,
  GLASS_DESKTOP_ENTRY_URL,
  GLASS_DESKTOP_ORIGIN,
  GLASS_DESKTOP_UPDATE_CHANNEL,
  GLASS_DEVELOPMENT_BUNDLE_ID,
  GLASS_PRODUCTION_BUNDLE_ID,
  glassBundleId,
  glassDesktopIdentity,
} from "./desktopIdentity";

describe("desktopIdentity", () => {
  it("uses the exact canonical production and development bundle IDs", () => {
    expect(GLASS_PRODUCTION_BUNDLE_ID).toBe("com.suryanshunabheet.glass");
    expect(GLASS_DEVELOPMENT_BUNDLE_ID).toBe("com.suryanshunabheet.glass.dev");
    expect(glassBundleId(false)).toBe(GLASS_PRODUCTION_BUNDLE_ID);
    expect(glassBundleId(true)).toBe(GLASS_DEVELOPMENT_BUNDLE_ID);
  });

  it("uses the exact packaged renderer origin and entry URL", () => {
    expect(GLASS_DESKTOP_ORIGIN).toBe("glass://app");
    expect(GLASS_DESKTOP_ENTRY_URL).toBe("glass://app/index.html");
  });

  it("uses the isolated Glass desktop update channel", () => {
    expect(GLASS_DESKTOP_UPDATE_CHANNEL).toBe("glass");
  });

  it("gives Canary a fully separate desktop identity and storage profile", () => {
    expect(GLASS_CANARY_BUNDLE_ID).toBe("com.suryanshunabheet.glass.canary");
    expect(GLASS_CANARY_DESKTOP_ORIGIN).toBe("glass-canary://app");
    expect(GLASS_CANARY_DESKTOP_ENTRY_URL).toBe("glass-canary://app/index.html");
    expect(glassDesktopIdentity("canary")).toEqual({
      flavor: "canary",
      displayName: "Glass Canary",
      bundleId: GLASS_CANARY_BUNDLE_ID,
      scheme: "glass-canary",
      origin: GLASS_CANARY_DESKTOP_ORIGIN,
      entryUrl: GLASS_CANARY_DESKTOP_ENTRY_URL,
      userDataDirectoryName: "glass-canary",
      defaultHomeDirectoryName: ".glass-canary",
      usesScriptedUpdates: true,
    });
  });

  it("selects Canary explicitly without changing normal dev and production defaults", () => {
    expect(resolveGlassDesktopFlavor({ isDevelopment: false })).toBe("production");
    expect(resolveGlassDesktopFlavor({ isDevelopment: true })).toBe("development");
    expect(resolveGlassDesktopFlavor({ isDevelopment: false, requestedFlavor: " canary " })).toBe(
      "canary",
    );
    expect(resolveGlassDesktopFlavor({ isDevelopment: true, requestedFlavor: "canary" })).toBe(
      "canary",
    );
  });
});
