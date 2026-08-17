import { beforeEach, describe, expect, it, vi } from "vitest";
import { ezPrepApiClient } from "./browser-client";
import { catalogApi, refId, refName } from "./catalog";

vi.mock("./browser-client", () => ({
  ezPrepApiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const get = vi.mocked(ezPrepApiClient.get);
const post = vi.mocked(ezPrepApiClient.post);
const patch = vi.mocked(ezPrepApiClient.patch);
const del = vi.mocked(ezPrepApiClient.delete);

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  patch.mockReset();
  del.mockReset();
  get.mockResolvedValue({ message: "ok", data: [] });
  post.mockResolvedValue({ message: "ok", data: {} });
  patch.mockResolvedValue({ message: "ok", data: {} });
  del.mockResolvedValue({ message: "ok", data: {} });
});

describe("refId", () => {
  it("reads string ids and populated objects", () => {
    expect(refId("abc")).toBe("abc");
    expect(refId({ id: "id-1" })).toBe("id-1");
    expect(refId({ _id: "oid-1" })).toBe("oid-1");
    expect(refId({ id: "id-1", _id: "oid-1" })).toBe("id-1");
  });

  it("rejects empty or unknown values", () => {
    expect(refId(null)).toBeUndefined();
    expect(refId(undefined)).toBeUndefined();
    expect(refId("")).toBeUndefined();
    expect(refId(1)).toBeUndefined();
    expect(refId({ id: "" })).toBeUndefined();
    expect(refId({ id: 1 })).toBeUndefined();
    expect(refId({})).toBeUndefined();
  });
});

describe("refName", () => {
  it("reads a string name from an object", () => {
    expect(refName({ name: "Math" })).toBe("Math");
    expect(refName({ name: 1 })).toBeUndefined();
    expect(refName("Math")).toBeUndefined();
    expect(refName(null)).toBeUndefined();
  });
});

describe("catalogApi categories", () => {
  it("lists, lists active, gets, creates, updates, and deletes", async () => {
    await catalogApi.listCategories({ page: 1, search: "upsc" });
    await catalogApi.listActiveCategories();
    await catalogApi.getCategory("c1");
    await catalogApi.createCategory({
      name: "Govt",
      shortName: "GOV",
      description: "",
    });
    await catalogApi.updateCategory("c1", { name: "Govt", description: undefined });
    await catalogApi.deleteCategory("c1");

    expect(get).toHaveBeenCalledWith("/v1/categories", {
      searchParams: { page: 1, search: "upsc" },
    });
    expect(get).toHaveBeenCalledWith("/v1/categories/active");
    expect(get).toHaveBeenCalledWith("/v1/categories/c1");
    expect(post).toHaveBeenCalledWith("/v1/categories", {
      name: "Govt",
      shortName: "GOV",
    });
    expect(patch).toHaveBeenCalledWith("/v1/categories/c1", { name: "Govt" });
    expect(del).toHaveBeenCalledWith("/v1/categories/c1");
  });
});

describe("catalogApi exam groups", () => {
  it("covers list through delete", async () => {
    await catalogApi.listExamGroups({ categoryId: "c1" });
    await catalogApi.listActiveExamGroups();
    await catalogApi.getExamGroup("g1");
    await catalogApi.createExamGroup({
      name: "SSC",
      category: "c1",
      shortName: "",
    });
    await catalogApi.updateExamGroup("g1", { name: "SSC", isActive: true });
    await catalogApi.deleteExamGroup("g1");

    expect(get).toHaveBeenCalledWith("/v1/exam-groups", {
      searchParams: { categoryId: "c1" },
    });
    expect(get).toHaveBeenCalledWith("/v1/exam-groups/active");
    expect(get).toHaveBeenCalledWith("/v1/exam-groups/g1");
    expect(post).toHaveBeenCalledWith("/v1/exam-groups", {
      name: "SSC",
      category: "c1",
    });
    expect(patch).toHaveBeenCalledWith("/v1/exam-groups/g1", {
      name: "SSC",
      isActive: true,
    });
    expect(del).toHaveBeenCalledWith("/v1/exam-groups/g1");
  });
});

describe("catalogApi exams", () => {
  it("covers CRUD and listAllExams pagination", async () => {
    get
      .mockResolvedValueOnce({
        message: "ok",
        data: [{ id: "listed" }],
      })
      .mockResolvedValueOnce({
        message: "ok",
        data: [{ id: "e1" }],
        pagination: { totalPages: 2, total: 2, page: 1, limit: 100 },
      })
      .mockResolvedValueOnce({
        message: "ok",
        data: [{ id: "e2" }],
        pagination: { totalPages: 2, total: 2, page: 2, limit: 100 },
      })
      .mockResolvedValue({ message: "ok", data: {} });

    await catalogApi.listExams({ search: "upsc" });
    const all = await catalogApi.listAllExams();
    await catalogApi.getExam("e1");
    await catalogApi.createExam({
      name: "UPSC",
      category: "c1",
      examGroup: "g1",
      description: "",
    });
    await catalogApi.updateExam("e1", { name: "UPSC", duration: undefined });
    await catalogApi.deleteExam("e1");

    expect(all).toEqual([{ id: "e1" }, { id: "e2" }]);
    expect(get).toHaveBeenCalledWith("/v1/exams", {
      searchParams: { search: "upsc" },
    });
    expect(get).toHaveBeenCalledWith("/v1/exams/e1");
    expect(post).toHaveBeenCalledWith("/v1/exams", {
      name: "UPSC",
      category: "c1",
      examGroup: "g1",
    });
    expect(patch).toHaveBeenCalledWith("/v1/exams/e1", { name: "UPSC" });
    expect(del).toHaveBeenCalledWith("/v1/exams/e1");
  });
});

describe("catalogApi subjects, topics, and tags", () => {
  it("covers subject CRUD", async () => {
    await catalogApi.listSubjects();
    await catalogApi.getSubject("s1");
    await catalogApi.createSubject({ name: "Math", description: "" });
    await catalogApi.updateSubject("s1", { name: "Math", topics: undefined });
    await catalogApi.deleteSubject("s1");

    expect(get).toHaveBeenCalledWith("/v1/subjects");
    expect(get).toHaveBeenCalledWith("/v1/subjects/s1");
    expect(post).toHaveBeenCalledWith("/v1/subjects", { name: "Math" });
    expect(patch).toHaveBeenCalledWith("/v1/subjects/s1", { name: "Math" });
    expect(del).toHaveBeenCalledWith("/v1/subjects/s1");
  });

  it("covers topic CRUD", async () => {
    await catalogApi.listTopics();
    await catalogApi.getTopic("t1");
    await catalogApi.createTopic({ name: "Algebra", description: "" });
    await catalogApi.updateTopic("t1", { name: "Algebra", isActive: false });
    await catalogApi.deleteTopic("t1");

    expect(get).toHaveBeenCalledWith("/v1/topics");
    expect(post).toHaveBeenCalledWith("/v1/topics", { name: "Algebra" });
    expect(patch).toHaveBeenCalledWith("/v1/topics/t1", {
      name: "Algebra",
      isActive: false,
    });
    expect(del).toHaveBeenCalledWith("/v1/topics/t1");
  });

  it("covers tag CRUD and listAllTags", async () => {
    get.mockResolvedValue({
      message: "ok",
      data: [{ id: "tag-1" }],
      pagination: { totalPages: 1, total: 1, page: 1, limit: 100 },
    });

    await catalogApi.listTags({ subjectId: "s1" });
    const all = await catalogApi.listAllTags({ topicId: "t1" });
    await catalogApi.getTag("tag-1");
    await catalogApi.createTag({
      name: "PYQ",
      subject: "s1",
      topic: "t1",
      description: "",
    });
    await catalogApi.updateTag("tag-1", { name: "PYQ", topic: undefined });
    await catalogApi.deleteTag("tag-1");

    expect(all).toEqual([{ id: "tag-1" }]);
    expect(get).toHaveBeenCalledWith("/v1/tags", {
      searchParams: { subjectId: "s1" },
    });
    expect(post).toHaveBeenCalledWith("/v1/tags", {
      name: "PYQ",
      subject: "s1",
      topic: "t1",
    });
    expect(patch).toHaveBeenCalledWith("/v1/tags/tag-1", { name: "PYQ" });
    expect(del).toHaveBeenCalledWith("/v1/tags/tag-1");
  });
});
