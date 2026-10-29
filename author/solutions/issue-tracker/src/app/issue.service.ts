import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Issue, Page, IssueDraft, IssuePatch } from './models';

@Injectable({ providedIn: 'root' })
export class IssueService {
  private readonly http = inject(HttpClient);
  list(params: Record<string, string>) { return this.http.get<Page<Issue>>('/api/issues', { params }); }
  get(id: string) { return this.http.get<Issue>(`/api/issues/${encodeURIComponent(id)}`); }
  create(draft: IssueDraft, scenario = '') { return this.http.post<Issue>('/api/issues', draft, { params: scenario ? { scenario } : {} }); }
  update(id: string, patch: IssuePatch, scenario = '') { return this.http.patch<Issue>(`/api/issues/${encodeURIComponent(id)}`, patch, { params: scenario ? { scenario } : {} }); }
}
