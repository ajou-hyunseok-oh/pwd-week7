import type { ErrorRequestHandler } from 'express';
import type { ErrorResponse } from '../types/api.types';
import HttpError from '../utils/httpError';

const errorHandler: ErrorRequestHandler<Record<string, string>, ErrorResponse> = (err: unknown, req, res, next) => {
  const error = err instanceof Error ? err : new Error('Internal Server Error');
  const httpStatus = 'status' in error && typeof error.status === 'number' ? error.status : 500;
  const status = error instanceof HttpError ? error.statusCode : (httpStatus >= 400 && httpStatus < 500 ? httpStatus : 500);
  const payload: ErrorResponse = { error: {
    message: status === 500 && process.env.NODE_ENV === 'production' ? 'Internal Server Error' : error.message,
  } };
  if (process.env.NODE_ENV !== 'production' && error.stack) payload.error.stack = error.stack;
  res.status(status).json(payload);
};

export default errorHandler;
