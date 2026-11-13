// FILE: AppIconPicker.browser.tsx
// Purpose: Verify the visual app-icon picker exposes and applies platform-supported choices.
// Layer: Browser UI test

import "../../index.css";

import { expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { AppIconPicker } from "./AppIconPicker";

it("offers and selects black and white icons", async () => {
  const onValueChange = vi.fn();
  const mounted = await render(
    <AppIconPicker platform="MacIntel" value="dark" onValueChange={onValueChange} />,
  );

  const blackButton = mounted.getByRole("button", { name: "Black icon" });
  const whiteButton = mounted.getByRole("button", { name: "White icon" });

  await expect.element(blackButton).toBeVisible();
  await expect.element(whiteButton).toBeVisible();

  await whiteButton.click();
  expect(onValueChange).toHaveBeenCalledWith("default");
});
