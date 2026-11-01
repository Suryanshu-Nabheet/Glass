// FILE: EnvironmentEditorSection.tsx
// Purpose: "Editor" section of the Environment panel — the in-app Editor view as the
//          default first row, followed by the "Open in <editor>" external-launcher picker
//          (same skin as Commit and Push / env pickers). The menu lists every installed
//          editor (same entries as the header OpenInPicker).
// Layer: Environment panel section

import type { EditorId, ResolvedKeybindingsConfig } from "@glass/contracts";

import { useEditorLaunchers } from "~/hooks/useEditorLaunchers";
import { LayoutSidebarIcon } from "~/lib/icons";
import {
  ENVIRONMENT_ROW_ICON_CLASS_NAME,
  EnvironmentRow,
  EnvironmentLabeledSection,
} from "./EnvironmentRow";

export function EnvironmentEditorSection({
  keybindings,
  availableEditors,
  openInTarget,
  onOpenEditorView,
}: {
  keybindings: ResolvedKeybindingsConfig;
  availableEditors: ReadonlyArray<EditorId>;
  openInTarget: string | null;
  /** Open the in-app editor workspace view; omitted on surfaces that can't host it. */
  onOpenEditorView?: () => void;
}) {
  const {
    options,
    preferredEditor,
    primaryOption,
    openFavoriteShortcutLabel,
    setDefaultEditor,
    openInEditor,
  } = useEditorLaunchers({
    keybindings,
    availableEditors,
    openInTarget,
  });

  // Render the section whenever there is at least one entry to show — the in-app
  // editor view, an external editor, or both.
  if (options.length === 0 && !onOpenEditorView) {
    return null;
  }

  const activeOption = primaryOption ?? options[0] ?? null;
  const ActiveIcon = activeOption?.Icon;

  return (
    <EnvironmentLabeledSection label="Editor">
      {onOpenEditorView ? (
        <EnvironmentRow
          icon={<LayoutSidebarIcon aria-hidden className={ENVIRONMENT_ROW_ICON_CLASS_NAME} />}
          label="Editor view"
          onClick={onOpenEditorView}
        />
      ) : null}
      <EnvironmentRow
        disabled={!openInTarget || !preferredEditor}
        icon={
          ActiveIcon ? <ActiveIcon aria-hidden className={ENVIRONMENT_ROW_ICON_CLASS_NAME} /> : null
        }
        label="Open in IDE"
        onClick={() => openInEditor(preferredEditor)}
      />
    </EnvironmentLabeledSection>
  );
}
