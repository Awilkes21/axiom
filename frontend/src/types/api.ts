export type ApiError = {
  message: string;
  status: number;
  code?: "UNAUTHORIZED" | "NETWORK_ERROR" | "REQUEST_FAILED";
};

export type ApiResponse<T> = {
  data: T | null;
  error: ApiError | null;
};
