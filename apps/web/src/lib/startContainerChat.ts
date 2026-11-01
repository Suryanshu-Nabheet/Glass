// FILE: startContainerChat.ts
// Purpose: Shared "ensure the hidden chat container, then open a thread inside it" flow.
// Layer: Web orchestration helper
// Exports: Managed Chats-container startup.

import type { ProjectId, ThreadId } from "@glass/contracts";
import type { NewThreadOptions } from "./threadBootstrap";

export type StartContainerChatResult =
  | { ok: true; threadId: ThreadId | null }
  | { ok: false; error: string };

/**
 * Resolves (creating if needed) the backing container project, then starts a thread inside it.
 * All new rootless chats use the canonical Chats container. Existing legacy containers remain
 * readable through their persisted project metadata.
 */
export async function startContainerChat(input: {
  readonly ensureProjectId: () => Promise<ProjectId | null>;
  readonly handleNewThread: (
    projectId: ProjectId,
    options?: NewThreadOptions,
  ) => Promise<ThreadId | null>;
  readonly fresh?: boolean | undefined;
  readonly forceLocalWorkspace?: boolean | undefined;
  readonly errorLabel: string;
}): Promise<StartContainerChatResult> {
  try {
    const projectId = await input.ensureProjectId();
    if (!projectId) {
      return { ok: false, error: input.errorLabel };
    }
    const threadOptions: NewThreadOptions | undefined =
      input.fresh === true || input.forceLocalWorkspace === true
        ? {
            ...(input.fresh === true ? { fresh: true } : {}),
            envMode: "local",
            branch: null,
            worktreePath: null,
          }
        : undefined;
    const threadId = await input.handleNewThread(projectId, threadOptions);
    return { ok: true, threadId };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : input.errorLabel,
    };
  }
}
