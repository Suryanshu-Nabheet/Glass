// FILE: toolCallDetails.ts
// Purpose: Extract bounded command/edit details from provider tool lifecycle payloads.
// Layer: Web transcript data utility
// Exports: deriveWorkLogToolDetails, mergeWorkLogToolDetails
// Depends on: provider runtime item metadata already truncated by server ingestion

import type { ToolLifecycleItemType } from "@glass/contracts";

type WorkLogRequestKind = "command" | "file-read" | "file-change" | "permissions";

export interface WorkLogToolOutputDetails {
  output?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  truncated?: boolean;
}

export interface WorkLogToolEditDetails {
  path?: string;
  oldText?: string;
  newText?: string;
}

export interface WorkLogToolDetails {
  kind: "command" | "file-change" | "tool";
  title: string;
  fileOperation?: "created" | "deleted" | "modified";
  command?: string;
  input?: string;
  output?: WorkLogToolOutputDetails;
  diff?: string;
  content?: string;
  edits?: ReadonlyArray<WorkLogToolEditDetails>;
  files?: ReadonlyArray<string>;
}

export interface DeriveWorkLogToolDetailsInput {
  payload: Record<string, unknown> | null;
  itemType?: ToolLifecycleItemType | undefined;
  requestKind?: WorkLogRequestKind | undefined;
  command?: string | undefined;
  rawCommand?: string | undefined;
  detail?: string | undefined;
  changedFiles?: ReadonlyArray<string> | undefined;
  label: string;
  toolTitle?: string | undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const normalized = asTrimmedString(value);
    if (normalized) {
      return normalized;
    }
  }
  return undefined;
}

function patchText(value: unknown, depth = 0): string | undefined {
  if (depth > 5 || value == null) return undefined;
  if (typeof value === "string") return value.trim() ? value : undefined;
  if (Array.isArray(value)) {
    const lines = value.flatMap((part) => {
      const text = patchText(part, depth + 1);
      return text ? [text] : [];
    });
    return lines.length ? lines.join("\n") : undefined;
  }
  const record = asRecord(value);
  if (!record) return undefined;
  for (const key of ["unifiedDiff", "diff", "patch", "patches", "text", "content"]) {
    const nested = patchText(record[key], depth + 1);
    if (nested) return nested;
  }
  return undefined;
}

function firstOutputText(...values: unknown[]): string | undefined {
  for (const value of values) {
    const text = readableOutput(value);
    if (text !== undefined) return text;
  }
  return undefined;
}

// Providers represent results as plain strings, text-block arrays, or nested
// result objects. Normalize those shapes once so every provider uses the same UI.
function readableOutput(value: unknown, depth = 0): string | undefined {
  if (depth > 6 || value == null) return undefined;
  if (typeof value === "string") return value.trim().length ? value : undefined;
  if (Array.isArray(value)) {
    const parts = value
      .map((entry) => readableOutput(entry, depth + 1))
      .filter((entry): entry is string => Boolean(entry));
    return parts.length ? parts.join("\n") : undefined;
  }
  const record = asRecord(value);
  if (!record) return undefined;
  for (const key of ["text", "content", "output", "stdout", "stderr", "response", "result"]) {
    const nested = readableOutput(record[key], depth + 1);
    if (nested) return nested;
  }
  try {
    return JSON.stringify(record, null, 2);
  } catch {
    return undefined;
  }
}

function asRawOutputRecord(value: unknown): Record<string, unknown> | null {
  const record = asRecord(value);
  if (record) {
    return record;
  }
  const output = firstOutputText(value);
  return output !== undefined ? { output } : null;
}

function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const normalized = asFiniteNumber(value);
    if (normalized !== undefined) {
      return normalized;
    }
  }
  return undefined;
}

function stripTrailingExitCode(value: string): {
  output: string | null;
  exitCode?: number | undefined;
} {
  const trimmed = value.trim();
  const match = /^(?<output>[\s\S]*?)(?:\s*<exited with exit code (?<code>\d+)>)\s*$/i.exec(
    trimmed,
  );
  if (!match?.groups) {
    return { output: value.trim().length > 0 ? value : null };
  }
  const exitCode = Number.parseInt(match.groups.code ?? "", 10);
  const output = value.replace(/\s*<exited with exit code \d+>\s*$/i, "");
  return {
    output: output.trim().length > 0 ? output : null,
    ...(Number.isInteger(exitCode) ? { exitCode } : {}),
  };
}

