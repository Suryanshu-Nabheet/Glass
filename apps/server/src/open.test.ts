import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import { assertSuccess } from "@effect/vitest/utils";
import { EDITORS } from "@glass/contracts";
import { FileSystem, Path, Effect } from "effect";

import {
  isCommandAvailable,
  launchDetached,
  resolveAvailableEditors,
  resolveEditorLaunch,
  resolveWindowsEditorUriLaunch,
} from "./open";
import {
  clearWindowsStorePackageDiscoveryCache,
  getEditorWindowsStorePackages,
  resolveWindowsStorePackageDirectory,
  resolveWindowsStorePackageDirectoryFromPowerShell,
  resolveWindowsStorePackageInstallLocation,
} from "./editorAppDiscovery";

function encodeExpectedWindowsEditorUriPath(targetPath: string): string {
  return targetPath
    .replaceAll("\\", "/")
    .split("/")
    .map((segment) => encodeURIComponent(segment).replaceAll("%3A", ":"))
    .join("/");
}

function shellSingleQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function fakePowerShellAppxScript(installLocation: string): string {
  return `#!/bin/sh\nprintf '%s\\n' ${shellSingleQuote(installLocation)}\n`;
}

it.layer(NodeServices.layer)("resolveEditorLaunch", (it) => {
  it.effect("returns commands for command-based editors", () =>
    Effect.gen(function* () {
      const glassLaunch = yield* resolveEditorLaunch(
        { cwd: "/tmp/workspace", editor: "glass" },
        "linux",
        { PATH: "" },
      );
      assert.deepEqual(glassLaunch, {
        command: "glass",
        args: ["/tmp/workspace"],
      });
    }),
  );

  it.effect("uses --goto when editor supports line/column suffixes for Glass", () =>
    Effect.gen(function* () {
      const lineOnly = yield* resolveEditorLaunch(
        { cwd: "/tmp/workspace/AGENTS.md:48", editor: "glass" },
        "linux",
        { PATH: "" },
      );
      assert.deepEqual(lineOnly, {
        command: "glass",
        args: ["--goto", "/tmp/workspace/AGENTS.md:48"],
      });

      const lineAndColumn = yield* resolveEditorLaunch(
        { cwd: "/tmp/workspace/src/open.ts:71:5", editor: "glass" },
        "linux",
        { PATH: "" },
      );
      assert.deepEqual(lineAndColumn, {
        command: "glass",
        args: ["--goto", "/tmp/workspace/src/open.ts:71:5"],
      });
    }),
  );

  it.effect("falls back to the Glass URL handler on Windows when the CLI is absent", () =>
    Effect.gen(function* () {
      const launch = yield* resolveEditorLaunch(
        { cwd: "C:\\Users\\Chris\\Project Folder\\src\\open.ts:71:5", editor: "glass" },
        "win32",
        { PATH: "", PATHEXT: ".COM;.EXE;.BAT;.CMD", SystemRoot: "C:\\Windows" },
      );

      assert.deepEqual(launch, {
        command: "C:\\Windows\\explorer.exe",
        args: ["glass://file/C:/Users/Chris/Project%20Folder/src/open.ts:71:5"],
      });
    }),
  );

  it.effect("preserves UNC paths in Glass URL-handler launches", () =>
    Effect.gen(function* () {
      const launch = yield* resolveEditorLaunch(
        { cwd: "\\\\server\\share\\Project Folder\\src\\open.ts:71:5", editor: "glass" },
        "win32",
        { PATH: "", PATHEXT: ".COM;.EXE;.BAT;.CMD", SystemRoot: "C:\\Windows" },
      );

      assert.deepEqual(launch, {
        command: "C:\\Windows\\explorer.exe",
        args: ["glass://file//server/share/Project%20Folder/src/open.ts:71:5"],
      });
    }),
  );

  it.effect("adds the Glass URL-handler trailing slash for existing folders", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const dir = yield* fs.makeTempDirectoryScoped({ prefix: "glass-folder-" });
      const folderPath = path.join(dir, "Project Folder");
      yield* fs.makeDirectory(folderPath);

      const launch = yield* resolveEditorLaunch({ cwd: folderPath, editor: "glass" }, "win32", {
        PATH: "",
        PATHEXT: ".COM;.EXE;.BAT;.CMD",
        SystemRoot: "C:\\Windows",
      });

      assert.deepEqual(launch, {
        command: "C:\\Windows\\explorer.exe",
        args: [`glass://file/${encodeExpectedWindowsEditorUriPath(folderPath)}/`],
      });
    }),
  );

  it("does not build URL-handler launches for non-Windows platforms", () => {
    const editor = EDITORS.find((candidate) => candidate.id === "glass");
    assert.ok(editor);
    assert.equal(resolveWindowsEditorUriLaunch(editor, "/tmp/workspace", "linux"), null);
  });

  it.effect("falls back to installed macOS app bundles when launchers are absent", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const home = yield* fs.makeTempDirectoryScoped({ prefix: "glass-open-apps-" });
      yield* fs.makeDirectory(path.join(home, "Applications", "Glass.app"), {
        recursive: true,
      });

      const glassLaunch = yield* resolveEditorLaunch(
        { cwd: "/tmp/workspace", editor: "glass" },
        "darwin",
        { HOME: home, PATH: "" },
      );
      assert.deepEqual(glassLaunch, {
        command: "open",
        args: ["-a", "Glass", "/tmp/workspace"],
      });

      const availableEditors = resolveAvailableEditors("darwin", { HOME: home, PATH: "" });
      assert.equal(availableEditors.includes("glass"), true);
    }),
  );

  it.effect("maps file-manager editor to OS open commands", () =>
    Effect.gen(function* () {
      const launch1 = yield* resolveEditorLaunch(
        { cwd: "/tmp/workspace", editor: "file-manager" },
        "darwin",
      );
      assert.deepEqual(launch1, {
        command: "open",
        args: ["/tmp/workspace"],
      });

      const launch2 = yield* resolveEditorLaunch(
        { cwd: "C:\\workspace", editor: "file-manager" },
        "win32",
      );
      assert.deepEqual(launch2, {
        command: "explorer",
        args: ["C:\\workspace"],
      });

      const launch3 = yield* resolveEditorLaunch(
        { cwd: "/tmp/workspace", editor: "file-manager" },
        "linux",
      );
      assert.deepEqual(launch3, {
        command: "xdg-open",
        args: ["/tmp/workspace"],
      });
    }),
  );
});

