import { beforeEach, describe, expect, it, vi } from "vitest";
import { catalogApi } from "@/app/services/ezprep-api";
import { loadTopicNamesForQuestions } from "./topic-names";

vi.mock("@/app/services/ezprep-api", () => ({
  catalogApi: {
    getSubject: vi.fn(),
    getTopic: vi.fn(),
  },
}));

const getSubject = vi.mocked(catalogApi.getSubject);
const getTopic = vi.mocked(catalogApi.getTopic);

describe("loadTopicNamesForQuestions", () => {
  beforeEach(() => {
    getSubject.mockReset();
    getTopic.mockReset();
  });

  it("resolves a replacement question topic from its own subject", async () => {
    getSubject.mockImplementation(async (id: string) => {
      if (id === "sub-ga") {
        return {
          message: "ok",
          data: {
            id,
            name: "General Awareness",
            topics: [{ id: "top-history", name: "History" }],
          },
        };
      }
      return {
        message: "ok",
        data: {
          id,
          name: "General Science",
          topics: [{ id: "top-chem", name: "Chemistry" }],
        },
      };
    });

    const names = await loadTopicNamesForQuestions([
      {
        subjectId: "sub-ga",
        questions: [
          { topic: "top-history", subject: "sub-ga" },
          { topic: "top-chem", subject: "sub-gs" },
        ],
      },
    ]);

    expect(names.get("top-history")).toBe("History");
    expect(names.get("top-chem")).toBe("Chemistry");
    expect(getTopic).not.toHaveBeenCalled();
  });

  it("fetches a topic that is not linked on any loaded subject", async () => {
    getSubject.mockResolvedValue({
      message: "ok",
      data: {
        id: "sub-ga",
        name: "General Awareness",
        topics: [{ id: "top-history", name: "History" }],
      },
    });
    getTopic.mockResolvedValue({
      message: "ok",
      data: { id: "top-orphan", name: "Biology" },
    });

    const names = await loadTopicNamesForQuestions([
      {
        subjectId: "sub-ga",
        questions: [{ topic: "top-orphan", subject: "sub-ga" }],
      },
    ]);

    expect(names.get("top-orphan")).toBe("Biology");
    expect(getTopic).toHaveBeenCalledWith("top-orphan");
  });
});
