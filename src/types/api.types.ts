export interface DataResponse<T> { data: T }
export interface ErrorResponse { error: { message: string; stack?: string } }
