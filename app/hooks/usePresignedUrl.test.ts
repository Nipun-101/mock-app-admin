import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { filesApi } from "@/app/services/ezprep-api";
import { usePresignedUrl } from "./usePresignedUrl";

vi.mock("@/app/services/ezprep-api", async () => {
  const actual = await vi.importActual<typeof import("@/app/services/ezprep-api")>(
    "@/app/services/ezprep-api"
  );
  return {
    ...actual,
    filesApi: {
      ...actual.filesApi,
      signedUrl: vi.fn(),
    },
  };
});

const signedUrl = vi.mocked(filesApi.signedUrl);
type SignedUrlResponse = Awaited<ReturnType<typeof filesApi.signedUrl>>;

describe("usePresignedUrl", () => {
  beforeEach(() => {
    signedUrl.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns a null url when metadata is missing", async () => {
    const { result } = renderHook(() => usePresignedUrl(null));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.url).toBeNull();
    expect(signedUrl).not.toHaveBeenCalled();
  });

  it("returns the signed url on success", async () => {
    signedUrl.mockResolvedValue({
      message: "ok",
      data: { url: "https://cdn.example/a.png" },
    });

    const { result } = renderHook(() =>
      usePresignedUrl({ key: "a.png", bucket: "media" })
    );

    await waitFor(() =>
      expect(result.current.url).toBe("https://cdn.example/a.png")
    );
    expect(result.current.loading).toBe(false);
    expect(signedUrl).toHaveBeenCalledWith("a.png", "media");
  });

  it("clears loading after an error and leaves the url null", async () => {
    signedUrl.mockRejectedValue(new Error("nope"));

    const { result } = renderHook(() =>
      usePresignedUrl({ key: "a.png", bucket: "media" })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.url).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it("hides a stale url when the metadata key changes", async () => {
    signedUrl.mockResolvedValueOnce({
      message: "ok",
      data: { url: "https://cdn.example/old.png" },
    });

    const { result, rerender } = renderHook(
      ({ metadata }) => usePresignedUrl(metadata),
      {
        initialProps: {
          metadata: { key: "old.png", bucket: "media" },
        },
      }
    );

    await waitFor(() =>
      expect(result.current.url).toBe("https://cdn.example/old.png")
    );

    let resolveNext: ((value: SignedUrlResponse) => void) | undefined;
    signedUrl.mockReturnValueOnce(
      new Promise<SignedUrlResponse>((resolve) => {
        resolveNext = resolve;
      })
    );

    rerender({ metadata: { key: "new.png", bucket: "media" } });

    await waitFor(() => expect(result.current.url).toBeNull());

    await act(async () => {
      resolveNext?.({
        message: "ok",
        data: { url: "https://cdn.example/new.png" },
      });
    });

    await waitFor(() =>
      expect(result.current.url).toBe("https://cdn.example/new.png")
    );
  });

  it("does not apply a signed url after unmount", async () => {
    let resolveSigned: ((value: SignedUrlResponse) => void) | undefined;
    signedUrl.mockReturnValue(
      new Promise<SignedUrlResponse>((resolve) => {
        resolveSigned = resolve;
      })
    );

    const { unmount } = renderHook(() =>
      usePresignedUrl({ key: "a.png", bucket: "media" })
    );

    unmount();

    await act(async () => {
      resolveSigned?.({
        message: "ok",
        data: { url: "https://cdn.example/a.png" },
      });
    });

    expect(signedUrl).toHaveBeenCalled();
  });
});