function outputText(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }
  return stripTrailingExitCode(value).output ?? undefined;
}

function outputExitCode(value: unknown): number | undefined {
  const normalized = asTrimmedString(value);
  return normalized ? stripTrailingExitCode(normalized).exitCode : undefined;
}

function commandEqualsDetail(command: string | undefined, detail: string | undefined): boolean {
  if (!command || !detail) {
    return false;
  }
  return command.trim() === stripTrailingExitCode(detail).output;
}

// Collects command output without stringifying the full payload; ingestion already bounds each field.
function extractToolOutputDetails(input: {
  payload: Record<string, unknown> | null;
  detail?: string | undefined;
  command?: string | undefined;
}): WorkLogToolOutputDetails | undefined {
  const data = asRecord(input.payload?.data);
  const rawOutput = asRawOutputRecord(data?.rawOutput);
  const rawOutputDetails = asRecord(rawOutput?.details);
  const item = asRecord(data?.item);
  const itemResult = asRecord(item?.result);
  const result = asRecord(data?.result);
  const partialResult = asRecord(data?.partialResult);
  const stdout = outputText(
    firstOutputText(
      rawOutput?.stdout,
      rawOutput?.out,
      data?.stdout,
      itemResult?.stdout,
      result?.stdout,
    ),
  );
  const stderr = outputText(
    firstOutputText(
      rawOutput?.stderr,
      rawOutput?.err,
      data?.stderr,
      itemResult?.stderr,
      result?.stderr,
    ),
  );
  let output = outputText(
    firstOutputText(
      rawOutput?.output,
      rawOutput?.content,
      rawOutput?.text,
      rawOutput?.response,
      data?.output,
      itemResult?.output,
      itemResult?.content,
      itemResult,
      result?.output,
      result?.content,
      result,
      data?.content,
      data?.structured,
      data?.error,
      partialResult?.output,
      partialResult?.content,
      partialResult,
      rawOutputDetails?.output,
    ),
  );
  if (
    !stdout &&
    !stderr &&
    !output &&
    input.detail &&
    !commandEqualsDetail(input.command, input.detail)
  ) {
    output = stripTrailingExitCode(input.detail).output ?? undefined;
  }
  const exitCode = firstNumber(
    rawOutput?.exitCode,
    rawOutput?.code,
    data?.exitCode,
    itemResult?.exitCode,
    result?.exitCode,
    outputExitCode(input.detail),
  );
  const truncated = rawOutput?.truncated === true || data?.__glassTruncated === true;
  if (!stdout && !stderr && !output && exitCode === undefined && !truncated) {
    return undefined;
  }
  return {
    ...(output ? { output } : {}),
    ...(stdout ? { stdout } : {}),
    ...(stderr ? { stderr } : {}),
    ...(exitCode !== undefined ? { exitCode } : {}),
    ...(truncated ? { truncated } : {}),
  };
}

function extractUnifiedDiff(payload: Record<string, unknown> | null): string | undefined {
  const data = asRecord(payload?.data);
  const rawOutput = asRawOutputRecord(data?.rawOutput);
  const rawOutputDetails = asRecord(rawOutput?.details);
  const result = asRecord(data?.result);
  const resultDetails = asRecord(result?.details);
  const item = asRecord(data?.item);
  const itemResult = asRecord(item?.result);
  const input = asRecord(data?.input);
  const rawInput = asRecord(data?.rawInput) ?? asRecord(data?.args) ?? asRecord(data?.arguments);
  const itemInput = asRecord(item?.input) ?? asRecord(item?.args) ?? asRecord(item?.arguments);
  return [
    data?.unifiedDiff,
    data?.diff,
    data?.patch,
    rawOutput?.unifiedDiff,
    rawOutput?.diff,
    rawOutput?.patch,
    rawOutputDetails?.unifiedDiff,
    rawOutputDetails?.diff,
    rawOutputDetails?.patch,
    result?.unifiedDiff,
    result?.diff,
    result?.patch,
    resultDetails?.unifiedDiff,
    resultDetails?.diff,
    resultDetails?.patch,
    itemResult?.unifiedDiff,
    itemResult?.diff,
    itemResult?.patch,
    input?.unifiedDiff,
    input?.diff,
    input?.patch,
    rawInput?.unifiedDiff,
    rawInput?.diff,
    rawInput?.patch,
    itemInput?.unifiedDiff,
    itemInput?.diff,
    itemInput?.patch,
    rawOutput?.output,
    rawOutput?.content,
    result?.content,
    itemResult?.content,
  ]
    .map((candidate) => patchText(candidate))
    .find((candidate) => candidate !== undefined && /^(diff --git |--- |\+\+\+ |@@)/m.test(candidate));
}

