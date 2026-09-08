export class ApiConflictError extends Error {
  readonly resource: string;
  readonly id: string;

  constructor(resource: string, id: string) {
    super(`${resource}:${id}`);
    this.name = 'ApiConflictError';
    this.resource = resource;
    this.id = id;
  }
}
