import type { CSSProperties, MouseEvent, ReactNode } from "react";

const rowStyle: CSSProperties = { cursor: "pointer" };

/** Keep Replace / Use this / other row actions from toggling the preview. */
export function stopQuestionRowToggle(event: MouseEvent) {
  event.stopPropagation();
}

/** Expand/collapse question preview via + or a click anywhere on the row. */
export function questionPreviewExpandable<T extends object>(
  expandedRowRender: (record: T, index: number, indent: number) => ReactNode
): {
  expandedRowRender: (record: T, index: number, indent: number) => ReactNode;
  expandRowByClick: true;
} {
  return {
    expandedRowRender,
    expandRowByClick: true,
  };
}

export function questionPreviewOnRow() {
  return { style: rowStyle };
}
