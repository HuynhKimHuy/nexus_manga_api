import { ErrorCode } from './error-code.js';
import { ErrorCatalog } from './error.catalog.js';

describe('ErrorCatalog', () => {
  it.each([
    ['BAD_REQUEST', 400, 'Bad request'],
    ['VALIDATION_FAILED', 400, 'Validation failed'],
    ['UNAUTHORIZED', 401, 'Unauthorized'],
    ['FORBIDDEN', 403, 'Forbidden'],
    ['NOT_FOUND', 404, 'Not found'],
    ['METHOD_NOT_ALLOWED', 405, 'Method not allowed'],
    ['CONFLICT', 409, 'Conflict'],
    ['PAYLOAD_TOO_LARGE', 413, 'Payload too large'],
    ['UNSUPPORTED_MEDIA_TYPE', 415, 'Unsupported media type'],
    ['TOO_MANY_REQUESTS', 429, 'Too many requests'],
    ['HTTP_ERROR', 500, 'HTTP error'],
    ['MANGA_NOT_FOUND', 404, 'Manga not found'],
    ['MANGA_SLUG_ALREADY_EXISTS', 409, 'Manga slug already exists'],
    ['INTERNAL_ERROR', 500, 'Internal server error'],
    ['SERVICE_UNAVAILABLE', 503, 'Service unavailable'],
  ] as const)(
    'maps %s to status %i and its public message',
    (code, status, message) => {
      expect(ErrorCatalog[code]).toEqual({ status, message });
    },
  );

  it('defines every error code without extra entries', () => {
    expect(Object.keys(ErrorCatalog).sort()).toEqual(
      Object.values(ErrorCode).sort(),
    );
  });
});