function extractWriteContent(payload: Record<string, unknown> | null): string | undefined {
  const data = asRecord(payload?.data);
  const input = asRecord(data?.input);
  const rawInput =
    asRecord(data?.rawInput) ?? asRecord(data?.args) ?? asRecord(data?.arguments);
  const item = asRecord(data?.item);
  const itemInput = asRecord(item?.input) ?? asRecord(item?.args) ?? asRecord(item?.arguments);
  const result = asRecord(data?.result);
  const rawOutput = asRecord(data?.rawOutput);
  return firstString(
    data?.content,
    input?.content,
    input?.CodeContent,
    input?.code_content,
    input?.TargetContent,
    input?.newContent,
    input?.new_content,
    input?.replacementContent,
    input?.ReplacementContent,
    rawInput?.content,
    rawInput?.CodeContent,
    rawInput?.code_content,
    rawInput?.TargetContent,
    rawInput?.newContent,
    rawInput?.new_content,
    rawInput?.replacementContent,
    rawInput?.ReplacementContent,
    item?.content,
    itemInput?.content,
    itemInput?.CodeContent,
    itemInput?.code_content,
    result?.content,
    rawOutput?.content,
  );
}

function extractDeletedContent(payload: Record<string, unknown> | null): string | undefined {
  const data = asRecord(payload?.data);
  const item = asRecord(data?.item);
  const input =
    asRecord(data?.input) ??
    asRecord(data?.rawInput) ??
    asRecord(data?.args) ??
    asRecord(data?.arguments) ??
    asRecord(item?.input);
  return firstString(
    data?.oldContent,
    data?.old_content,
    input?.oldContent,
    input?.old_content,
    input?.TargetContent,
    input?.content,
    item?.oldContent,
  );
}

function editText(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function extractEditPath(record: Record<string, unknown>): string | undefined {
  return firstString(
    record.path,
    record.filePath,
    record.file_path,
    record.filename,
    record.file,
    record.targetFile,
    record.TargetFile,
    record.target_file,
    record.relativePath,
  );
}

function normalizeEditEntry(value: unknown): WorkLogToolEditDetails | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }
  const path = extractEditPath(record);
  const oldText = editText(
    record.oldText ??
      record.old_string ??
      record.oldString ??
      record.oldContent ??
      record.old_content ??
      record.TargetContent ??
      record.targetContent ??
      record.before ??
      record.original,
  );
  const newText = editText(
    record.newText ??
      record.new_string ??
      record.newString ??
      record.newContent ??
      record.new_content ??
      record.ReplacementContent ??
      record.replacementContent ??
      record.CodeContent ??
      record.code_content ??
      record.after ??
      record.replacement ??
      record.content,
  );
  if (oldText === undefined && newText === undefined) {
    return undefined;
  }
  return {
    ...(path ? { path } : {}),
    ...(oldText !== undefined ? { oldText } : {}),
    ...(newText !== undefined ? { newText } : {}),
  };
}

function collectEditEntries(value: unknown, target: WorkLogToolEditDetails[]) {
  if (!Array.isArray(value)) {
    const edit = normalizeEditEntry(value);
    if (edit) {
      target.push(edit);
    }
    return;
  }
  for (const entry of value) {
    const edit = normalizeEditEntry(entry);
    if (edit) {
      target.push(edit);
    }
  }
}

function dedupeEditEntries(edits: ReadonlyArray<WorkLogToolEditDetails>): WorkLogToolEditDetails[] {
  const seen = new Set<string>();
  const deduped: WorkLogToolEditDetails[] = [];
  for (const edit of edits) {
    const key = JSON.stringify([edit.path ?? "", edit.oldText ?? "", edit.newText ?? ""]);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(edit);
  }
  return deduped;
}

