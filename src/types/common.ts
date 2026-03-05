// 공통 타입 정의

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export type SortDirection = "asc" | "desc";

export interface PageRequest {
  page?: number;
  size?: number;
  sort?: string;
  direction?: SortDirection;
}
