import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AdminLoading from "./loading";

describe("AdminLoading", () => {
  it("renders the shared page loader", () => {
    const { container } = render(<AdminLoading />);

    expect(container.querySelector(".ant-spin")).toBeTruthy();
  });
});
