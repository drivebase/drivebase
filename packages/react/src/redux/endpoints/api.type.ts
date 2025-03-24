export type ApiResponse<T> = {
  data: T;
  error: string | null;
  status: number;
};
