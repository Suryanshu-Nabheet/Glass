import { ProjectId, ThreadId } from "@glass/contracts";
import { describe, expect, it, vi } from "vitest";

import { startContainerChat } from "./startContainerChat";

describe("startContainerChat", () => {
  it("returns the created thread so callers can attach context deterministically", async () => {
    const projectId = ProjectId.makeUnsafe("project-1");
    const threadId = ThreadId.makeUnsafe("thread-1");
    const handleNewThread = vi.fn(async () => threadId);

    await expect(
      startContainerChat({
        ensureProjectId: async () => projectId,
        handleNewThread,
        fresh: true,
        errorLabel: "failed",
      }),
    ).resolves.toEqual({ ok: true, threadId });

    expect(handleNewThread).toHaveBeenCalledWith(projectId, {
      fresh: true,
      envMode: "local",
      branch: null,
      worktreePath: null,
    });
  });

  it("clears a stored Studio draft's inherited worktree metadata without overriding its cwd", async () => {
    const projectId = ProjectId.makeUnsafe("studio-project");
    const threadId = ThreadId.makeUnsafe("studio-thread");
    const handleNewThread = vi.fn(async () => threadId);

    await startContainerChat({
      ensureProjectId: async () => projectId,
      handleNewThread,
      forceLocalWorkspace: true,
      errorLabel: "failed",
    });

    expect(handleNewThread).toHaveBeenCalledWith(projectId, {
      envMode: "local",
      branch: null,
      worktreePath: null,
    });
  });
});
