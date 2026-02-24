export type ApiError = {
  message: string;
  status: number;
};

export type ApiResponse<T> = {
  data: T;
  error: ApiError | null;
};