function extractEditEntries(payload: Record<string, unknown> | null): WorkLogToolEditDetails[] {
  const data = asRecord(payload?.data);
  const input = asRecord(data?.input) ?? asRecord(data?.args) ?? asRecord(data?.arguments);
  const rawInput =
    asRecord(data?.rawInput) ?? asRecord(data?.args) ?? asRecord(data?.arguments);
  const item = asRecord(data?.item);
  const itemInput = asRecord(item?.input) ?? asRecord(item?.args) ?? asRecord(item?.arguments);
  const result = asRecord(data?.result);
  const rawOutput = asRecord(data?.rawOutput);
  const edits: WorkLogToolEditDetails[] = [];
  collectEditEntries(data?.edits, edits);
  collectEditEntries(input?.edits, edits);
  collectEditEntries(rawInput?.edits, edits);
  collectEditEntries(item?.edits, edits);
  collectEditEntries(itemInput?.edits, edits);
  collectEditEntries(result?.edits, edits);
  collectEditEntries(rawOutput?.edits, edits);
  collectEditEntries(rawInput, edits);
  collectEditEntries(input, edits);
  return dedupeEditEntries(edits);
}

type FileChangeOperation = "created" | "deleted" | "modified";

function fileChangeOperation(
  payload: Record<string, unknown> | null,
  fallbackToolName?: string,
): FileChangeOperation | undefined {
  const data = asRecord(payload?.data);
  const item = asRecord(data?.item);
  const input =
    asRecord(data?.input) ??
    asRecord(data?.rawInput) ??
    asRecord(data?.args) ??
    asRecord(data?.arguments) ??
    asRecord(item?.input) ??
    asRecord(item?.args);
  const explicit = firstString(
    data?.operation,
    data?.changeType,
    data?.change_type,
    data?.kind,
    item?.operation,
    item?.changeType,
    input?.operation,
    input?.changeType,
    input?.change_type,
  )?.toLowerCase();
  if (
    data?.deleted === true ||
    data?.isDeleted === true ||
    input?.deleted === true ||
    input?.isDeleted === true ||
    (explicit && /delete|remove|unlink/.test(explicit))
  ) {
    return "deleted";
  }
  if (
    data?.created === true ||
    data?.isNewFile === true ||
    input?.created === true ||
    input?.isNewFile === true ||
    (explicit && /create|new file|add file/.test(explicit))
  ) {
    return "created";
  }
  if (explicit && /^(?:edit|write|replace|patch|file[-_]change)$/.test(explicit)) {
    return "modified";
  }
  const toolName = firstString(
    data?.toolName,
    data?.name,
    data?.tool,
    data?.title,
    item?.title,
    data?.kind,
  )?.toLowerCase() ?? fallbackToolName?.toLowerCase();
  if (toolName && /(?:create|new)[_ -]*file/.test(toolName)) return "created";
  if (toolName && /(?:delete|remove|unlink)[_ -]*file/.test(toolName)) return "deleted";
  if (toolName && /^(delete|remove|rm)$/.test(toolName)) return "deleted";
  if (toolName && /(?:write.*file|edit[_ -]*file|replace.*file|patch[_ -]*file)/.test(toolName)) {
    return "modified";
  }
  return undefined;
}