it.layer(NodeServices.layer)("launchDetached", (it) => {
  it.effect("resolves when command can be spawned", () =>
    Effect.gen(function* () {
      const result = yield* launchDetached({
        command: process.execPath,
        args: ["-e", "process.exit(0)"],
      }).pipe(Effect.result);
      assertSuccess(result, undefined);
    }),
  );

  it.effect("rejects when command does not exist", () =>
    Effect.gen(function* () {
      const result = yield* launchDetached({
        command: `glass-no-such-command-${Date.now()}`,
        args: [],
      }).pipe(Effect.result);
      assert.equal(result._tag, "Failure");
    }),
  );
});

it.layer(NodeServices.layer)("isCommandAvailable", (it) => {
  it.effect("resolves win32 commands with PATHEXT", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const dir = yield* fs.makeTempDirectoryScoped({ prefix: "glass-open-test-" });
      yield* fs.writeFileString(path.join(dir, "code.CMD"), "@echo off\r\n");
      const env = {
        PATH: dir,
        PATHEXT: ".COM;.EXE;.BAT;.CMD",
      } satisfies NodeJS.ProcessEnv;
      assert.equal(isCommandAvailable("code", { platform: "win32", env }), true);
    }),
  );

  it("returns false when a command is not on PATH", () => {
    const env = {
      PATH: "",
      PATHEXT: ".COM;.EXE;.BAT;.CMD",
    } satisfies NodeJS.ProcessEnv;
    assert.equal(isCommandAvailable("definitely-not-installed", { platform: "win32", env }), false);
  });

  it.effect("does not treat bare files without executable extension as available on win32", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const dir = yield* fs.makeTempDirectoryScoped({ prefix: "glass-open-test-" });
      yield* fs.writeFileString(path.join(dir, "npm"), "echo nope\r\n");
      const env = {
        PATH: dir,
        PATHEXT: ".COM;.EXE;.BAT;.CMD",
      } satisfies NodeJS.ProcessEnv;
      assert.equal(isCommandAvailable("npm", { platform: "win32", env }), false);
    }),
  );

  it.effect("appends PATHEXT for commands with non-executable extensions on win32", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const dir = yield* fs.makeTempDirectoryScoped({ prefix: "glass-open-test-" });
      yield* fs.writeFileString(path.join(dir, "my.tool.CMD"), "@echo off\r\n");
      const env = {
        PATH: dir,
        PATHEXT: ".COM;.EXE;.BAT;.CMD",
      } satisfies NodeJS.ProcessEnv;
      assert.equal(isCommandAvailable("my.tool", { platform: "win32", env }), true);
    }),
  );

  it.effect("uses platform-specific PATH delimiter for platform overrides", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const firstDir = yield* fs.makeTempDirectoryScoped({ prefix: "glass-open-test-" });
      const secondDir = yield* fs.makeTempDirectoryScoped({ prefix: "glass-open-test-" });
      yield* fs.writeFileString(path.join(firstDir, "code.CMD"), "@echo off\r\n");
      yield* fs.writeFileString(path.join(secondDir, "code.CMD"), "MZ");
      const env = {
        PATH: `${firstDir};${secondDir}`,
        PATHEXT: ".COM;.EXE;.BAT;.CMD",
      } satisfies NodeJS.ProcessEnv;
      assert.equal(isCommandAvailable("code", { platform: "win32", env }), true);
    }),
  );
});

it.layer(NodeServices.layer)("resolveAvailableEditors", (it) => {
  it.effect("returns installed editors for command launches", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const dir = yield* fs.makeTempDirectoryScoped({ prefix: "glass-editors-" });

      yield* fs.writeFileString(path.join(dir, "glass.CMD"), "@echo off\r\n");
      yield* fs.writeFileString(path.join(dir, "explorer.CMD"), "MZ");
      const editors = resolveAvailableEditors("win32", {
        PATH: dir,
        PATHEXT: ".COM;.EXE;.BAT;.CMD",
      });
      assert.deepEqual(editors, ["glass", "file-manager"]);
    }),
  );

  it.effect("returns Glass when code or glass command is found in PATH", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const dir = yield* fs.makeTempDirectoryScoped({ prefix: "glass-glass-bin-" });
      yield* fs.writeFileString(path.join(dir, "code.CMD"), "@echo off\r\n");

      const editors = resolveAvailableEditors("win32", {
        PATH: dir,
        PATHEXT: ".COM;.EXE;.BAT;.CMD",
      });
      assert.equal(editors.includes("glass"), true);
    }),
  );
});
