// FILE: useDesktopAppIcon.ts
// Purpose: Keep the persisted app-icon preference applied to the native desktop shell.
// Layer: Web-to-desktop lifecycle bridge

import { useEffect, useRef } from "react";

import type { DesktopAppIcon } from "@glass/contracts";
import { useAppSettings } from "~/appSettings";

interface DesktopAppIconSynchronizerInput {
  readonly getAppIcon: () => Promise<DesktopAppIcon>;
  readonly setAppIcon: (icon: DesktopAppIcon) => Promise<void>;
  readonly updateRendererIcon: (icon: DesktopAppIcon) => void;
}

export function createDesktopAppIconSynchronizer(input: DesktopAppIconSynchronizerInput) {
  let nativeIcon: DesktopAppIcon | null = null;

  const hydrate = async (rendererIcon: DesktopAppIcon): Promise<void> => {
    const durableIcon = await input.getAppIcon().catch(() => rendererIcon);
    nativeIcon = durableIcon;
    if (durableIcon !== rendererIcon) input.updateRendererIcon(durableIcon);
  };

  const apply = async (rendererIcon: DesktopAppIcon): Promise<void> => {
    if (nativeIcon === null || nativeIcon === rendererIcon) return;
    const previousIcon = nativeIcon;
    nativeIcon = rendererIcon;
    try {
      await input.setAppIcon(rendererIcon);
    } catch (error) {
      nativeIcon = previousIcon;
      input.updateRendererIcon(previousIcon);
      throw error;
    }
  };

  return { hydrate, apply } as const;
}

const FAVICON_BY_APP_ICON: Record<DesktopAppIcon, string> = {
  default: "/app-icons/default.png",
  icon: "/app-icons/dark.png",
  dark: "/app-icons/dark.png",
};

export function updateDocumentFavicon(icon: DesktopAppIcon): void {
  if (typeof document === "undefined") return;
  const href = FAVICON_BY_APP_ICON[icon] ?? "/favicon.ico";
  const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (link) {
    link.href = href;
    link.type = href.endsWith(".ico") ? "image/x-icon" : "image/png";
  }
  const appleTouch = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
  if (appleTouch) {
    appleTouch.href = href;
  }
}

export function useDesktopAppIcon(): void {
  const { settings, updateSettings } = useAppSettings();
  const latestRendererIconRef = useRef(settings.desktopAppIcon);
  const updateSettingsRef = useRef(updateSettings);
  const synchronizerRef = useRef<ReturnType<typeof createDesktopAppIconSynchronizer> | null>(null);
  latestRendererIconRef.current = settings.desktopAppIcon;
  updateSettingsRef.current = updateSettings;

  useEffect(() => {
    const bridge = window.desktopBridge;
    if (!bridge) return;

    let disposed = false;
    const synchronizer = createDesktopAppIconSynchronizer({
      getAppIcon: bridge.getAppIcon ?? (() => Promise.resolve(latestRendererIconRef.current)),
      setAppIcon: bridge.setAppIcon,
      updateRendererIcon: (desktopAppIcon) => {
        if (!disposed) updateSettingsRef.current({ desktopAppIcon });
      },
    });
    synchronizerRef.current = synchronizer;
    void synchronizer.hydrate(latestRendererIconRef.current);

    return () => {
      disposed = true;
      if (synchronizerRef.current === synchronizer) synchronizerRef.current = null;
    };
  }, []);

  useEffect(() => {
    updateDocumentFavicon(settings.desktopAppIcon);
    void synchronizerRef.current?.apply(settings.desktopAppIcon).catch(() => undefined);
  }, [settings.desktopAppIcon]);
}