function synthesizeFileDiff(input: {
  payload: Record<string, unknown> | null;
  edits: ReadonlyArray<WorkLogToolEditDetails>;
  content?: string | undefined;
  deletedContent?: string | undefined;
  operation?: FileChangeOperation | undefined;
  files?: ReadonlyArray<string> | undefined;
}): string | undefined {
  const operation = input.operation ?? fileChangeOperation(input.payload);
  const data = asRecord(input.payload?.data);
  const dataInput =
    asRecord(data?.rawInput) ??
    asRecord(data?.input) ??
    asRecord(data?.args) ??
    asRecord(data?.arguments);
  const fallbackPath =
    input.files?.[0] ??
    firstString(
      dataInput?.filePath,
      dataInput?.file_path,
      dataInput?.TargetFile,
      dataInput?.targetFile,
      dataInput?.target_file,
      dataInput?.path,
      dataInput?.filename,
    );
  const hunks = input.edits.flatMap((edit) => {
    if (edit.oldText === undefined && edit.newText === undefined) return [];
    const filePath = edit.path ?? fallbackPath ?? "unknown";
    const fromPath =
      edit.oldText === undefined || operation === "created" ? "/dev/null" : `a/${filePath}`;
    const toPath =
      edit.newText === undefined || operation === "deleted" ? "/dev/null" : `b/${filePath}`;
    return [
      `diff --git a/${filePath} b/${filePath}`,
      ...(fromPath === "/dev/null" ? ["new file mode 100644"] : []),
      ...(toPath === "/dev/null" ? ["deleted file mode 100644"] : []),
      `--- ${fromPath}`,
      `+++ ${toPath}`,
      "@@",
      ...(edit.oldText !== undefined && fromPath !== "/dev/null"
        ? edit.oldText.split("\n").map((line) => `-${line}`)
        : []),
      ...(edit.newText !== undefined && toPath !== "/dev/null"
        ? edit.newText.split("\n").map((line) => `+${line}`)
        : []),
    ].join("\n");
  });
  if (hunks.length) return hunks.join("\n");

  if (operation === "created" && input.content !== undefined) {
    const filePath = fallbackPath ?? "new file";
    return [
      `diff --git a/${filePath} b/${filePath}`,
      "new file mode 100644",
      "--- /dev/null",
      `+++ b/${filePath}`,
      "@@",
      ...input.content.split("\n").map((line) => `+${line}`),
    ].join("\n");
  }
  if (operation === "deleted" && fallbackPath && input.deletedContent !== undefined) {
    return [
      `diff --git a/${fallbackPath} b/${fallbackPath}`,
      "deleted file mode 100644",
      `--- a/${fallbackPath}`,
      "+++ /dev/null",
      "@@",
      ...input.deletedContent.split("\n").map((line) => `-${line}`),
    ].join("\n");
  }
  if (operation === "deleted" && fallbackPath) {
    return [
      `diff --git a/${fallbackPath} b/${fallbackPath}`,
      "deleted file mode 100644",
      `--- a/${fallbackPath}`,
      "+++ /dev/null",
    ].join("\n");
  }
  return undefined;
}

function detailsTitle(input: DeriveWorkLogToolDetailsInput): string {
  return input.toolTitle ?? input.label;
}

function shouldBuildCommandDetails(input: DeriveWorkLogToolDetailsInput): boolean {
  return (
    input.requestKind === "command" ||
    input.itemType === "command_execution" ||
    Boolean(input.command)
  );
}

function shouldBuildFileChangeDetails(input: DeriveWorkLogToolDetailsInput): boolean {
  return (
    input.requestKind === "file-change" ||
    input.itemType === "file_change" ||
    fileChangeOperation(input.payload, input.toolTitle ?? input.label) !== undefined
  );
}

function extractToolInput(payload: Record<string, unknown> | null): string | undefined {
  const data = asRecord(payload?.data);
  const input =
    asRecord(data?.rawInput) ??
    asRecord(data?.parameters) ??
    asRecord(data?.input) ??
    asRecord(data?.args) ??
    asRecord(data?.arguments) ??
    asRecord(asRecord(data?.item)?.input) ??
    asRecord(asRecord(data?.item)?.args);
  if (!input || Object.keys(input).length === 0) return undefined;
  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return undefined;
  }
}

function hasNonPathToolInput(payload: Record<string, unknown> | null): boolean {
  const data = asRecord(payload?.data);
  const item = asRecord(data?.item);
  const input =
    asRecord(data?.rawInput) ??
    asRecord(data?.parameters) ??
    asRecord(data?.input) ??
    asRecord(data?.args) ??
    asRecord(data?.arguments) ??
    asRecord(item?.input) ??
    asRecord(item?.args);
  if (!input) return false;
  const pathKeys = new Set([
    "path",
    "file",
    "filePath",
    "file_path",
    "filename",
    "TargetFile",
    "targetFile",
    "target_file",
    "relativePath",
  ]);
  return Object.keys(input).some((key) => !pathKeys.has(key));
}

