import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AntdProvider } from "./antd-provider";

describe("AntdProvider", () => {
  it("renders children inside the Ant Design provider", () => {
    render(
      <AntdProvider>
        <button type="button">Ready</button>
      </AntdProvider>
    );

    expect(screen.getByRole("button", { name: "Ready" })).toBeInTheDocument();
  });
});
