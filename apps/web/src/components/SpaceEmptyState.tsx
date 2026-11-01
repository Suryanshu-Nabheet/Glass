// FILE: SpaceEmptyState.tsx
// Purpose: The one empty state for the sidebar project list, across Void and custom Spaces.
// Layer: Sidebar / Spaces UI
// Why: Void and custom Spaces each had their own empty state (plain centred text vs. a dashed
//      card with an icon bubble), so the list changed character as you moved between tabs.
//      One component, one voice: a title, a line of orientation, and an action only where
//      there is something to do.

import type { Space } from "~/types";
import {
  GLASS_NO_PROJECTS_YET,
  GLASS_SPACE_EMPTY_HINT,
  GLASS_VOID_EMPTY_HINT,
  GLASS_VOID_EMPTY_TITLE,
  glassSpaceEmptyTitle,
} from "~/productVoice";
import { Button } from "./ui/button";

export function SpaceEmptyState(props: {
  /** `null` renders the Void state. */
  space: Space | null;
  /** Whether any project exists outside this Space — i.e. whether there is anything to file. */
  hasProjectsElsewhere: boolean;
  onMoveProjects: () => void;
}) {
  // Before the first project exists, every Space is empty for the same reason and the
  // only move is to create one (which lands in Void). Naming the Space here would dress
  // a global "nothing yet" up as a per-Space problem, and the bulk-move action below
  // would open a picker with nothing in it.
  if (!props.hasProjectsElsewhere) {
    return (
      <p className="px-2 pt-4 text-center text-[length:var(--app-font-size-ui,12px)] text-muted-foreground/58">
        {GLASS_NO_PROJECTS_YET}
      </p>
    );
  }

  const title = props.space ? glassSpaceEmptyTitle(props.space.name) : GLASS_VOID_EMPTY_TITLE;

  return (
    <div className="px-2 pt-4 pb-1 text-center">
      <p className="text-[length:var(--app-font-size-ui,12px)] text-foreground/75">{title}</p>
      <p className="mx-auto mt-1 max-w-52 text-[length:var(--app-font-size-ui-xs,10px)] leading-4 text-muted-foreground/55">
        {props.space ? GLASS_SPACE_EMPTY_HINT : GLASS_VOID_EMPTY_HINT}
      </p>
      {props.space ? (
        <Button size="xs" variant="outline" className="mt-3" onClick={props.onMoveProjects}>
          Move projects here
        </Button>
      ) : null}
    </div>
  );
}
