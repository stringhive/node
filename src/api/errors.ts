export class StringhiveError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = 'StringhiveError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AuthenticationException extends StringhiveError {
  constructor(body: unknown) {
    super('Authentication failed. Check your STRINGHIVE_TOKEN.', 401, body);
    this.name = 'AuthenticationException';
  }
}

export class ForbiddenException extends StringhiveError {
  constructor(body: unknown) {
    super('Access forbidden. Your token does not have permission for this resource.', 403, body);
    this.name = 'ForbiddenException';
  }
}

export class HiveNotFoundException extends StringhiveError {
  constructor(slug: string, body: unknown) {
    super(`Hive '${slug}' not found.`, 404, body);
    this.name = 'HiveNotFoundException';
  }
}

export class StringLimitException extends StringhiveError {
  constructor(body: unknown) {
    super('String limit reached. Upgrade your plan to import more strings.', 422, body);
    this.name = 'StringLimitException';
  }
}

export class ValidationException extends StringhiveError {
  constructor(
    public readonly errors: Record<string, string[]>,
    body: unknown,
  ) {
    const firstError = Object.values(errors)[0]?.[0] ?? 'Validation failed.';
    super(firstError, 422, body);
    this.name = 'ValidationException';
  }
}

export class NetworkException extends StringhiveError {
  constructor(cause: unknown) {
    const message = cause instanceof Error ? cause.message : 'Network request failed.';
    super(message, 0, null);
    this.name = 'NetworkException';
    if (cause instanceof Error) this.cause = cause;
  }
}
