export class ApiNotFoundError extends Error {
  readonly resource: string;
  readonly id: string;

  constructor(resource: string, id: string) {
    super(`${resource}:${id}`);
    this.name = 'ApiNotFoundError';
    this.resource = resource;
    this.id = id;
  }
}
