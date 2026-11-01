/**
 * Public contracts for the Glass agent-control gateway.
 *
 * New gateway tools decode these schemas before doing any work. Keeping the
 * limits here ensures the MCP surface, server implementation, and tests share
 * the same definition of an exact creation/wait plan.
 */
import { Schema } from "effect";

import { ProjectId, ThreadId, TurnId } from "./baseSchemas";
import { ModelSelection, ProviderKind } from "./orchestration";
import { ProviderModelDescriptor } from "./providerDiscovery";
import { ServerProviderAuthStatus } from "./server";

export const GLASS_GATEWAY_MAX_THREADS_PER_OPERATION = 20;
export const GLASS_GATEWAY_MAX_REQUEST_ID_LENGTH = 256;
export const GLASS_GATEWAY_MAX_WAIT_MS = 60_000;

export const GlassGatewayErrorCode = Schema.Literals([
  "caller_session_inactive",
  "caller_turn_inactive",
  "capability_denied",
  "provider_unavailable",
  "model_unavailable",
  "model_option_unavailable",
  "idempotency_conflict",
  "creation_plan_locked",
  "creation_limit_exceeded",
  "thread_not_found",
  "wait_timed_out",
  "operation_failed",
]);
export type GlassGatewayErrorCode = typeof GlassGatewayErrorCode.Type;

export const GlassGatewayError = Schema.Struct({
  code: GlassGatewayErrorCode,
  message: Schema.String,
  details: Schema.optional(Schema.Unknown),
});
export type GlassGatewayError = typeof GlassGatewayError.Type;

export const GlassGatewayErrorResult = Schema.Struct({
  error: GlassGatewayError,
});
export type GlassGatewayErrorResult = typeof GlassGatewayErrorResult.Type;

export const GlassContextResult = Schema.Struct({
  harness: Schema.Struct({
    name: Schema.Literal("Glass"),
    policyVersion: Schema.String,
  }),
  caller: Schema.Struct({
    threadId: ThreadId,
    turnId: Schema.NullOr(TurnId),
    provider: ProviderKind,
    projectId: ProjectId,
  }),
  capabilities: Schema.Struct({
    threadRead: Schema.Boolean,
    threadCreate: Schema.Boolean,
    threadWait: Schema.Boolean,
    automations: Schema.Boolean,
  }),
});
export type GlassContextResult = typeof GlassContextResult.Type;

export const GlassCreateThreadSpec = Schema.Struct({
  prompt: Schema.String.check(Schema.isNonEmpty()),
  title: Schema.optional(Schema.String.check(Schema.isNonEmpty())),
  target: ModelSelection,
  projectId: Schema.optional(ProjectId),
  environment: Schema.optional(Schema.Literals(["local", "worktree"])),
  baseRef: Schema.optional(Schema.String.check(Schema.isNonEmpty())),
  // Legacy inputs remain decodable for replay/backward compatibility, but the
  // MCP catalog no longer advertises branch-backed worktree creation.
  baseBranch: Schema.optional(Schema.String.check(Schema.isNonEmpty())),
  branchName: Schema.optional(Schema.String.check(Schema.isNonEmpty())),
  runtimeMode: Schema.optional(Schema.Literals(["approval-required", "full-access"])),
});
export type GlassCreateThreadSpec = typeof GlassCreateThreadSpec.Type;

const GlassGatewayRequestId = Schema.String.check(Schema.isNonEmpty()).check(
  Schema.isMaxLength(GLASS_GATEWAY_MAX_REQUEST_ID_LENGTH),
);

export const GlassCreateThreadsInput = Schema.Struct({
  requestId: GlassGatewayRequestId,
  threads: Schema.Array(GlassCreateThreadSpec)
    .check(Schema.isMinLength(1))
    .check(Schema.isMaxLength(GLASS_GATEWAY_MAX_THREADS_PER_OPERATION)),
}).annotate({ parseOptions: { onExcessProperty: "error" } });
export type GlassCreateThreadsInput = typeof GlassCreateThreadsInput.Type;

export const GlassProviderCatalog = Schema.Struct({
  provider: ProviderKind,
  defaultModel: Schema.NullOr(Schema.String),
  models: Schema.Array(ProviderModelDescriptor),
  enabled: Schema.Boolean,
  available: Schema.Boolean,
  authStatus: Schema.optional(ServerProviderAuthStatus),
  source: Schema.optional(Schema.String),
  error: Schema.optional(Schema.String),
});
export type GlassProviderCatalog = typeof GlassProviderCatalog.Type;

export const GlassGatewayTargetOptionValue = Schema.Union([
  Schema.String,
  Schema.Number,
  Schema.Boolean,
]);
export type GlassGatewayTargetOptionValue = typeof GlassGatewayTargetOptionValue.Type;

