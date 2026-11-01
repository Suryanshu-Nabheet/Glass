// FILE: desktopIdentity.ts
// Purpose: Defines the canonical desktop application identity across packaging and runtime.

export const GLASS_DESKTOP_SCHEME = "glass";
export const GLASS_DESKTOP_ORIGIN = `${GLASS_DESKTOP_SCHEME}://app`;
export const GLASS_DESKTOP_ENTRY_URL = `${GLASS_DESKTOP_ORIGIN}/index.html`;
export const GLASS_DESKTOP_UPDATE_CHANNEL = "glass";
export const GLASS_PRODUCTION_BUNDLE_ID = "com.suryanshunabheet.glass";
export const GLASS_DEVELOPMENT_BUNDLE_ID = `${GLASS_PRODUCTION_BUNDLE_ID}.dev`;
export const GLASS_CANARY_BUNDLE_ID = `${GLASS_PRODUCTION_BUNDLE_ID}.canary`;
export const GLASS_CANARY_DESKTOP_SCHEME = "glass-canary";
export const GLASS_CANARY_DESKTOP_ORIGIN = `${GLASS_CANARY_DESKTOP_SCHEME}://app`;
export const GLASS_CANARY_DESKTOP_ENTRY_URL = `${GLASS_CANARY_DESKTOP_ORIGIN}/index.html`;

export type GlassDesktopFlavor = "production" | "development" | "canary";

export interface GlassDesktopIdentity {
  readonly flavor: GlassDesktopFlavor;
  readonly displayName: string;
  readonly bundleId: string;
  readonly scheme: string;
  readonly origin: string;
  readonly entryUrl: string;
  readonly userDataDirectoryName: string;
  readonly defaultHomeDirectoryName: string;
  readonly usesScriptedUpdates: boolean;
}

export function resolveGlassDesktopFlavor(input: {
  readonly isDevelopment: boolean;
  readonly requestedFlavor?: string | undefined;
}): GlassDesktopFlavor {
  if (input.requestedFlavor?.trim().toLowerCase() === "canary") {
    return "canary";
  }
  return input.isDevelopment ? "development" : "production";
}

export function glassDesktopIdentity(flavor: GlassDesktopFlavor): GlassDesktopIdentity {
  if (flavor === "canary") {
    return {
      flavor,
      displayName: "Glass Canary",
      bundleId: GLASS_CANARY_BUNDLE_ID,
      scheme: GLASS_CANARY_DESKTOP_SCHEME,
      origin: GLASS_CANARY_DESKTOP_ORIGIN,
      entryUrl: GLASS_CANARY_DESKTOP_ENTRY_URL,
      userDataDirectoryName: "glass-canary",
      defaultHomeDirectoryName: ".glass-canary",
      usesScriptedUpdates: true,
    };
  }
  if (flavor === "development") {
    return {
      flavor,
      displayName: "Glass (Dev)",
      bundleId: GLASS_DEVELOPMENT_BUNDLE_ID,
      scheme: GLASS_DESKTOP_SCHEME,
      origin: GLASS_DESKTOP_ORIGIN,
      entryUrl: GLASS_DESKTOP_ENTRY_URL,
      userDataDirectoryName: "glass-dev",
      defaultHomeDirectoryName: ".glass",
      usesScriptedUpdates: false,
    };
  }
  return {
    flavor,
    displayName: "Glass",
    bundleId: GLASS_PRODUCTION_BUNDLE_ID,
    scheme: GLASS_DESKTOP_SCHEME,
    origin: GLASS_DESKTOP_ORIGIN,
    entryUrl: GLASS_DESKTOP_ENTRY_URL,
    userDataDirectoryName: "glass",
    defaultHomeDirectoryName: ".glass",
    usesScriptedUpdates: false,
  };
}

export function glassBundleId(isDevelopment: boolean): string {
  return glassDesktopIdentity(isDevelopment ? "development" : "production").bundleId;
}
