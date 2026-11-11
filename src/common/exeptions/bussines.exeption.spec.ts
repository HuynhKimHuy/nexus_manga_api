import { BusinessException } from './bussines.exeption.js';
import { ErrorCode } from '../filter/errors/error-code.js';

describe('BusinessException', () => {
  it('preserves code, HTTP status, public message, resource and original cause', () => {
    const cause = new Error('private database details');
    const exception = new BusinessException(
      ErrorCode.MANGA_SLUG_ALREADY_EXISTS,
      {
        resourceId: 'manga-123',
        cause,
      },
    );

    expect(exception.code).toBe('MANGA_SLUG_ALREADY_EXISTS');
    expect(exception.getStatus()).toBe(409);
    expect(exception.message).toBe('Manga slug already exists');
    expect(exception.getResponse()).toBe('Manga slug already exists');
    expect(exception.resourceId).toBe('manga-123');
    expect(exception.cause).toBe(cause);
  });

  it('supports omitted options', () => {
    const exception = new BusinessException(ErrorCode.MANGA_NOT_FOUND);
    expect(exception.getStatus()).toBe(404);
    expect(exception.message).toBe('Manga not found');
    expect(exception.cause).toBeUndefined();
    expect(exception.resourceId).toBeUndefined();
  });

  it('preserves structured validation details', () => {
    const details = [{ field: 'title', message: 'Required' }];
    const exception = new BusinessException(ErrorCode.VALIDATION_FAILED, {
      details,
    });
    expect(exception.getStatus()).toBe(400);
    expect(exception.details).toEqual(details);
  });
});
