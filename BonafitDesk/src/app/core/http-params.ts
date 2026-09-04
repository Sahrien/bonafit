import { HttpParams } from '@angular/common/http';

export function toHttpParams(
  query: Record<string, string | undefined>,
): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') {
      params = params.set(key, value);
    }
  }
  return params;
}
