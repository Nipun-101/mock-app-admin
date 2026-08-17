import { describe, expect, it, vi } from "vitest";
import { setFormValue, setFormValues } from "./form-store";

describe("form-store", () => {
  it("setFormValue writes a single field through setFields", () => {
    const form = { setFields: vi.fn() };
    setFormValue(form as never, "title", "Budget");
    expect(form.setFields).toHaveBeenCalledWith([{ name: "title", value: "Budget" }]);
  });

  it("setFormValues writes a batch of fields", () => {
    const form = { setFields: vi.fn() };
    const fields = [
      { name: "title", value: "A" },
      { name: ["image", "key"], value: "k1" },
    ];
    setFormValues(form as never, fields);
    expect(form.setFields).toHaveBeenCalledWith(fields);
  });
});
