import '@angular/compiler';
import { HttpParams } from '@angular/common/http';

export function buildParams(filters) {
  const params = new HttpParams();
  params.set('page', filters.page);
  if (filters.status !== 'ALL') params.set('status', filters.status);
  const query = filters.q.trim();
  if (query) params.set('q', query);
  return params;
}
