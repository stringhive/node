import { describe, it, expect } from 'vitest';
import {
  StringhiveError,
  AuthenticationException,
  ForbiddenException,
  HiveNotFoundException,
  StringLimitException,
  ValidationException,
  NetworkException,
} from '../errors.js';

describe('error classes', () => {
  it('StringhiveError carries statusCode and body', () => {
    const err = new StringhiveError('oops', 500, { detail: 'x' });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(StringhiveError);
    expect(err.statusCode).toBe(500);
    expect(err.body).toEqual({ detail: 'x' });
  });

  it('AuthenticationException is a StringhiveError with 401', () => {
    const err = new AuthenticationException(null);
    expect(err).toBeInstanceOf(StringhiveError);
    expect(err.statusCode).toBe(401);
    expect(err.message).toContain('STRINGHIVE_TOKEN');
  });

  it('ForbiddenException is a StringhiveError with 403', () => {
    const err = new ForbiddenException(null);
    expect(err).toBeInstanceOf(StringhiveError);
    expect(err.statusCode).toBe(403);
  });

  it('HiveNotFoundException includes the slug', () => {
    const err = new HiveNotFoundException('my-app', null);
    expect(err).toBeInstanceOf(StringhiveError);
    expect(err.statusCode).toBe(404);
    expect(err.message).toContain('my-app');
  });

  it('StringLimitException is a StringhiveError with 422', () => {
    const err = new StringLimitException(null);
    expect(err).toBeInstanceOf(StringhiveError);
    expect(err.statusCode).toBe(422);
  });

  it('ValidationException carries errors map and uses first error as message', () => {
    const errors = { key: ['The key field is required.'] };
    const err = new ValidationException(errors, null);
    expect(err).toBeInstanceOf(StringhiveError);
    expect(err.statusCode).toBe(422);
    expect(err.errors).toEqual(errors);
    expect(err.message).toBe('The key field is required.');
  });

  it('NetworkException wraps underlying error', () => {
    const cause = new TypeError('fetch failed');
    const err = new NetworkException(cause);
    expect(err).toBeInstanceOf(StringhiveError);
    expect(err.statusCode).toBe(0);
    expect(err.message).toBe('fetch failed');
    expect(err.cause).toBe(cause);
  });

  it('subclasses pass instanceof checks through inheritance chain', () => {
    const err = new AuthenticationException(null);
    expect(err instanceof AuthenticationException).toBe(true);
    expect(err instanceof StringhiveError).toBe(true);
    expect(err instanceof Error).toBe(true);
  });
});
