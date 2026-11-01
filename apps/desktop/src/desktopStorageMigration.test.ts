import * as FS from "node:fs";
import * as OS from "node:os";
import * as Path from "node:path";

import { describe, expect, it } from "vitest";

import {
  acknowledgeGlassStorageSnapshot,
  readGlassStorageSnapshot,
  saveGlassStorageSnapshot,
  GLASS_STORAGE_SNAPSHOT_MAX_BYTES,
  validateGlassStorageSnapshot,
} from "./desktopStorageMigration";

const snapshot = (exportedAt = "2026-07-09T00:00:00.000Z") => ({
  version: 1 as const,
  exportedAt,
  entries: {
    "glass:theme": "dark",
    "glass.openUsage.enabled": "true",
  },
});

describe("desktopStorageMigration", () => {
  it("round-trips atomically and acknowledges the snapshot", async () => {
    const directory = FS.mkdtempSync(Path.join(OS.tmpdir(), "glass-storage-migration-"));
    const target = Path.join(directory, "snapshot.json");
    try {
      await expect(saveGlassStorageSnapshot(target, snapshot())).resolves.toBe(true);
      expect(readGlassStorageSnapshot(target)).toEqual(snapshot());
      expect(FS.readdirSync(directory)).toEqual(["snapshot.json"]);

      await acknowledgeGlassStorageSnapshot(target);
      expect(readGlassStorageSnapshot(target)).toBeNull();
    } finally {
      FS.rmSync(directory, { recursive: true, force: true });
    }
  });

  it("rejects malformed, disallowed, and oversized snapshots", () => {
    expect(validateGlassStorageSnapshot({ version: 1 })).toBeNull();
    expect(
      validateGlassStorageSnapshot({
        ...snapshot(),
        entries: { "foreign:theme": "dark" },
      }),
    ).toBeNull();
    expect(
      validateGlassStorageSnapshot({
        ...snapshot(),
        entries: { "glass:large": "x".repeat(GLASS_STORAGE_SNAPSHOT_MAX_BYTES) },
      }),
    ).toBeNull();
  });

  it("accepts renderer snapshots containing large composer drafts", () => {
    const largeDraft = "x".repeat(2 * 1024 * 1024);

    expect(
      validateGlassStorageSnapshot({
        ...snapshot(),
        entries: { "glass:composer-drafts:v1": largeDraft },
      })?.entries["glass:composer-drafts:v1"],
    ).toBe(largeDraft);
  });

  it("does not replace a newer snapshot with an older export", async () => {
    const directory = FS.mkdtempSync(Path.join(OS.tmpdir(), "glass-storage-migration-"));
    const target = Path.join(directory, "snapshot.json");
    try {
      await saveGlassStorageSnapshot(target, snapshot("2026-07-09T01:00:00.000Z"));
      await expect(
        saveGlassStorageSnapshot(target, snapshot("2026-07-09T00:00:00.000Z")),
      ).resolves.toBe(false);
      expect(readGlassStorageSnapshot(target)?.exportedAt).toBe("2026-07-09T01:00:00.000Z");
    } finally {
      FS.rmSync(directory, { recursive: true, force: true });
    }
  });

  it("treats missing and malformed files as absent", () => {
    const directory = FS.mkdtempSync(Path.join(OS.tmpdir(), "glass-storage-migration-"));
    const target = Path.join(directory, "snapshot.json");
    try {
      expect(readGlassStorageSnapshot(target)).toBeNull();
      FS.writeFileSync(target, "not json");
      expect(readGlassStorageSnapshot(target)).toBeNull();
    } finally {
      FS.rmSync(directory, { recursive: true, force: true });
    }
  });
});
