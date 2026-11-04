import type { MouseEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  questionPreviewExpandable,
  questionPreviewOnRow,
  stopQuestionRowToggle,
} from "./questionTableExpand";

describe("questionTableExpand", () => {
  it("enables expand-on-row-click for question previews", () => {
    const render = (_record: { id: string }) => null;
    expect(questionPreviewExpandable(render)).toEqual({
      expandedRowRender: render,
      expandRowByClick: true,
    });
  });

  it("marks the row as clickable", () => {
    expect(questionPreviewOnRow()).toEqual({ style: { cursor: "pointer" } });
  });

  it("stops propagation so action buttons do not toggle expand", () => {
    const event = { stopPropagation: vi.fn() };
    stopQuestionRowToggle(event as unknown as MouseEvent);
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
  });
});
