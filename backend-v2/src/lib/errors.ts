/** Typed API errors → { error: code, message } with the right HTTP status. */
export class ApiError extends Error {
  constructor(public status: number, public code: string, message?: string, public details?: unknown) {
    super(message ?? code);
  }
}
export const unauthorized = (code = 'unauthorized') => new ApiError(401, code, 'Sign in again.');
export const forbidden = (code = 'forbidden') => new ApiError(403, code, 'You do not have access to this.');
export const notFound = (code = 'not_found') => new ApiError(404, code, 'Not found.');
export const invalid = (code: string, message?: string) => new ApiError(422, code, message);
export const tooMany = (code: string, message?: string) => new ApiError(429, code, message);
export const conflict = (code: string, message?: string, details?: unknown) => new ApiError(409, code, message, details);
export const badRequest = (code: string, message?: string) => new ApiError(400, code, message);
