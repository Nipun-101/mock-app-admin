import { Modal } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { showConfirmModal } from "./ConfirmModal";

describe("showConfirmModal", () => {
  beforeEach(() => {
    vi.spyOn(Modal, "confirm").mockImplementation(
      (() => ({ destroy: vi.fn(), update: vi.fn() })) as unknown as typeof Modal.confirm
    );
    vi.mocked(Modal.confirm).mockClear();
  });

  it("opens a confirm dialog with the given title and content", () => {
    const onConfirm = vi.fn();

    showConfirmModal({
      title: "Remove paper",
      content: "This cannot be undone.",
      onConfirm,
    });

    expect(Modal.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Remove paper",
        content: "This cannot be undone.",
        okText: "Yes",
        cancelText: "No",
      })
    );
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("invokes onConfirm from the dialog onOk handler", () => {
    const onConfirm = vi.fn();

    showConfirmModal({ onConfirm });

    const config = vi.mocked(Modal.confirm).mock.calls[0]?.[0] as {
      title?: string;
      content?: string;
      onOk?: () => void;
    };
    expect(config.title).toBe("Delete Confirmation");
    expect(config.content).toBe("Are you sure you want to delete this item?");

    config.onOk?.();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
