import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reducer, toast, useToast } from "./use-toast";

const TOAST_REMOVE_DELAY = 1_000_000;

function emptyState() {
  return { toasts: [] };
}

describe("toast reducer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    const { result, unmount } = renderHook(() => useToast());
    act(() => {
      result.current.dismiss();
    });
    act(() => {
      vi.advanceTimersByTime(TOAST_REMOVE_DELAY);
    });
    unmount();
    vi.useRealTimers();
  });

  it("prepends a toast and enforces the limit of one", () => {
    const first = { id: "1", title: "One", open: true };
    const second = { id: "2", title: "Two", open: true };

    const withFirst = reducer(emptyState(), { type: "ADD_TOAST", toast: first });
    expect(withFirst.toasts).toEqual([first]);

    const withSecond = reducer(withFirst, { type: "ADD_TOAST", toast: second });
    expect(withSecond.toasts).toEqual([second]);
  });

  it("updates a toast by id", () => {
    const state = reducer(emptyState(), {
      type: "ADD_TOAST",
      toast: { id: "1", title: "Hello", open: true },
    });

    const updated = reducer(state, {
      type: "UPDATE_TOAST",
      toast: { id: "1", title: "Updated" },
    });
    expect(updated.toasts[0]?.title).toBe("Updated");

    const unchanged = reducer(state, {
      type: "UPDATE_TOAST",
      toast: { id: "missing", title: "Nope" },
    });
    expect(unchanged.toasts[0]?.title).toBe("Hello");
  });

  it("dismisses one toast or all toasts", () => {
    const state = {
      toasts: [
        { id: "1", title: "A", open: true },
        { id: "2", title: "B", open: true },
      ],
    };

    const dismissedOne = reducer(state, { type: "DISMISS_TOAST", toastId: "1" });
    expect(dismissedOne.toasts.find((row) => row.id === "1")?.open).toBe(false);
    expect(dismissedOne.toasts.find((row) => row.id === "2")?.open).toBe(true);

    const dismissedAll = reducer(state, { type: "DISMISS_TOAST" });
    expect(dismissedAll.toasts.every((row) => row.open === false)).toBe(true);
  });

  it("removes one toast or clears the stack", () => {
    const state = {
      toasts: [
        { id: "1", title: "A", open: false },
        { id: "2", title: "B", open: false },
      ],
    };

    expect(reducer(state, { type: "REMOVE_TOAST", toastId: "1" }).toasts).toEqual([
      { id: "2", title: "B", open: false },
    ]);
    expect(reducer(state, { type: "REMOVE_TOAST" }).toasts).toEqual([]);
  });
});

describe("toast, useToast, and dismiss", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    const { result, unmount } = renderHook(() => useToast());
    act(() => {
      result.current.dismiss();
    });
    act(() => {
      vi.advanceTimersByTime(TOAST_REMOVE_DELAY);
    });
    unmount();
    vi.useRealTimers();
  });

  it("adds, updates, dismisses, and removes a toast after the delay", () => {
    const { result } = renderHook(() => useToast());

    let handle: ReturnType<typeof toast> | undefined;
    act(() => {
      handle = toast({ title: "Saved" });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]?.title).toBe("Saved");
    expect(result.current.toasts[0]?.open).toBe(true);

    act(() => {
      handle?.update({ id: handle.id, title: "Updated" });
    });
    expect(result.current.toasts[0]?.title).toBe("Updated");

    act(() => {
      handle?.dismiss();
    });
    expect(result.current.toasts[0]?.open).toBe(false);

    act(() => {
      vi.advanceTimersByTime(TOAST_REMOVE_DELAY);
    });
    expect(result.current.toasts).toHaveLength(0);
  });

  it("dismisses every toast through useToast and honors onOpenChange", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: "One" });
    });
    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      result.current.toasts[0]?.onOpenChange?.(false);
    });
    expect(result.current.toasts[0]?.open).toBe(false);

    act(() => {
      result.current.toast({ title: "Two" });
    });
    act(() => {
      result.current.dismiss();
    });
    expect(result.current.toasts.every((row) => row.open === false)).toBe(true);

    act(() => {
      vi.advanceTimersByTime(TOAST_REMOVE_DELAY);
    });
    expect(result.current.toasts).toHaveLength(0);
  });
});
