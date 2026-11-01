// FILE: glassHome.ts
// Purpose: Resolves the user-level Glass base directory without Effect, so the backend
// server and the Electron main process agree on one location during early startup.
// Exports: expandHomePath, resolveGlassHomeDirectory, GLASS_HOME_ENV_NAME.

import * as OS from "node:os";
import * as Path from "node:path";

export const GLASS_HOME_ENV_NAME = "GLASS_HOME";
export const DEFAULT_GLASS_HOME_DIRECTORY_NAME = ".glass";

/** Expands a leading `~` against the user's home directory; other inputs pass through. */
export function expandHomePath(input: string, homeDirectory: string = OS.homedir()): string {
  if (input === "~") {
    return homeDirectory;
  }
  if (input.startsWith("~/") || input.startsWith("~\\")) {
    return Path.join(homeDirectory, input.slice(2));
  }
  return input;
}

/**
 * Resolves the Glass base directory the same way for every process in the install.
 */
export function resolveGlassHomeDirectory(
  options: {
    /** Explicit override; falls back to `GLASS_HOME` or `GLASS_HOME` from `env`. */
    readonly configuredHome?: string | undefined;
    readonly env?: NodeJS.ProcessEnv;
    readonly homeDirectory?: string;
    /** Flavor-specific default (`.glass-canary`), used only when nothing is configured. */
    readonly directoryName?: string;
  } = {},
): string {
  const homeDirectory = options.homeDirectory ?? OS.homedir();
  const env = options.env ?? process.env;
  const configured = (options.configuredHome ?? env.GLASS_HOME ?? env.GLASS_HOME)?.trim();
  if (!configured) {
    return Path.join(homeDirectory, options.directoryName ?? DEFAULT_GLASS_HOME_DIRECTORY_NAME);
  }
  return Path.resolve(expandHomePath(configured, homeDirectory));
}
