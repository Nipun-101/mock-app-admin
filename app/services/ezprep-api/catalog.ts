import { ezPrepApiClient } from "./browser-client";
import {
  ApiItemResponse,
  ApiListResponse,
  fetchAllPages,
  omitEmpty,
  omitUndefined,
} from "./envelope";

export interface NamedRef {
  id: string;
  name: string;
  shortName?: string;
}

export interface Category {
  id: string;
  name: string;
  shortName: string;
  imageUrl?: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExamGroup {
  id: string;
  name: string;
  shortName?: string;
  category: string | Category;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExamSubjectConfig {
  subject: string;
  numberOfQuestions: number;
  marksPerQuestion: number;
  hasNegativeMarking: boolean;
  negativeMarksPerQuestion: number;
  sessionTime?: number;
}

export interface Exam {
  id: string;
  name: string;
  description?: string;
  category: string | Category;
  examGroup: string | ExamGroup;
  duration?: number;
  totalQuestions?: number;
  totalMarks?: number;
  subjects?: ExamSubjectConfig[];
  isSessionWise: boolean;
  hasMultiLingualSupport: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Topic {
  id: string;
  name: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Subject {
  id: string;
  name: string;
  description?: string;
  topics: NamedRef[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Tag {
  id: string;
  name: string;
  description?: string;
  subject: string | NamedRef;
  topic: string | NamedRef;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function refId(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const row = value as { id?: unknown; _id?: unknown };
    if (typeof row.id === "string" && row.id) return row.id;
    if (typeof row._id === "string" && row._id) return row._id;
  }
  return undefined;
}

export function refName(value: unknown): string | undefined {
  if (value && typeof value === "object" && "name" in value) {
    const name = (value as { name?: unknown }).name;
    return typeof name === "string" ? name : undefined;
  }
  return undefined;
}

export const catalogApi = {
  listCategories(searchParams?: {
    page?: number;
    limit?: number;
    search?: string;
    activeOnly?: boolean;
  }) {
    return ezPrepApiClient.get<ApiListResponse<Category>>("/v1/categories", {
      searchParams,
    });
  },

  listActiveCategories() {
    return ezPrepApiClient.get<ApiListResponse<Category>>(
      "/v1/categories/active"
    );
  },

  getCategory(id: string) {
    return ezPrepApiClient.get<ApiItemResponse<Category>>(
      `/v1/categories/${id}`
    );
  },

  createCategory(body: {
    name: string;
    shortName: string;
    imageUrl?: string;
    description?: string;
  }) {
    return ezPrepApiClient.post<ApiItemResponse<Category>>(
      "/v1/categories",
      omitEmpty(body)
    );
  },

  updateCategory(
    id: string,
    body: {
      name?: string;
      shortName?: string;
      imageUrl?: string;
      description?: string;
      isActive?: boolean;
    }
  ) {
    return ezPrepApiClient.patch<ApiItemResponse<Category>>(
      `/v1/categories/${id}`,
      omitUndefined(body)
    );
  },

  deleteCategory(id: string) {
    return ezPrepApiClient.delete<ApiItemResponse<Category>>(
      `/v1/categories/${id}`
    );
  },

  listExamGroups(searchParams?: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    activeOnly?: boolean;
  }) {
    return ezPrepApiClient.get<ApiListResponse<ExamGroup>>("/v1/exam-groups", {
      searchParams,
    });
  },

  listActiveExamGroups() {
    return ezPrepApiClient.get<ApiListResponse<ExamGroup>>(
      "/v1/exam-groups/active"
    );
  },

  getExamGroup(id: string) {
    return ezPrepApiClient.get<ApiItemResponse<ExamGroup>>(
      `/v1/exam-groups/${id}`
    );
  },

  createExamGroup(body: {
    name: string;
    shortName?: string;
    category: string;
    description?: string;
  }) {
    return ezPrepApiClient.post<ApiItemResponse<ExamGroup>>(
      "/v1/exam-groups",
      omitEmpty(body)
    );
  },

  updateExamGroup(
    id: string,
    body: {
      name?: string;
      shortName?: string;
      category?: string;
      description?: string;
      isActive?: boolean;
    }
  ) {
    return ezPrepApiClient.patch<ApiItemResponse<ExamGroup>>(
      `/v1/exam-groups/${id}`,
      omitUndefined(body)
    );
  },

  deleteExamGroup(id: string) {
    return ezPrepApiClient.delete<ApiItemResponse<ExamGroup>>(
      `/v1/exam-groups/${id}`
    );
  },

  listExams(searchParams?: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    activeOnly?: boolean;
  }) {
    return ezPrepApiClient.get<ApiListResponse<Exam>>("/v1/exams", {
      searchParams,
    });
  },

  async listAllExams() {
    return fetchAllPages((page, limit) =>
      this.listExams({ page, limit })
    );
  },

  getExam(id: string) {
    return ezPrepApiClient.get<ApiItemResponse<Exam>>(`/v1/exams/${id}`);
  },

  createExam(body: {
    name: string;
    description?: string;
    category: string;
    examGroup: string;
    duration?: number;
    subjects?: ExamSubjectConfig[];
    isSessionWise?: boolean;
    hasMultiLingualSupport?: boolean;
  }) {
    return ezPrepApiClient.post<ApiItemResponse<Exam>>(
      "/v1/exams",
      omitEmpty(body as Record<string, unknown>)
    );
  },

  updateExam(
    id: string,
    body: {
      name?: string;
      description?: string;
      category?: string;
      examGroup?: string;
      duration?: number;
      subjects?: ExamSubjectConfig[];
      isSessionWise?: boolean;
      hasMultiLingualSupport?: boolean;
      isActive?: boolean;
    }
  ) {
    return ezPrepApiClient.patch<ApiItemResponse<Exam>>(
      `/v1/exams/${id}`,
      omitUndefined(body as Record<string, unknown>)
    );
  },

  deleteExam(id: string) {
    return ezPrepApiClient.delete<ApiItemResponse<Exam>>(`/v1/exams/${id}`);
  },

  listSubjects() {
    return ezPrepApiClient.get<ApiListResponse<Subject>>("/v1/subjects");
  },

  getSubject(id: string) {
    return ezPrepApiClient.get<ApiItemResponse<Subject>>(`/v1/subjects/${id}`);
  },

  createSubject(body: {
    name: string;
    description?: string;
    topics?: string[];
  }) {
    return ezPrepApiClient.post<ApiItemResponse<Subject>>(
      "/v1/subjects",
      omitEmpty(body as Record<string, unknown>)
    );
  },

  updateSubject(
    id: string,
    body: {
      name?: string;
      description?: string;
      topics?: string[];
      isActive?: boolean;
    }
  ) {
    return ezPrepApiClient.patch<ApiItemResponse<Subject>>(
      `/v1/subjects/${id}`,
      omitUndefined(body as Record<string, unknown>)
    );
  },

  deleteSubject(id: string) {
    return ezPrepApiClient.delete<ApiItemResponse<Subject>>(
      `/v1/subjects/${id}`
    );
  },

  listTopics() {
    return ezPrepApiClient.get<ApiListResponse<Topic>>("/v1/topics");
  },

  getTopic(id: string) {
    return ezPrepApiClient.get<ApiItemResponse<Topic>>(`/v1/topics/${id}`);
  },

  createTopic(body: { name: string; description?: string }) {
    return ezPrepApiClient.post<ApiItemResponse<Topic>>(
      "/v1/topics",
      omitEmpty(body)
    );
  },

  updateTopic(
    id: string,
    body: { name?: string; description?: string; isActive?: boolean }
  ) {
    return ezPrepApiClient.patch<ApiItemResponse<Topic>>(
      `/v1/topics/${id}`,
      omitUndefined(body)
    );
  },

  deleteTopic(id: string) {
    return ezPrepApiClient.delete<ApiItemResponse<Topic>>(`/v1/topics/${id}`);
  },

  listTags(searchParams?: {
    page?: number;
    limit?: number;
    subjectId?: string;
    topicId?: string;
  }) {
    return ezPrepApiClient.get<ApiListResponse<Tag>>("/v1/tags", {
      searchParams,
    });
  },

  listAllTags(searchParams?: { subjectId?: string; topicId?: string }) {
    return fetchAllPages((page, limit) =>
      this.listTags({ ...searchParams, page, limit })
    );
  },

  getTag(id: string) {
    return ezPrepApiClient.get<ApiItemResponse<Tag>>(`/v1/tags/${id}`);
  },

  createTag(body: {
    name: string;
    description?: string;
    subject: string;
    topic: string;
  }) {
    return ezPrepApiClient.post<ApiItemResponse<Tag>>(
      "/v1/tags",
      omitEmpty(body)
    );
  },

  updateTag(
    id: string,
    body: {
      name?: string;
      description?: string;
      subject?: string;
      topic?: string;
      isActive?: boolean;
    }
  ) {
    return ezPrepApiClient.patch<ApiItemResponse<Tag>>(
      `/v1/tags/${id}`,
      omitUndefined(body)
    );
  },

  deleteTag(id: string) {
    return ezPrepApiClient.delete<ApiItemResponse<Tag>>(`/v1/tags/${id}`);
  },
};
