import type { CSSProperties, MouseEvent } from "react";
import type { TableProps } from "antd";

const rowStyle: CSSProperties = { cursor: "pointer" };

/** Keep Replace / Use this / other row actions from toggling the preview. */
export function stopQuestionRowToggle(event: MouseEvent) {
  event.stopPropagation();
}

/** Expand/collapse question preview via + or a click anywhere on the row. */
export function questionPreviewExpandable<T extends object>(
  expandedRowRender: NonNullable<
    NonNullable<TableProps<T>["expandable"]>["expandedRowRender"]
  >
): NonNullable<TableProps<T>["expandable"]> {
  return {
    expandedRowRender,
    expandRowByClick: true,
  };
}

export function questionPreviewOnRow() {
  return { style: rowStyle };
}
