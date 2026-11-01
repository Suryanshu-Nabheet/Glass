// FILE: _chat.studio.index.tsx
// Purpose: Keep old Studio links working by returning them to the unified Chats surface.
// Layer: Routing

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_chat/studio/")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
