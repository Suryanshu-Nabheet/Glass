import { describe, expect, it } from "vitest";

import {
  findBrandIdentityViolations,
  findVisualBrandAssetViolations,
} from "./check-brand-identity";

const characters = (...codes: number[]): string => String.fromCharCode(...codes);
const shortName = characters(116, 51);
const firstName = `${shortName}${characters(99, 111, 100, 101)}`;
const secondName = characters(100, 112, 99, 111, 100, 101);
const incorrectBundleDomain = characters(99, 111, 109, 46, 115, 121, 110, 97, 114, 97);

describe("brand identity guard", () => {
  it("detects retired names in paths and text", () => {
    const violations = findBrandIdentityViolations([
      { path: `docs/${firstName}.md`, contents: "Glass" },
      { path: "source.ts", contents: `const value = "${secondName}:state";` },
      { path: "Info.plist", contents: incorrectBundleDomain },
    ]);
    expect(violations).toHaveLength(3);
  });

  it("does not match ordinary numeric type names or canonical Glass text", () => {
    expect(
      findBrandIdentityViolations([
        { path: "source.ts", contents: "const value = new Uint32Array(); // Glass" },
        { path: "README.md", contents: "Glass — parallel agents, one workspace." },
      ]),
    ).toEqual([]);
  });

  it("requires user-facing raster assets to match a visually approved digest", () => {
    const approvedContents = new TextEncoder().encode("approved Glass screenshot");
    const approvedDigest = "8ec169192bd7b4660b106e2d9aca0065fae17f5e2cf6a5f485e1ded0b59e7ec0";
    const approvedDigests = new Map([["screenshot.png", approvedDigest]]);

    expect(
      findVisualBrandAssetViolations(
        [{ path: "screenshot.png", contents: approvedContents }],
        approvedDigests,
      ),
    ).toEqual([]);
    expect(
      findVisualBrandAssetViolations(
        [{ path: "screenshot.png", contents: new TextEncoder().encode("changed") }],
        approvedDigests,
      ),
    ).toHaveLength(1);
    expect(findVisualBrandAssetViolations([], approvedDigests)).toHaveLength(1);
  });
});
