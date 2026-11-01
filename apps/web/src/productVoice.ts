// FILE: productVoice.ts
// Purpose: Canonical Glass branding, copy, and outbound links.
// Layer: Web product constants

export const GLASS_APP_NAME = "Glass";

export const GLASS_TAGLINE = "A fundamental architecture of interaction.";

export const GLASS_POSITIONING = `${GLASS_APP_NAME} — ${GLASS_TAGLINE}`;

export const GLASS_META_DESCRIPTION =
  "Glass makes AI-assisted creation transparent, understandable, and controllable while keeping people involved in shaping work and artifacts.";

export const GLASS_GITHUB_REPO = "https://github.com/Suryanshu-Nabheet/Glass";

export const GLASS_ISSUES_URL = `${GLASS_GITHUB_REPO}/issues/new`;

/** User-facing label for envMode `local` (repo checkout, not a worktree). */
export const GLASS_CHECKOUT_SHORT_LABEL = "Checkout";

export const GLASS_CHECKOUT_OPTION_LABEL = "Project checkout";

export const GLASS_WORKTREE_SHORT_LABEL = "Worktree";

export const GLASS_WORKTREE_PENDING_LABEL = "Worktree pending";

export const GLASS_COMPOSER_WORKSPACE_MENTION = "@workspace";

export const GLASS_WORKSPACE_MENTION_NAME = "workspace";

export const GLASS_HANDOFF_TO_CHECKOUT_LABEL = "Hand off to checkout";

export const GLASS_DEV_SERVERS_LABEL = "Dev servers";

export const GLASS_SURFACE_THREADS = {
  title: "Glass",
  description: "Parallel agents across your repos",
} as const;

export const GLASS_SURFACE_STUDIO = {
  title: "Studio",
  description: "Open-ended agent work",
} as const;

export const GLASS_EMPTY_HOME_HEADING = "What should we work on?";

export const GLASS_EMPTY_PROJECT_HEADING_PREFIX = "What should we do in";

export const GLASS_EMPTY_HERO_TITLE = "Let's build";

export const GLASS_NO_PROJECTS_YET = "No projects yet";

export const GLASS_VOID_EMPTY_TITLE = "Void is empty";

export const GLASS_VOID_EMPTY_HINT = "New and unassigned projects appear here.";

export function glassSpaceEmptyTitle(spaceName: string): string {
  return `${spaceName} is empty`;
}

export const GLASS_SPACE_EMPTY_HINT = "Move projects here, or right-click a project to file it.";

export const GLASS_ACTIVITY_ONBOARDING = {
  title: "Activity",
  description: "See running tasks, completed work, and anything that needs your attention.",
} as const;
