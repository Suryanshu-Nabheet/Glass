import { describe, expect, it } from "vitest";
import { EDITOR_ICON_ROUTE_PATH } from "@glass/shared/editorIcons";
import {
  resolveAvailableEditorOptions,
  resolveEditorIcon,
  resolveEditorLabel,
  resolveEditorNativeIconUrl,
} from "./editorMetadata";

describe("resolveEditorLabel", () => {
  it("uses platform-specific labels for the file manager option", () => {
    expect(resolveEditorLabel("file-manager", "MacIntel")).toBe("Finder");
    expect(resolveEditorLabel("file-manager", "Win32")).toBe("Explorer");
    expect(resolveEditorLabel("file-manager", "Linux x86_64")).toBe("Files");
  });
});

describe("resolveAvailableEditorOptions", () => {
  it("surfaces every supported available editor from the shared contracts catalog", () => {
    expect(
      resolveAvailableEditorOptions("MacIntel", ["glass", "file-manager", "system-default"]).map(
        (option) => option.value,
      ),
    ).toEqual(["glass", "file-manager", "system-default"]);
  });

  it("provides dedicated icons for supported editor rows", () => {
    expect(resolveEditorIcon("glass").name).toBe("VisualStudioCode");
    expect(resolveEditorIcon("file-manager").name).toBe("FolderClosed");
  });

  it("builds authenticated editor icon route urls", () => {
    expect(resolveEditorNativeIconUrl("glass")).toContain(`${EDITOR_ICON_ROUTE_PATH}?id=glass`);
  });
});
