import { ezPrepApiClient } from "./browser-client";
import { ApiItemResponse } from "./envelope";

export interface AdminDashboardSummary {
  activeLearners: number;
  activeQuestions: number;
  failedQuestions: number;
  mockTests: number;
  fullMockTests: number;
  attempts: number;
  exams: number;
  subjects: number;
  topics: number;
  tags: number;
}

export interface NamedCount {
  id?: string;
  name: string;
  count: number;
}

export interface AdminDashboardUsers {
  totalLearners: number;
  activeLearners: number;
  inactiveLearners: number;
  newLast7Days: number;
  newLast30Days: number;
  byPlan: Array<{ plan: string; count: number }>;
}

export interface AdminDashboardQuestions {
  totalActive: number;
  byDifficulty: Array<{ difficulty: string; count: number }>;
  bySubjectAndTopic: Array<{
    subjectId: string;
    subjectName: string;
    topicId?: string;
    topicName: string;
    count: number;
  }>;
}

export interface AdminDashboardFailedQuestions {
  total: number;
  byStage: NamedCount[];
  bySubject: NamedCount[];
}

export interface AdminDashboardMockTests {
  total: number;
  byExam: NamedCount[];
}

export interface AdminDashboardFullMockTests {
  totalPublished: number;
  byExam: NamedCount[];
  draftsByStatus: NamedCount[];
}

export interface AdminDashboardAttempts {
  total: number;
  submitted: number;
  expired: number;
  inProgress: number;
  uniqueUsers: number;
  timeConsumedSeconds: number;
  timeConsumedLabel: string;
  byExam: Array<{
    examId?: string;
    examName: string;
    attempts: number;
    uniqueUsers: number;
    submitted: number;
    expired: number;
    inProgress: number;
    timeConsumedSeconds: number;
    timeConsumedLabel: string;
    allottedMinutes: number;
  }>;
}

export interface AdminDashboardExams {
  totalActive: number;
  totalInactive: number;
  byCategory: NamedCount[];
}

export interface AdminDashboardSubjects {
  totalActive: number;
  rows: Array<{
    id: string;
    name: string;
    topicCount: number;
    isActive: boolean;
  }>;
}

export interface AdminDashboardTopics {
  totalActive: number;
  rows: Array<{
    id: string;
    name: string;
    subjectId: string;
    subjectName: string;
  }>;
}

export interface AdminDashboardTags {
  totalActive: number;
  rows: Array<{
    id: string;
    name: string;
    subjectId: string;
    subjectName: string;
    topicName?: string;
  }>;
}

const PREFIX = "/v1/admin/dashboard";

export const adminDashboardApi = {
  getSummary() {
    return ezPrepApiClient.get<ApiItemResponse<AdminDashboardSummary>>(PREFIX);
  },
  getUsers() {
    return ezPrepApiClient.get<ApiItemResponse<AdminDashboardUsers>>(
      `${PREFIX}/users`
    );
  },
  getQuestions() {
    return ezPrepApiClient.get<ApiItemResponse<AdminDashboardQuestions>>(
      `${PREFIX}/questions`
    );
  },
  getFailedQuestions() {
    return ezPrepApiClient.get<ApiItemResponse<AdminDashboardFailedQuestions>>(
      `${PREFIX}/failed-questions`
    );
  },
  getMockTests() {
    return ezPrepApiClient.get<ApiItemResponse<AdminDashboardMockTests>>(
      `${PREFIX}/mock-tests`
    );
  },
  getFullMockTests() {
    return ezPrepApiClient.get<ApiItemResponse<AdminDashboardFullMockTests>>(
      `${PREFIX}/full-mock-tests`
    );
  },
  getAttempts() {
    return ezPrepApiClient.get<ApiItemResponse<AdminDashboardAttempts>>(
      `${PREFIX}/attempts`
    );
  },
  getExams() {
    return ezPrepApiClient.get<ApiItemResponse<AdminDashboardExams>>(
      `${PREFIX}/exams`
    );
  },
  getSubjects() {
    return ezPrepApiClient.get<ApiItemResponse<AdminDashboardSubjects>>(
      `${PREFIX}/subjects`
    );
  },
  getTopics() {
    return ezPrepApiClient.get<ApiItemResponse<AdminDashboardTopics>>(
      `${PREFIX}/topics`
    );
  },
  getTags() {
    return ezPrepApiClient.get<ApiItemResponse<AdminDashboardTags>>(
      `${PREFIX}/tags`
    );
  },
};
