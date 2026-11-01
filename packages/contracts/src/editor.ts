// FILE: editor.ts
// Purpose: Define editor ids and launch metadata shared by the client and server.
// Layer: Shared contracts
// Exports: EDITORS, EditorId, OpenInEditorInput

import { Schema } from "effect";
import { TrimmedNonEmptyString } from "./baseSchemas";

export const EditorLaunchStyle = Schema.Literals([
  "direct-path",
  "goto",
  "line-column",
  "terminal-working-directory",
]);
export type EditorLaunchStyle = typeof EditorLaunchStyle.Type;

export type WindowsStorePackageDefinition = {
  readonly packageName: string;
  readonly publisherId: string;
};

export type EditorDefinition = {
  readonly id: string;
  readonly label: string;
  readonly commands: readonly [string, ...string[]] | null;
  readonly macApplications?: readonly [string, ...string[]];
  readonly windowsUriScheme?: string;
  readonly windowsStorePackages?: readonly [
    WindowsStorePackageDefinition,
    ...WindowsStorePackageDefinition[],
  ];
  readonly launchStyle: EditorLaunchStyle;
};

export const EDITORS = [
  {
    id: "glass",
    label: "Glass",
    commands: ["glass", "code"],
    macApplications: ["Glass", "Visual Studio Code"],
    windowsUriScheme: "glass",
    launchStyle: "goto",
  },
  { id: "file-manager", label: "File Manager", commands: null, launchStyle: "direct-path" },
  { id: "system-default", label: "Default app", commands: null, launchStyle: "direct-path" },
] as const satisfies ReadonlyArray<EditorDefinition>;

export const EditorId = Schema.Literals(EDITORS.map((e) => e.id));
export type EditorId = typeof EditorId.Type;

export const OpenInEditorInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  editor: EditorId,
});
export type OpenInEditorInput = typeof OpenInEditorInput.Type;
