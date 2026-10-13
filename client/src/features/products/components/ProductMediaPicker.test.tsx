import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, it, vi } from "vitest";
import { ProductMediaPicker } from "./ProductMediaPicker";

it("keeps ten Create slots through selection, validation and removal", async () => {
  vi.stubGlobal("URL", class extends URL {
    static createObjectURL = vi.fn(() => "blob:selected");
    static revokeObjectURL = vi.fn();
  });
  const Picker = () => {
    const [files, setFiles] = useState<File[]>([]);
    return <ProductMediaPicker files={files} onChange={setFiles} disabled={false} />;
  };
  render(<Picker />);
  const user = userEvent.setup();
  const slots = () => within(screen.getByRole("list", { name: "Media slots" })).getAllByRole("listitem");
  expect(slots()).toHaveLength(10);
  expect(screen.getAllByRole("button", { name: /Add media in slot/ })).toHaveLength(10);
  const input = screen.getByLabelText<HTMLInputElement>("Choose photos and videos");
  const click = vi.spyOn(input, "click");
  await user.click(screen.getByRole("button", { name: "Add media in slot 6" }));
  expect(click).toHaveBeenCalledOnce();
  const files = Array.from({ length: 11 }, (_, index) => new File(["image"], `${index}.png`, { type: "image/png" }));
  await user.upload(input, files);
  expect(screen.getByRole("alert").textContent).toContain("up to 10");
  expect(slots()).toHaveLength(10);
  await user.upload(input, files.slice(0, 10));
  expect(slots()).toHaveLength(10);
  expect(screen.queryByRole("button", { name: /Add media in slot/ })).toBeNull();
  expect(within(slots()[0]).getByText("Cover")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Remove 0.png" }));
  expect(slots()).toHaveLength(10);
  expect(within(slots()[0]).getByAltText("1.png")).toBeTruthy();
  expect(within(slots()[0]).getByText("Cover")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Add media in slot 10" })).toBeTruthy();
});
