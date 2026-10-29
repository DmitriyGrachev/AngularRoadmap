import '@angular/compiler';
import { HttpParams } from '@angular/common/http';

export function buildParams(filters) {
  let params = new HttpParams().set('page', filters.page);
  if (filters.status !== 'ALL') params = params.set('status', filters.status);
  const query = filters.q.trim();
  if (query) params = params.set('q', query);
  return params;
}
