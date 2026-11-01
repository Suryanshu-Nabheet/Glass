import { describe, expect, it } from "vitest";

import { desktopAppIconsForPlatform } from "./AppIconPicker";

describe("desktop app icon availability", () => {
  it("offers black and white icons across platforms", () => {
    expect(desktopAppIconsForPlatform("MacIntel")).toEqual(["dark", "default"]);
    expect(desktopAppIconsForPlatform("Win32")).toEqual(["dark", "default"]);
    expect(desktopAppIconsForPlatform("Linux x86_64")).toEqual(["dark", "default"]);
  });
});