export const GlassGatewayTargetOptionRule = Schema.Struct({
  key: Schema.String,
  valueType: Schema.Literals(["string", "number", "boolean"]),
  allowedValues: Schema.Array(GlassGatewayTargetOptionValue),
  allowedValuesSource: Schema.Literals(["provider-contract", "model-discovery"]),
});
export type GlassGatewayTargetOptionRule = typeof GlassGatewayTargetOptionRule.Type;

export const GlassGatewayTargetConstruction = Schema.Struct({
  modelValueSource: Schema.Literal("providers[].models[].slug"),
  primaryOptionKey: Schema.String,
  alternativeOptionKeys: Schema.Array(Schema.String),
  optionSelectionRule: Schema.String,
  providerOptions: Schema.Array(GlassGatewayTargetOptionRule),
  optionsByModel: Schema.Record(Schema.String, Schema.Array(GlassGatewayTargetOptionRule)),
  exampleTarget: Schema.NullOr(ModelSelection),
});
export type GlassGatewayTargetConstruction = typeof GlassGatewayTargetConstruction.Type;

export const GlassCapabilitiesResult = Schema.Struct({
  targetConstruction: Schema.Record(Schema.String, GlassGatewayTargetConstruction),
  providers: Schema.Array(GlassProviderCatalog),
  limits: Schema.Struct({
    maxThreadsPerOperation: Schema.Int,
    maxWaitMs: Schema.Int,
    oneCreationPlanPerActiveTurn: Schema.Boolean,
  }),
});
export type GlassCapabilitiesResult = typeof GlassCapabilitiesResult.Type;

export const GlassCreatedThreadResult = Schema.Struct({
  index: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  threadId: ThreadId,
  projectId: ProjectId,
  title: Schema.String,
  target: ModelSelection,
  provider: ProviderKind,
  model: Schema.String,
  runtimeMode: Schema.Literals(["approval-required", "full-access"]),
  environment: Schema.Literals(["local", "worktree"]),
  branch: Schema.NullOr(Schema.String),
  worktreePath: Schema.NullOr(Schema.String),
  status: Schema.Literal("task_dispatched"),
});
export type GlassCreatedThreadResult = typeof GlassCreatedThreadResult.Type;

export const GlassCreateThreadsResult = Schema.Struct({
  operationId: Schema.String,
  requestId: GlassGatewayRequestId,
  requestedCount: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
  createdCount: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  threadIds: Schema.Array(ThreadId),
  threads: Schema.Array(GlassCreatedThreadResult),
});
export type GlassCreateThreadsResult = typeof GlassCreateThreadsResult.Type;

export const GlassWaitForThreadsInput = Schema.Struct({
  threadIds: Schema.Array(ThreadId)
    .check(Schema.isMinLength(1))
    .check(Schema.isMaxLength(GLASS_GATEWAY_MAX_THREADS_PER_OPERATION)),
  runIds: Schema.optional(
    Schema.Array(Schema.NullOr(TurnId)).check(
      Schema.isMaxLength(GLASS_GATEWAY_MAX_THREADS_PER_OPERATION),
    ),
  ),
  timeoutMs: Schema.optional(
    Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)).check(
      Schema.isLessThanOrEqualTo(GLASS_GATEWAY_MAX_WAIT_MS),
    ),
  ),
}).annotate({ parseOptions: { onExcessProperty: "error" } });
export type GlassWaitForThreadsInput = typeof GlassWaitForThreadsInput.Type;

export const GlassWaitedThreadResult = Schema.Struct({
  threadId: ThreadId,
  runId: Schema.NullOr(TurnId),
  state: Schema.Literals(["idle", "pending", "running", "completed", "error", "interrupted"]),
  terminal: Schema.Boolean,
  timedOut: Schema.Boolean,
  summary: Schema.NullOr(Schema.String),
  summaryTruncated: Schema.Boolean,
  error: Schema.NullOr(Schema.String),
  readThread: Schema.Struct({
    tool: Schema.Literal("glass_read_thread"),
    arguments: Schema.Struct({ threadId: ThreadId }),
  }),
});
export type GlassWaitedThreadResult = typeof GlassWaitedThreadResult.Type;

export const GlassWaitForThreadsResult = Schema.Struct({
  callerThreadId: ThreadId,
  runIds: Schema.Array(Schema.NullOr(TurnId)),
  allTerminal: Schema.Boolean,
  timedOut: Schema.Boolean,
  threads: Schema.Array(GlassWaitedThreadResult),
});
export type GlassWaitForThreadsResult = typeof GlassWaitForThreadsResult.Type;
