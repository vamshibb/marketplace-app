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


it.each([
  ["text/plain", 1, "Choose JPEG, PNG, WebP, MP4, MOV or WebM files."],
  ["image/png", 10 * 1024 * 1024 + 1, "Images must be 10 MB or smaller."],
  ["video/mp4", 100 * 1024 * 1024 + 1, "Videos must be 100 MB or smaller."],
])("rejects invalid %s media without changing existing selections", async (type, size, message) => {
  vi.stubGlobal("URL", class extends URL {
    static createObjectURL = vi.fn(() => "blob:selected");
    static revokeObjectURL = vi.fn();
  });
  const existing = new File(["photo"], "existing.png", { type: "image/png" });
  const onChange = vi.fn();
  render(<ProductMediaPicker files={[existing]} onChange={onChange} disabled={false} />);
  const invalid = new File(["invalid"], "invalid", { type });
  Object.defineProperty(invalid, "size", { value: size });
  const user = userEvent.setup({ applyAccept: false });
  await user.upload(screen.getByLabelText("Choose photos and videos"), invalid);
  expect(screen.getByRole("alert").textContent).toBe(message);
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByAltText("existing.png")).toBeTruthy();
  const valid = new File(["photo"], "valid.png", { type: "image/png" });
  await user.upload(screen.getByLabelText("Choose photos and videos"), valid);
  expect(screen.queryByRole("alert")).toBeNull();
  expect(onChange).toHaveBeenCalledExactlyOnceWith([existing, valid]);
});