export function deriveWorkLogToolDetails(
  input: DeriveWorkLogToolDetailsInput,
): WorkLogToolDetails | undefined {
  const command = input.rawCommand ?? input.command;
  const toolInput = extractToolInput(input.payload);
  if (shouldBuildCommandDetails(input)) {
    const output = extractToolOutputDetails({
      payload: input.payload,
      detail: input.detail,
      command,
    });
    if (!command && !output && !toolInput) {
      return undefined;
    }
    return {
      kind: "command",
      title: detailsTitle(input),
      ...(command ? { command } : {}),
      ...(toolInput ? { input: toolInput } : {}),
      ...(output ? { output } : {}),
    };
  }

  if (!shouldBuildFileChangeDetails(input)) {
    const hasToolLifecycleType =
      input.itemType === "dynamic_tool_call" ||
      input.itemType === "mcp_tool_call" ||
      input.itemType === "web_search" ||
      input.itemType === "image_view" ||
      input.itemType === "image_generation";
    if (!hasToolLifecycleType) return undefined;
    const output = extractToolOutputDetails({
      payload: input.payload,
      detail: input.detail,
      command: undefined,
    });
    if (!toolInput && !output) return undefined;
    return {
      kind: "tool",
      title: detailsTitle(input),
      ...(toolInput ? { input: toolInput } : {}),
      ...(output ? { output } : {}),
    };
  }
  const rawDiff = extractUnifiedDiff(input.payload);
  const content = extractWriteContent(input.payload);
  const edits = extractEditEntries(input.payload);
  const operation = fileChangeOperation(input.payload, input.toolTitle ?? input.label);
  const deletedContent = extractDeletedContent(input.payload);
  const output = extractToolOutputDetails({
    payload: input.payload,
    command: undefined,
  });
  const fileInput = toolInput;
  const hasAdditionalInput = hasNonPathToolInput(input.payload);
  const files = input.changedFiles?.length ? input.changedFiles : undefined;
  const diff =
    rawDiff ??
    synthesizeFileDiff({
      payload: input.payload,
      edits,
      content,
      deletedContent,
      operation,
      files,
    });
  if (!diff && !content && edits.length === 0 && !output && !hasAdditionalInput) {
    return undefined;
  }
  return {
    kind: "file-change",
    title: detailsTitle(input),
    ...(operation ? { fileOperation: operation } : {}),
    ...(diff ? { diff } : {}),
    ...(content && !diff ? { content } : {}),
    ...(fileInput && !diff && !content && edits.length === 0 && hasAdditionalInput
      ? { input: fileInput }
      : {}),
    ...(edits.length > 0 ? { edits } : {}),
    ...(files ? { files } : {}),
    ...(output ? { output } : {}),
  };
}

function mergeStringArrays(
  left: ReadonlyArray<string> | undefined,
  right: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> | undefined {
  const merged = [...(left ?? []), ...(right ?? [])];
  return merged.length > 0 ? [...new Set(merged)] : undefined;
}

function mergeOutputs(
  left: WorkLogToolOutputDetails | undefined,
  right: WorkLogToolOutputDetails | undefined,
): WorkLogToolOutputDetails | undefined {
  if (!left) return right;
  if (!right) return left;
  return {
    ...(left.output || right.output ? { output: right.output ?? left.output } : {}),
    ...(left.stdout || right.stdout ? { stdout: right.stdout ?? left.stdout } : {}),
    ...(left.stderr || right.stderr ? { stderr: right.stderr ?? left.stderr } : {}),
    ...(left.exitCode !== undefined || right.exitCode !== undefined
      ? { exitCode: right.exitCode ?? left.exitCode }
      : {}),
    ...(left.truncated === true || right.truncated === true ? { truncated: true } : {}),
  };
}

export function mergeWorkLogToolDetails(
  left: WorkLogToolDetails | undefined,
  right: WorkLogToolDetails | undefined,
): WorkLogToolDetails | undefined {
  if (!left) return right;
  if (!right) return left;
  if (left.kind !== right.kind) return right;
  const output = mergeOutputs(left.output, right.output);
  const files = mergeStringArrays(left.files, right.files);
  return {
    kind: right.kind,
    title: right.title || left.title,
    ...((right.fileOperation ?? left.fileOperation)
      ? { fileOperation: right.fileOperation ?? left.fileOperation }
      : {}),
    ...((right.command ?? left.command) ? { command: right.command ?? left.command } : {}),
    ...((right.input ?? left.input) ? { input: right.input ?? left.input } : {}),
    ...(output ? { output } : {}),
    ...((right.diff ?? left.diff) ? { diff: right.diff ?? left.diff } : {}),
    ...((right.content ?? left.content) ? { content: right.content ?? left.content } : {}),
    ...((right.edits ?? left.edits) ? { edits: right.edits ?? left.edits } : {}),
    ...(files ? { files } : {}),
  };
}
