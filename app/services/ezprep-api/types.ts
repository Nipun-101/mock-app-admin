export interface EzPrepApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  searchParams?: Record<
    string,
    string | number | boolean | null | undefined
  >;
}

export class EzPrepApiError extends Error {
  readonly status: number;
  readonly path: string;
  readonly data: unknown;

  constructor(message: string, status: number, path: string, data: unknown) {
    super(message);
    this.name = "EzPrepApiError";
    this.status = status;
    this.path = path;
    this.data = data;
  }
}
