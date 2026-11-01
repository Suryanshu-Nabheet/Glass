import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { clearEditorIconInFlightCache, resolveCachedEditorIcon } from "./editorAppIcons";
import { clearWindowsStorePackageDiscoveryCache } from "./editorAppDiscovery";

const tempDirs: string[] = [];

afterEach(() => {
  clearEditorIconInFlightCache();
  clearWindowsStorePackageDiscoveryCache();
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function writeFakeMacAppIcon(input: {
  readonly homeDir: string;
  readonly appName: string;
  readonly iconName: string;
  readonly bytes: Uint8Array;
}): void {
  const resourcesDir = path.join(
    input.homeDir,
    "Applications",
    `${input.appName}.app`,
    "Contents",
    "Resources",
  );
  fs.mkdirSync(resourcesDir, { recursive: true });
  fs.writeFileSync(
    path.join(input.homeDir, "Applications", `${input.appName}.app`, "Contents", "Info.plist"),
    `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
  <key>CFBundleIconFile</key>
  <string>${input.iconName}</string>
</dict>
</plist>`,
  );
  fs.writeFileSync(path.join(resourcesDir, `${input.iconName}.png`), input.bytes);
}

function writeFakeLinuxDesktopIcon(input: {
  readonly homeDir: string;
  readonly desktopFileName: string;
  readonly desktopContent: string;
  readonly iconName: string;
  readonly bytes: Uint8Array;
}): void {
  const applicationsDir = path.join(input.homeDir, ".local", "share", "applications");
  const iconsDir = path.join(
    input.homeDir,
    ".local",
    "share",
    "icons",
    "hicolor",
    "256x256",
    "apps",
  );
  fs.mkdirSync(applicationsDir, { recursive: true });
  fs.mkdirSync(iconsDir, { recursive: true });
  fs.writeFileSync(path.join(applicationsDir, input.desktopFileName), input.desktopContent);
  fs.writeFileSync(path.join(iconsDir, `${input.iconName}.png`), input.bytes);
}

function writeFakeWindowsStorePackageIcon(input: {
  readonly programFilesDir: string;
  readonly packageDirName: string;
  readonly iconFileName: string;
  readonly bytes: Uint8Array;
}): void {
  const assetsDir = path.join(input.programFilesDir, "WindowsApps", input.packageDirName, "Assets");
  fs.mkdirSync(assetsDir, { recursive: true });
  fs.writeFileSync(path.join(assetsDir, input.iconFileName), input.bytes);
}

function shellSingleQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function writeFakePowerShellAppxRegistration(input: {
  readonly binDir: string;
  readonly installLocation: string;
}): void {
  fs.mkdirSync(input.binDir, { recursive: true });
  const script = `#!/bin/sh\nprintf '%s\\n' ${shellSingleQuote(input.installLocation)}\n`;
  const scriptPath = path.join(input.binDir, "powershell.exe");
  fs.writeFileSync(scriptPath, script);
  fs.chmodSync(scriptPath, 0o755);
}

describe("resolveCachedEditorIcon", () => {
  it("copies a macOS app PNG icon into the cache for Glass", async () => {
    const homeDir = makeTempDir("glass-editor-icon-home-");
    const cacheDir = makeTempDir("glass-editor-icon-cache-");
    const bytes = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);
    writeFakeMacAppIcon({
      homeDir,
      appName: "Glass",
      iconName: "Glass",
      bytes,
    });

    const icon = await resolveCachedEditorIcon({
      editorId: "glass",
      cacheDir,
      platform: "darwin",
      env: { HOME: homeDir, PATH: "" },
    });

    expect(icon?.contentType).toBe("image/png");
    expect(icon?.path.startsWith(cacheDir)).toBe(true);
    expect(icon ? fs.readFileSync(icon.path) : null).toEqual(Buffer.from(bytes));
  });

  it("resolves a Linux desktop icon by icon name for Glass", async () => {
    const homeDir = makeTempDir("glass-editor-icon-linux-home-");
    const cacheDir = makeTempDir("glass-editor-icon-linux-cache-");
    const bytes = new Uint8Array([137, 80, 78, 71, 4, 5, 6]);
    writeFakeLinuxDesktopIcon({
      homeDir,
      desktopFileName: "com.glass.Glass.desktop",
      desktopContent: [
        "[Desktop Entry]",
        "Name=Glass",
        "Exec=glass %F",
        "Icon=glass-test-icon",
      ].join("\n"),
      iconName: "glass-test-icon",
      bytes,
    });

    const icon = await resolveCachedEditorIcon({
      editorId: "glass",
      cacheDir,
      platform: "linux",
      env: { HOME: homeDir, PATH: "", XDG_DATA_DIRS: "" },
    });

    expect(icon?.contentType).toBe("image/png");
    expect(icon?.path.startsWith(cacheDir)).toBe(true);
    expect(icon ? fs.readFileSync(icon.path) : null).toEqual(Buffer.from(bytes));
  });

  it("short-circuits repeated missing native icon lookups briefly", async () => {
    const homeDir = makeTempDir("glass-editor-icon-linux-negative-home-");
    const cacheDir = makeTempDir("glass-editor-icon-linux-negative-cache-");
    const lookup = {
      editorId: "glass",
      cacheDir,
      platform: "linux" as const,
      env: { HOME: homeDir, PATH: "", XDG_DATA_DIRS: "" },
    };

    await expect(resolveCachedEditorIcon(lookup)).resolves.toBeNull();
    const bytes = new Uint8Array([137, 80, 78, 71, 13, 14, 15]);
    writeFakeLinuxDesktopIcon({
      homeDir,
      desktopFileName: "com.glass.Glass.desktop",
      desktopContent: ["[Desktop Entry]", "Name=Glass", "Exec=glass", "Icon=glass-test-icon"].join(
        "\n",
      ),
      iconName: "glass-test-icon",
      bytes,
    });

    await expect(resolveCachedEditorIcon(lookup)).resolves.toBeNull();

    clearEditorIconInFlightCache();
    const icon = await resolveCachedEditorIcon(lookup);

    expect(icon?.contentType).toBe("image/png");
    expect(icon ? fs.readFileSync(icon.path) : null).toEqual(Buffer.from(bytes));
  });

  it("returns null for unknown editor ids", async () => {
    await expect(
      resolveCachedEditorIcon({
        editorId: "missing-editor",
        cacheDir: makeTempDir("glass-editor-icon-missing-cache-"),
        platform: "darwin",
        env: { HOME: makeTempDir("glass-editor-icon-missing-home-"), PATH: "" },
      }),
    ).resolves.toBeNull();
  });
});
