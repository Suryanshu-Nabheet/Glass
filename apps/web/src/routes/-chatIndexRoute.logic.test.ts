import { ProjectId, ThreadId } from "@glass/contracts";
import { describe, expect, it } from "vitest";

import { resolveChatIndexRestoreRoute } from "./-chatIndexRoute.logic";

describe("resolveChatIndexRestoreRoute", () => {
  it("restores a legacy Studio conversation through the unified Chats landing", () => {
    const threadId = ThreadId.makeUnsafe("thread-legacy-studio");
    const projectId = ProjectId.makeUnsafe("project-legacy-studio");

    expect(
      resolveChatIndexRestoreRoute({
        lastThreadRoute: { threadId },
        availableSplitViewIds: new Set(),
        threadIds: [threadId],
        sidebarThreadSummaryById: {
          [threadId]: { projectId },
        },
        draftProjectIdByThreadId: new Map(),
        rememberedSplitViewThreadIds: undefined,
        landingSpace: null,
      }),
    ).toEqual({ threadId });
  });
});
