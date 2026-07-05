export type BulkUploadStatus =
  | "uploaded"
  | "parsing"
  | "parsed"
  | "processing"
  | "enriched"
  | "completed"
  | "failed";

export interface BulkUpload {
  id: string;
  title: string;
  filename: string;
  fileSize: number;
  status: BulkUploadStatus;
  subjectId: string;
  topicId?: string;
  examIds: string[];
  s3Key: string;
  markdownS3Key?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BulkUploadPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BulkUploadListData {
  uploads: BulkUpload[];
  pagination: BulkUploadPagination;
}

export interface BulkUploadListResponse {
  message: string;
  data: BulkUploadListData;
}

export interface BulkUploadPdfData {
  uploadId: string;
  title: string;
  filename: string;
  s3Key: string;
  s3Bucket: string;
  fileSize: number;
  status: BulkUploadStatus;
  uploadedAt: string;
}

export interface BulkUploadPdfResponse {
  message: string;
  data: BulkUploadPdfData;
}

export interface ParsePdfData {
  uploadId: string;
  mathpixPdfId?: string;
  markdownS3Key?: string;
  processingTimeMs?: number;
  status: BulkUploadStatus;
  markdownLength?: number;
}

export interface ParsePdfResponse {
  message: string;
  data: ParsePdfData;
}

/** Immediate 202 response when PDF parsing is queued asynchronously */
export interface ParsePdfAcceptedData {
  uploadId: string;
  status: BulkUploadStatus;
}

export interface ParsePdfAcceptedResponse {
  message: string;
  data: ParsePdfAcceptedData;
}

export const PARSE_PDF_CONFIG = {
  maxPollingAttempts: 60,
  pollingIntervalMs: 5000,
} as const;

/** Client-side poll interval while any upload is `parsing` or `processing` */
export const BULK_UPLOAD_POLLING_INTERVAL_MS = 30_000;

export interface EnrichStats {
  total: number;
  success: number;
  failed: number;
  durationMs: number;
}

export interface EnrichRejectedItem {
  number: number;
  stage: string;
  message: string;
  matchedQuestion?: {
    number: number;
    question: string;
    solution: string;
  };
  questionDraft?: Record<string, unknown>;
}

export interface EnrichChunkInfo {
  chunkIndex: number;
  questionCount: number;
  estimatedTokens: number;
  questionNumbers: number[];
}

export interface EnrichData {
  uploadId: string;
  status: BulkUploadStatus;
  questions?: unknown[];
  rejected?: EnrichRejectedItem[];
  stats?: EnrichStats;
  summary?: string;
  chunking?: {
    adaptiveChunking: boolean;
    chunkCount: number;
    totalTokens: number;
    chunks: EnrichChunkInfo[];
  };
  parse?: {
    fromCache: boolean;
    parserName: string;
    matchedCount: number;
  };
}

export interface EnrichResponse {
  message: string;
  data: EnrichData;
}

/** Immediate 202 response when enrichment is queued asynchronously */
export interface EnrichAcceptedData {
  uploadId: string;
  status: BulkUploadStatus;
}

export interface EnrichAcceptedResponse {
  message: string;
  data: EnrichAcceptedData;
}

export const ENRICH_CONFIG = {
  adaptiveChunking: true,
  maxRetries: 3,
} as const;

export interface ImportQuestionsStats {
  total: number;
  saved: number;
  failed: number;
}

export interface ImportQuestionsSavedItem {
  index: number;
  questionId: string;
}

export interface ImportQuestionsData {
  uploadId: string;
  uploadStatus: BulkUploadStatus;
  summary: string;
  saved: ImportQuestionsSavedItem[];
  errors: unknown[];
  stats: ImportQuestionsStats;
}

export interface ImportQuestionsResponse {
  message: string;
  data: ImportQuestionsData;
}

export type BulkUploadProcessingAction = "import";

export interface LookupItem {
  _id: string;
  name: string;
  topics?: LookupItem[];
}
